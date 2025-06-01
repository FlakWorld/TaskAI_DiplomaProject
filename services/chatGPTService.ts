// services/chatGPTService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TASK_CATEGORIES } from '../types';
import { aiConfigManager, AIConfigType } from '../services/aiConfig';

// Используем ваш тип Task
type Task = {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  status: "в прогрессе" | "выполнено";
  tags?: string[];
};

interface ChatGPTRequest {
  userMessage: string;
  userContext: {
    tasks: Task[];
    userName: string;
    currentDate: string;
  };
}

interface ChatGPTResponse {
  message: string;
  suggestedActions?: {
    type: 'create_task' | 'update_task_status' | 'add_reminder' | 'suggest_planning';
    data: any;
  }[];
  tokensUsed?: {
    input: number;
    output: number;
  };
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

class ChatGPTService {
  private config: AIConfigType;
  private requestCount: number = 0;

  constructor() {
    this.config = aiConfigManager.getConfig();
  }

  // Инициализация сервиса
  async initialize(): Promise<void> {
    await aiConfigManager.initialize();
    this.config = aiConfigManager.getConfig();
  }

  // Проверка готовности сервиса
  isReady(): boolean {
    return aiConfigManager.isApiKeyValid();
  }

  private async getUserData(): Promise<UserData | null> {
    try {
      const userData = await AsyncStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Ошибка получения данных пользователя:', error);
      return null;
    }
  }

  private buildSystemPrompt(userContext: ChatGPTRequest['userContext']): string {
    const { tasks, userName, currentDate } = userContext;
    
    const completedTasks = tasks.filter(task => task.status === "выполнено");
    const inProgressTasks = tasks.filter(task => task.status === "в прогрессе");
    
    // Группируем задачи по тегам
    const tasksByTags = tasks.reduce((acc, task) => {
      if (task.tags) {
        task.tags.forEach(tag => {
          if (!acc[tag]) acc[tag] = [];
          acc[tag].push(task);
        });
      }
      return acc;
    }, {} as Record<string, Task[]>);

    // Сегодняшние задачи (парсим формат DD.MM.YYYY)
    const today = new Date();
    const todayFormatted = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const todayTasks = tasks.filter(task => task.date === todayFormatted);

    // Анализируем паттерны времени
    const tasksByTimeSlot = tasks.reduce((acc, task) => {
      if (task.time) {
        const hour = parseInt(task.time.split(':')[0]);
        const timeSlot = hour < 12 ? 'утром' : hour < 18 ? 'днем' : 'вечером';
        if (!acc[timeSlot]) acc[timeSlot] = [];
        acc[timeSlot].push(task);
      }
      return acc;
    }, {} as Record<string, Task[]>);

    return `Ты умный AI помощник для управления задачами пользователя ${userName}.

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
- Имя: ${userName}
- Текущая дата: ${currentDate}
- Всего задач: ${tasks.length}
- Выполнено: ${completedTasks.length}
- В прогрессе: ${inProgressTasks.length}
- На сегодня (${todayFormatted}): ${todayTasks.length}

ТЕКУЩИЕ ЗАДАЧИ:
${tasks.slice(0, 10).map((task, index) => 
  `${index + 1}. "${task.title}" - ${task.status}
     Дата: ${task.date || 'не указана'}
     Время: ${task.time || 'не указано'}
     Теги: ${task.tags?.join(', ') || 'без тегов'}`
).join('\n')}${tasks.length > 10 ? `\n... и еще ${tasks.length - 10} задач` : ''}

СТАТИСТИКА ПО КАТЕГОРИЯМ:
${Object.entries(tasksByTags).map(([tag, taskList]) => 
  `${tag}: ${taskList.length} задач (${taskList.filter(t => t.status === 'выполнено').length} выполнено)`
).join('\n')}

АКТИВНОСТЬ ПО ВРЕМЕНИ:
${Object.entries(tasksByTimeSlot).map(([timeSlot, taskList]) => 
  `${timeSlot}: ${taskList.length} задач`
).join('\n')}

ДОСТУПНЫЕ КАТЕГОРИИ ЗАДАЧ:
${TASK_CATEGORIES.map(cat => `- ${cat.name} (иконка: ${cat.icon})`).join('\n')}

ТВОИ ВОЗМОЖНОСТИ:
1. Анализировать продуктивность и прогресс по задачам
2. Предлагать оптимизацию планирования дня
3. Помогать с созданием новых задач с подходящими тегами
4. Давать мотивационные советы и поддержку
5. Анализировать паттерны и привычки пользователя
6. Предлагать улучшения в организации времени
7. Помогать с расстановкой приоритетов

ПРАВИЛА:
- Всегда учитывай контекст существующих задач пользователя
- Используй данные о времени и датах для умного планирования
- При анализе учитывай статусы задач и теги
- Предлагай конкретные и реализуемые советы
- Мотивируй пользователя и отмечай его достижения
- При предложении новых задач указывай подходящие теги из доступных категорий
- Если предлагаешь создать задачу, добавь в конец "[СОЗДАТЬ_ЗАДАЧУ]"
- Отвечай на русском языке дружелюбно и поддерживающе
- Используй формат даты DD.MM.YYYY и времени HH:MM
- Учитывай что статусы задач могут быть только "в прогрессе" или "выполнено"
- Будь кратким но информативным - не более ${this.config.MAX_TOKENS} токенов`;
  }

  async getChatResponse(request: ChatGPTRequest): Promise<ChatGPTResponse> {
    // Проверяем готовность сервиса
    if (!this.isReady()) {
      throw new Error(this.config.FALLBACK_RESPONSES.INVALID_KEY);
    }

    // Увеличиваем счетчик запросов
    this.requestCount++;

    const systemPrompt = this.buildSystemPrompt(request.userContext);
    
    // Создаем контроллер для отмены запроса по таймауту
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.REQUEST_TIMEOUT);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.config.RETRY_ATTEMPTS) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: this.config.MODEL,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: request.userMessage
              }
            ],
            max_tokens: this.config.MAX_TOKENS,
            temperature: this.config.TEMPERATURE,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 401) {
            throw new Error(this.config.FALLBACK_RESPONSES.INVALID_KEY);
          } else if (response.status === 429) {
            throw new Error(this.config.FALLBACK_RESPONSES.API_LIMIT);
          } else {
            throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
          }
        }

        const data = await response.json();
        const aiMessage = data.choices[0].message.content;

        // Анализируем ответ на предмет предложенных действий
        const suggestedActions = this.parseActionSuggestions(aiMessage);

        // Логируем использование токенов
        const tokensUsed = {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        };

        // Сохраняем статистику использования
        await aiConfigManager.logUsage(tokensUsed.input, tokensUsed.output);

        return {
          message: aiMessage.replace('[СОЗДАТЬ_ЗАДАЧУ]', '').trim(),
          suggestedActions,
          tokensUsed,
        };

      } catch (error: any) {
        lastError = error;
        attempt++;

        // Если это ошибка сети и у нас есть еще попытки
        if (attempt < this.config.RETRY_ATTEMPTS && this.isNetworkError(error)) {
          console.log(`Попытка ${attempt}/${this.config.RETRY_ATTEMPTS} неудачна, повторяем...`);
          await this.delay(1000 * attempt); // Экспоненциальная задержка
          continue;
        }

        break;
      }
    }

    clearTimeout(timeoutId);

    // Если все попытки исчерпаны, возвращаем подходящее сообщение об ошибке
    if (this.isNetworkError(lastError)) {
      throw new Error(this.config.FALLBACK_RESPONSES.NETWORK_ERROR);
    } else {
      console.error('ChatGPT Service Error:', lastError);
      throw new Error(this.config.FALLBACK_RESPONSES.ERROR);
    }
  }

  private parseActionSuggestions(message: string): ChatGPTResponse['suggestedActions'] {
    const actions: ChatGPTResponse['suggestedActions'] = [];
    
    // Проверяем на предложение создать задачу
    if (message.includes('[СОЗДАТЬ_ЗАДАЧУ]')) {
      actions.push({
        type: 'create_task',
        data: { 
          suggested: true,
          fromAI: true 
        }
      });
    }
    
    // Можно добавить другие паттерны
    if (message.includes('отметить как выполненную') || message.includes('завершить задачу')) {
      actions.push({
        type: 'update_task_status',
        data: { status: 'выполнено' }
      });
    }

    return actions.length > 0 ? actions : undefined;
  }

  // Специализированные методы для анализа
  async analyzeProductivity(tasks: Task[]): Promise<string> {
    await this.initialize();
    const user = await this.getUserData();
    
    const completedTasks = tasks.filter(t => t.status === 'выполнено');
    const inProgressTasks = tasks.filter(t => t.status === 'в прогрессе');
    
    // Анализ по времени создания
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const todayCompleted = completedTasks.filter(t => t.date === todayStr).length;
    
    const request: ChatGPTRequest = {
      userMessage: `Проанализируй мою продуктивность. У меня ${tasks.length} задач всего, ${completedTasks.length} выполнено (${Math.round((completedTasks.length / Math.max(tasks.length, 1)) * 100)}%). Сегодня выполнил ${todayCompleted} задач. Дай детальный анализ моей эффективности и конкретные советы для улучшения.`,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU')
      }
    };

    const response = await this.getChatResponse(request);
    return response.message;
  }

  async suggestDailyPlan(tasks: Task[]): Promise<string> {
    await this.initialize();
    const user = await this.getUserData();
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const todayTasks = tasks.filter(task => task.date === todayStr && task.status === 'в прогрессе');
    
    const request: ChatGPTRequest = {
      userMessage: `Помоги спланировать мой день. На сегодня (${todayStr}) у меня запланировано ${todayTasks.length} задач. Предложи оптимальный порядок выполнения с учетом времени и категорий. Дай практические советы по тайм-менеджменту.`,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU')
      }
    };

    const response = await this.getChatResponse(request);
    return response.message;
  }

  async getTaskSuggestions(userInput: string, tasks: Task[]): Promise<string> {
    await this.initialize();
    const user = await this.getUserData();
    
    const request: ChatGPTRequest = {
      userMessage: `Пользователь хочет: "${userInput}". Предложи конкретные задачи с подходящими категориями из доступных тегов и оптимальным временем. Учитывай мои существующие задачи чтобы избежать дублирования. Укажи рекомендуемые теги и время выполнения.`,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU')
      }
    };

    const response = await this.getChatResponse(request);
    return response.message;
  }

  async getMotivationalMessage(tasks: Task[]): Promise<string> {
    await this.initialize();
    const user = await this.getUserData();
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const completedToday = tasks.filter(task => 
      task.date === todayStr && task.status === 'выполнено'
    ).length;
    
    const totalCompleted = tasks.filter(t => t.status === 'выполнено').length;
    const completionRate = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;
    
    const request: ChatGPTRequest = {
      userMessage: `Дай мне мотивационное сообщение! Сегодня я выполнил ${completedToday} задач. Общий процент выполнения задач: ${completionRate}%. Поддержи меня, отметь достижения и дай энергии для дальнейшей работы!`,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU')
      }
    };

    const response = await this.getChatResponse(request);
    return response.message;
  }

  async analyzeTaskPatterns(tasks: Task[]): Promise<string> {
    await this.initialize();
    const user = await this.getUserData();
    
    // Анализируем паттерны по времени
    const tasksByTime = tasks.reduce((acc, task) => {
      if (task.time) {
        const hour = parseInt(task.time.split(':')[0]);
        const timeSlot = hour < 9 ? 'раннее утро (до 9)' : 
                       hour < 12 ? 'утро (9-12)' : 
                       hour < 15 ? 'день (12-15)' : 
                       hour < 18 ? 'вечер (15-18)' : 'поздний вечер (после 18)';
        if (!acc[timeSlot]) acc[timeSlot] = 0;
        acc[timeSlot]++;
      }
      return acc;
    }, {} as Record<string, number>);

    // Анализируем популярность тегов
    const tagFrequency = tasks.reduce((acc, task) => {
      if (task.tags) {
        task.tags.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>);

    // Дни недели (требует парсинга дат)
    const dayPatterns = tasks.reduce((acc, task) => {
      if (task.date && task.date.includes('.')) {
        try {
          const [day, month, year] = task.date.split('.');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long' });
          acc[dayName] = (acc[dayName] || 0) + 1;
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const request: ChatGPTRequest = {
      userMessage: `Проанализируй мои паттерны и привычки в задачах. 
      
      Статистика по времени дня: ${Object.entries(tasksByTime).map(([time, count]) => `${time}: ${count} задач`).join(', ')}. 
      
      Популярные категории: ${Object.entries(tagFrequency).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => `${tag} (${count})`).join(', ')}. 
      
      Активность по дням недели: ${Object.entries(dayPatterns).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([day, count]) => `${day} (${count})`).join(', ')}.
      
      Дай глубокий анализ моих паттернов поведения, выяви сильные стороны и дай рекомендации для оптимизации.`,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU')
      }
    };

    const response = await this.getChatResponse(request);
    return response.message;
  }

  async getWeeklyInsights(tasks: Task[]): Promise<string> {
    await this.initialize();
    const user = await this.getUserData();
    
    // Анализ за последнюю неделю
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyTasks = tasks.filter(task => {
      if (!task.date || !task.date.includes('.')) return false;
      try {
        const [day, month, year] = task.date.split('.');
        const taskDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return taskDate >= oneWeekAgo;
      } catch (e) {
        return false;
      }
    });

    const weeklyCompleted = weeklyTasks.filter(t => t.status === 'выполнено').length;
    
    const request: ChatGPTRequest = {
      userMessage: `Дай мне еженедельный отчет о продуктивности. За последнюю неделю у меня было ${weeklyTasks.length} задач, из них выполнено ${weeklyCompleted}. Проанализируй динамику, дай оценку недели и советы на следующую неделю.`,
      userContext: {
        tasks: weeklyTasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU')
      }
    };

    const response = await this.getChatResponse(request);
    return response.message;
  }

  // Утилитарные методы
  private isNetworkError(error: any): boolean {
    return (
      error?.name === 'AbortError' ||
      error?.message?.includes('network') ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('fetch')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Получение статистики использования
  async getUsageStats() {
    return await aiConfigManager.getUsageStats();
  }

  // Получение информации о сервисе
  getServiceInfo() {
    const config = aiConfigManager.getConfig();
    return {
      model: config.MODEL,
      requestCount: this.requestCount,
      isReady: this.isReady(),
      maxTokens: config.MAX_TOKENS,
      temperature: config.TEMPERATURE,
    };
  }
}

export default ChatGPTService;
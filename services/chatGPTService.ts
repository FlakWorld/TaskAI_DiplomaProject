// services/chatGPTService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TASK_CATEGORIES } from '../types';
import { aiConfigManager, AIConfigType } from '../services/aiConfig';
import { translations, Languages } from '../services/translations';

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
    language?: Languages; // Добавляем язык
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
  language?: Languages;
}

class ChatGPTService {
  private config: AIConfigType;
  private requestCount: number = 0;
  private currentLanguage: Languages = 'ru';

  constructor() {
    this.config = aiConfigManager.getConfig();
  }

  // Инициализация сервиса
  async initialize(): Promise<void> {
    await aiConfigManager.initialize();
    this.config = aiConfigManager.getConfig();
    
    // Загружаем язык пользователя
    try {
      const storedLanguage = await AsyncStorage.getItem('app_language');
      if (storedLanguage && ['ru', 'kk', 'en'].includes(storedLanguage)) {
        this.currentLanguage = storedLanguage as Languages;
      }
    } catch (error) {
      console.error('Ошибка загрузки языка:', error);
    }
  }

  // Проверка готовности сервиса
  isReady(): boolean {
    return aiConfigManager.isApiKeyValid();
  }

  // Установка языка
  setLanguage(language: Languages): void {
    this.currentLanguage = language;
  }

  // Получение текущего языка
  getCurrentLanguage(): Languages {
    return this.currentLanguage;
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

  // Получение переводов для текущего языка
  private getTranslations() {
    return translations[this.currentLanguage];
  }

  // Получение языковой инструкции для ChatGPT
  private getLanguageInstruction(language: Languages): string {
    const languageInstructions = {
      ru: 'Отвечай ТОЛЬКО на русском языке. Ты умный помощник по задачам.',
      kk: 'Тек қазақ тілінде жауап бер. Сен тапсырмалар бойынша ақылды көмекшісің.',
      en: 'Respond ONLY in English. You are a smart task management assistant.'
    };

    return languageInstructions[language];
  }

  // Получение приветствия в зависимости от языка
  private getWelcomePrompt(language: Languages): string {
    const welcomePrompts = {
      ru: `Привет! Я твой AI помощник по задачам. Общаюсь только на русском языке.`,
      kk: `Сәлем! Мен сіздің тапсырмалар бойынша AI көмекшісімін. Тек қазақ тілінде сөйлесемін.`,
      en: `Hello! I'm your AI task assistant. I communicate only in English.`
    };

    return welcomePrompts[language];
  }

  private buildSystemPrompt(userContext: ChatGPTRequest['userContext']): string {
    const { tasks, userName, currentDate, language = this.currentLanguage } = userContext;
    const t = this.getTranslations();
    
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
        const timeSlot = language === 'ru' ? 
          (hour < 12 ? 'утром' : hour < 18 ? 'днем' : 'вечером') :
          language === 'kk' ?
          (hour < 12 ? 'таңертең' : hour < 18 ? 'күндіз' : 'кешке') :
          (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');
        if (!acc[timeSlot]) acc[timeSlot] = [];
        acc[timeSlot].push(task);
      }
      return acc;
    }, {} as Record<string, Task[]>);

    // Создаем маппинг категорий для получения переводов
    const getCategoryName = (categoryName: string): string => {
      // Создаем обратный маппинг из переводов
      const categoryKeys: Record<string, string> = {
        'Работа': 'work', 'Work': 'work', 'Жұмыс': 'work',
        'Учеба': 'study', 'Study': 'study', 'Оқу': 'study',
        'Дом': 'home', 'Home': 'home', 'Үй': 'home',
        'Здоровье': 'health', 'Health': 'health', 'Денсаулық': 'health',
        'Финансы': 'finance', 'Finance': 'finance', 'Қаржы': 'finance',
        'Личное': 'personal', 'Personal': 'personal', 'Жеке': 'personal',
        'Семья': 'family', 'Family': 'family', 'Отбасы': 'family',
        'Спорт': 'sport', 'Sport': 'sport', 'Спорты': 'sport',
        'Творчество': 'creative', 'Creative': 'creative', 'Шығармашылық': 'creative',
        'Путешествия': 'travel', 'Travel': 'travel', 'Саяхат': 'travel',
        'Покупки': 'shopping', 'Shopping': 'shopping', 'Сатып алу': 'shopping',
        'Другое': 'other', 'Other': 'other', 'Басқа': 'other'
      };
      
      const key = categoryKeys[categoryName];
      if (key && (t.categories as any)[key]) {
        return (t.categories as any)[key];
      }
      return categoryName;
    };

    return `${this.getLanguageInstruction(language)}

${this.getWelcomePrompt(language)}

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ / USER CONTEXT / ПАЙДАЛАНУШЫ КОНТЕКСТІ:
- ${language === 'ru' ? 'Имя' : language === 'kk' ? 'Аты' : 'Name'}: ${userName}
- ${language === 'ru' ? 'Текущая дата' : language === 'kk' ? 'Қазіргі күні' : 'Current date'}: ${currentDate}
- ${language === 'ru' ? 'Всего задач' : language === 'kk' ? 'Барлық тапсырма' : 'Total tasks'}: ${tasks.length}
- ${language === 'ru' ? 'Выполнено' : language === 'kk' ? 'Орындалды' : 'Completed'}: ${completedTasks.length}
- ${language === 'ru' ? 'В прогрессе' : language === 'kk' ? 'Орындалуда' : 'In progress'}: ${inProgressTasks.length}
- ${language === 'ru' ? 'На сегодня' : language === 'kk' ? 'Бүгінге' : 'For today'} (${todayFormatted}): ${todayTasks.length}

${language === 'ru' ? 'ТЕКУЩИЕ ЗАДАЧИ' : language === 'kk' ? 'ҚАЗІРГІ ТАПСЫРМАЛАР' : 'CURRENT TASKS'}:
${tasks.slice(0, 10).map((task, index) => 
  `${index + 1}. "${task.title}" - ${task.status}
     ${language === 'ru' ? 'Дата' : language === 'kk' ? 'Күні' : 'Date'}: ${task.date || (language === 'ru' ? 'не указана' : language === 'kk' ? 'көрсетілмеген' : 'not specified')}
     ${language === 'ru' ? 'Время' : language === 'kk' ? 'Уақыты' : 'Time'}: ${task.time || (language === 'ru' ? 'не указано' : language === 'kk' ? 'көрсетілмеген' : 'not specified')}
     ${language === 'ru' ? 'Теги' : language === 'kk' ? 'Тегтер' : 'Tags'}: ${task.tags?.join(', ') || (language === 'ru' ? 'без тегов' : language === 'kk' ? 'тегсіз' : 'no tags')}`
).join('\n')}${tasks.length > 10 ? `\n... ${language === 'ru' ? 'и еще' : language === 'kk' ? 'және тағы' : 'and'} ${tasks.length - 10} ${language === 'ru' ? 'задач' : language === 'kk' ? 'тапсырма' : 'tasks'}` : ''}

${language === 'ru' ? 'СТАТИСТИКА ПО КАТЕГОРИЯМ' : language === 'kk' ? 'САНАТТАР БОЙЫНША СТАТИСТИКА' : 'STATISTICS BY CATEGORIES'}:
${Object.entries(tasksByTags).map(([tag, taskList]) => 
  `${tag}: ${taskList.length} ${language === 'ru' ? 'задач' : language === 'kk' ? 'тапсырма' : 'tasks'} (${taskList.filter(t => t.status === 'выполнено').length} ${language === 'ru' ? 'выполнено' : language === 'kk' ? 'орындалды' : 'completed'})`
).join('\n')}

${language === 'ru' ? 'АКТИВНОСТЬ ПО ВРЕМЕНИ' : language === 'kk' ? 'УАҚЫТ БОЙЫНША БЕЛСЕНДІЛІК' : 'ACTIVITY BY TIME'}:
${Object.entries(tasksByTimeSlot).map(([timeSlot, taskList]) => 
  `${timeSlot}: ${taskList.length} ${language === 'ru' ? 'задач' : language === 'kk' ? 'тапсырма' : 'tasks'}`
).join('\n')}

${language === 'ru' ? 'ДОСТУПНЫЕ КАТЕГОРИИ ЗАДАЧ' : language === 'kk' ? 'ҚОЛ ЖЕТІМДІ ТАПСЫРМА САНАТТАРЫ' : 'AVAILABLE TASK CATEGORIES'}:
${TASK_CATEGORIES.map(cat => `- ${getCategoryName(cat.name)} (${language === 'ru' ? 'иконка' : language === 'kk' ? 'белгіше' : 'icon'}: ${cat.icon})`).join('\n')}

${language === 'ru' ? 'ТВОИ ВОЗМОЖНОСТИ' : language === 'kk' ? 'СЕНІҢ МҮМКІНДІКТЕРІҢ' : 'YOUR CAPABILITIES'}:
1. ${language === 'ru' ? 'Анализировать продуктивность и прогресс по задачам' : language === 'kk' ? 'Өнімділік пен тапсырмалар бойынша прогрессті талдау' : 'Analyze productivity and task progress'}
2. ${language === 'ru' ? 'Предлагать оптимизацию планирования дня' : language === 'kk' ? 'Күнді жоспарлауды оңтайландыруды ұсыну' : 'Suggest day planning optimization'}
3. ${language === 'ru' ? 'Помогать с созданием новых задач с подходящими тегами' : language === 'kk' ? 'Қолайлы тегтермен жаңа тапсырмалар жасауға көмектесу' : 'Help create new tasks with appropriate tags'}
4. ${language === 'ru' ? 'Давать мотивационные советы и поддержку' : language === 'kk' ? 'Мотивациялық кеңестер мен қолдау көрсету' : 'Provide motivational advice and support'}
5. ${language === 'ru' ? 'Анализировать паттерны и привычки пользователя' : language === 'kk' ? 'Пайдаланушының үлгілері мен дағдыларын талдау' : 'Analyze user patterns and habits'}
6. ${language === 'ru' ? 'Предлагать улучшения в организации времени' : language === 'kk' ? 'Уақытты ұйымдастыруда жақсартулар ұсыну' : 'Suggest time management improvements'}
7. ${language === 'ru' ? 'Помогать с расстановкой приоритетов' : language === 'kk' ? 'Басымдықтарды белгілеуге көмектесу' : 'Help with prioritization'}

${language === 'ru' ? 'ПРАВИЛА' : language === 'kk' ? 'ЕРЕЖЕЛЕР' : 'RULES'}:
- ${language === 'ru' ? 'Всегда учитывай контекст существующих задач пользователя' : language === 'kk' ? 'Әрдайым пайдаланушының қолданыстағы тапсырмаларының контекстін ескер' : 'Always consider the context of user\'s existing tasks'}
- ${language === 'ru' ? 'Используй данные о времени и датах для умного планирования' : language === 'kk' ? 'Ақылды жоспарлау үшін уақыт пен күндер туралы деректерді пайдалан' : 'Use time and date data for smart planning'}
- ${language === 'ru' ? 'При анализе учитывай статусы задач и теги' : language === 'kk' ? 'Талдау кезінде тапсырмалардың мәртебелері мен тегтерін ескер' : 'Consider task statuses and tags when analyzing'}
- ${language === 'ru' ? 'Предлагай конкретные и реализуемые советы' : language === 'kk' ? 'Нақты және іске асырылатын кеңестер ұсын' : 'Offer specific and actionable advice'}
- ${language === 'ru' ? 'Мотивируй пользователя и отмечай его достижения' : language === 'kk' ? 'Пайдаланушыны ынталандыр және оның жетістіктерін атап өт' : 'Motivate the user and acknowledge their achievements'}
- ${language === 'ru' ? 'При предложении новых задач указывай подходящие теги из доступных категорий' : language === 'kk' ? 'Жаңа тапсырмаларды ұсыну кезінде қолжетімді санаттардан қолайлы тегтерді көрсет' : 'When suggesting new tasks, specify appropriate tags from available categories'}
- ${language === 'ru' ? 'Если предлагаешь создать задачу, добавь в конец "[СОЗДАТЬ_ЗАДАЧУ]"' : language === 'kk' ? 'Егер тапсырма жасауды ұсынсаң, соңына "[ТАПСЫРМА_ЖАСАУ]" қос' : 'If suggesting to create a task, add "[CREATE_TASK]" at the end'}
- ${language === 'ru' ? 'Отвечай дружелюбно и поддерживающе' : language === 'kk' ? 'Достық және қолдаушы түрде жауап бер' : 'Respond in a friendly and supportive manner'}
- ${language === 'ru' ? 'Используй формат даты DD.MM.YYYY и времени HH:MM' : language === 'kk' ? 'DD.MM.YYYY күн форматын және HH:MM уақыт форматын пайдалан' : 'Use DD.MM.YYYY date format and HH:MM time format'}
- ${language === 'ru' ? 'Учитывай что статусы задач могут быть только "в прогрессе" или "выполнено"' : language === 'kk' ? 'Тапсырма мәртебелері тек "орындалуда" немесе "орындалды" болуы мүмкін екенін ескер' : 'Remember that task statuses can only be "in progress" or "completed"'}
- ${language === 'ru' ? 'Будь кратким но информативным - не более' : language === 'kk' ? 'Қысқа бірақ ақпараттық бол - артық емес' : 'Be concise but informative - no more than'} ${this.config.MAX_TOKENS} ${language === 'ru' ? 'токенов' : language === 'kk' ? 'токен' : 'tokens'}

ВАЖНО: ${this.getLanguageInstruction(language)}`;
  }

  async getChatResponse(request: ChatGPTRequest): Promise<ChatGPTResponse> {
    // Проверяем готовность сервиса
    if (!this.isReady()) {
      throw new Error(this.config.FALLBACK_RESPONSES.INVALID_KEY);
    }

    // Обновляем язык из контекста
    if (request.userContext.language) {
      this.setLanguage(request.userContext.language);
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
          message: aiMessage.replace(/\[(СОЗДАТЬ_ЗАДАЧУ|ТАПСЫРМА_ЖАСАУ|CREATE_TASK)\]/g, '').trim(),
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
    
    // Проверяем на предложение создать задачу (поддерживаем все языки)
    if (message.includes('[СОЗДАТЬ_ЗАДАЧУ]') || message.includes('[ТАПСЫРМА_ЖАСАУ]') || message.includes('[CREATE_TASK]')) {
      actions.push({
        type: 'create_task',
        data: { 
          suggested: true,
          fromAI: true 
        }
      });
    }
    
    // Можно добавить другие паттерны для разных языков
    const completePatterns = {
      ru: ['отметить как выполненную', 'завершить задачу'],
      kk: ['орындалды деп белгіле', 'тапсырманы аяқта'],
      en: ['mark as completed', 'complete task']
    };

    const patterns = completePatterns[this.currentLanguage] || completePatterns.ru;
    if (patterns.some(pattern => message.includes(pattern))) {
      actions.push({
        type: 'update_task_status',
        data: { status: 'выполнено' }
      });
    }

    return actions.length > 0 ? actions : undefined;
  }

  // Специализированные методы для анализа с поддержкой языков
  async analyzeProductivity(tasks: Task[]): Promise<string> {
    await this.initialize();
    const user = await this.getUserData();
    const t = this.getTranslations();
    
    const completedTasks = tasks.filter(t => t.status === 'выполнено');
    const inProgressTasks = tasks.filter(t => t.status === 'в прогрессе');
    
    // Анализ по времени создания
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const todayCompleted = completedTasks.filter(t => t.date === todayStr).length;
    
    const analysisRequest = this.getAnalysisRequest('productivity', {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      completionRate: Math.round((completedTasks.length / Math.max(tasks.length, 1)) * 100),
      todayCompleted
    });

    const request: ChatGPTRequest = {
      userMessage: analysisRequest,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU'),
        language: this.currentLanguage
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
    
    const planRequest = this.getDailyPlanRequest(todayStr, todayTasks.length);

    const request: ChatGPTRequest = {
      userMessage: planRequest,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU'),
        language: this.currentLanguage
      }
    };

    const response = await this.getChatResponse(request);
    return response.message;
  }

  async getTaskSuggestions(userInput: string, tasks: Task[]): Promise<string> {
    await this.initialize();
    const user = await this.getUserData();
    
    const suggestionRequest = this.getTaskSuggestionRequest(userInput);

    const request: ChatGPTRequest = {
      userMessage: suggestionRequest,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU'),
        language: this.currentLanguage
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
    
    const motivationRequest = this.getMotivationRequest(completedToday, completionRate);

    const request: ChatGPTRequest = {
      userMessage: motivationRequest,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU'),
        language: this.currentLanguage
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
        const timeSlot = this.getTimeSlotLabel(hour);
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
          const dayName = this.getDayName(date);
          acc[dayName] = (acc[dayName] || 0) + 1;
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const patternsRequest = this.getPatternsRequest(tasksByTime, tagFrequency, dayPatterns);

    const request: ChatGPTRequest = {
      userMessage: patternsRequest,
      userContext: {
        tasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU'),
        language: this.currentLanguage
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
    
    const weeklyRequest = this.getWeeklyRequest(weeklyTasks.length, weeklyCompleted);

    const request: ChatGPTRequest = {
      userMessage: weeklyRequest,
      userContext: {
        tasks: weeklyTasks,
        userName: user?.name || 'Пользователь',
        currentDate: new Date().toLocaleDateString('ru-RU'),
        language: this.currentLanguage
      }
    };

    const response = await this.getChatResponse(request);
    return response.message;
  }

  // Вспомогательные методы для генерации запросов на разных языках
  private getAnalysisRequest(type: 'productivity', data: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    todayCompleted: number;
  }): string {
    const requests: Record<Languages, Record<string, string>> = {
      ru: {
        productivity: `Проанализируй мою продуктивность. У меня ${data.totalTasks} задач всего, ${data.completedTasks} выполнено (${data.completionRate}%). Сегодня выполнил ${data.todayCompleted} задач. Дай детальный анализ моей эффективности и конкретные советы для улучшения.`
      },
      kk: {
        productivity: `Менің өнімділігімді талда. Менде барлығы ${data.totalTasks} тапсырма бар, ${data.completedTasks} орындалды (${data.completionRate}%). Бүгін ${data.todayCompleted} тапсырма орындадым. Менің тиімділігімнің толық талдауын және жақсарту үшін нақты кеңестер бер.`
      },
      en: {
        productivity: `Analyze my productivity. I have ${data.totalTasks} tasks total, ${data.completedTasks} completed (${data.completionRate}%). Today I completed ${data.todayCompleted} tasks. Give me a detailed analysis of my efficiency and specific tips for improvement.`
      }
    };

    return requests[this.currentLanguage]?.[type] || requests.ru[type];
  }

  private getDailyPlanRequest(todayStr: string, todayTasksCount: number): string {
    const requests: Record<Languages, string> = {
      ru: `Помоги спланировать мой день. На сегодня (${todayStr}) у меня запланировано ${todayTasksCount} задач. Предложи оптимальный порядок выполнения с учетом времени и категорий. Дай практические советы по тайм-менеджменту.`,
      kk: `Күнімді жоспарлауға көмектес. Бүгінге (${todayStr}) ${todayTasksCount} тапсырма жоспарланған. Уақыт пен санаттарды ескере отырып, орындаудың оңтайлы ретін ұсын. Уақытты басқару бойынша практикалық кеңестер бер.`,
      en: `Help me plan my day. For today (${todayStr}) I have ${todayTasksCount} tasks planned. Suggest optimal execution order considering time and categories. Give practical time management tips.`
    };

    return requests[this.currentLanguage] || requests.ru;
  }

  private getTaskSuggestionRequest(userInput: string): string {
    const requests: Record<Languages, string> = {
      ru: `Пользователь хочет: "${userInput}". Предложи конкретные задачи с подходящими категориями из доступных тегов и оптимальным временем. Учитывай мои существующие задачи чтобы избежать дублирования. Укажи рекомендуемые теги и время выполнения.`,
      kk: `Пайдаланушы мынаны қалайды: "${userInput}". Қолжетімді тегтерден қолайлы санаттармен және оңтайлы уақытпен нақты тапсырмаларды ұсын. Қайталануды болдырмау үшін менің қолданыстағы тапсырмаларымды ескер. Ұсынылатын тегтер мен орындау уақытын көрсет.`,
      en: `User wants: "${userInput}". Suggest specific tasks with appropriate categories from available tags and optimal timing. Consider my existing tasks to avoid duplication. Specify recommended tags and execution time.`
    };

    return requests[this.currentLanguage] || requests.ru;
  }

  private getMotivationRequest(completedToday: number, completionRate: number): string {
    const requests: Record<Languages, string> = {
      ru: `Дай мне мотивационное сообщение! Сегодня я выполнил ${completedToday} задач. Общий процент выполнения задач: ${completionRate}%. Поддержи меня, отметь достижения и дай энергии для дальнейшей работы!`,
      kk: `Маған мотивациялық хабар бер! Бүгін мен ${completedToday} тапсырма орындадым. Жалпы орындау пайызы: ${completionRate}%. Мені қолдап, жетістіктерімді атап өт және әрі қарай жұмыс істеуге энергия бер!`,
      en: `Give me a motivational message! Today I completed ${completedToday} tasks. Overall completion rate: ${completionRate}%. Support me, acknowledge achievements and give me energy for further work!`
    };

    return requests[this.currentLanguage] || requests.ru;
  }

  private getPatternsRequest(tasksByTime: Record<string, number>, tagFrequency: Record<string, number>, dayPatterns: Record<string, number>): string {
    const timeStatsText = Object.entries(tasksByTime).map(([time, count]) => `${time}: ${count} ${this.getTasksLabel(count)}`).join(', ');
    const popularCategoriesText = Object.entries(tagFrequency).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => `${tag} (${count})`).join(', ');
    const dayActivityText = Object.entries(dayPatterns).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([day, count]) => `${day} (${count})`).join(', ');

    const requests: Record<Languages, string> = {
      ru: `Проанализируй мои паттерны и привычки в задачах. Статистика по времени дня: ${timeStatsText}. Популярные категории: ${popularCategoriesText}. Активность по дням недели: ${dayActivityText}. Дай глубокий анализ моих паттернов поведения, выяви сильные стороны и дай рекомендации для оптимизации.`,
      kk: `Менің тапсырмалардағы үлгілерім мен дағдыларымды талда. Күн уақыты бойынша статистика: ${timeStatsText}. Танымал санаттар: ${popularCategoriesText}. Апта күндері бойынша белсенділік: ${dayActivityText}. Менің мінез-құлық үлгілерімнің терең талдауын жасап, күшті жақтарымды анықта және оңтайландыру үшін ұсыныстар бер.`,
      en: `Analyze my task patterns and habits. Time of day statistics: ${timeStatsText}. Popular categories: ${popularCategoriesText}. Weekly activity: ${dayActivityText}. Give me a deep analysis of my behavioral patterns, identify strengths and provide optimization recommendations.`
    };

    return requests[this.currentLanguage] || requests.ru;
  }

  private getWeeklyRequest(weeklyTasksCount: number, weeklyCompleted: number): string {
    const requests: Record<Languages, string> = {
      ru: `Дай мне еженедельный отчет о продуктивности. За последнюю неделю у меня было ${weeklyTasksCount} задач, из них выполнено ${weeklyCompleted}. Проанализируй динамику, дай оценку недели и советы на следующую неделю.`,
      kk: `Маған өнімділік туралы апталық есеп бер. Соңғы апта ішінде менде ${weeklyTasksCount} тапсырма болды, олардың ${weeklyCompleted}-і орындалды. Динамиканы талда, аптаны бағала және келесі аптаға кеңес бер.`,
      en: `Give me a weekly productivity report. Over the past week I had ${weeklyTasksCount} tasks, ${weeklyCompleted} of them completed. Analyze the dynamics, evaluate the week and give advice for next week.`
    };

    return requests[this.currentLanguage] || requests.ru;
  }

  // Вспомогательные методы для локализации
  private getTimeSlotLabel(hour: number): string {
    const labels: Record<Languages, string> = {
      ru: hour < 9 ? 'раннее утро (до 9)' : hour < 12 ? 'утро (9-12)' : hour < 15 ? 'день (12-15)' : hour < 18 ? 'вечер (15-18)' : 'поздний вечер (после 18)',
      kk: hour < 9 ? 'ерте таң (9-ға дейін)' : hour < 12 ? 'таң (9-12)' : hour < 15 ? 'күн (12-15)' : hour < 18 ? 'кеш (15-18)' : 'кеш кеш (18-ден кейін)',
      en: hour < 9 ? 'early morning (before 9)' : hour < 12 ? 'morning (9-12)' : hour < 15 ? 'afternoon (12-15)' : hour < 18 ? 'evening (15-18)' : 'late evening (after 18)'
    };

    return labels[this.currentLanguage] || labels.ru;
  }

  private getDayName(date: Date): string {
    const dayNames: Record<Languages, string[]> = {
      ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
      kk: ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'],
      en: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    };

    const names = dayNames[this.currentLanguage] || dayNames.ru;
    return names[date.getDay()];
  }

  private getTasksLabel(count: number): string {
    const labels: Record<Languages, string> = {
      ru: 'задач',
      kk: 'тапсырма',
      en: 'tasks'
    };

    return labels[this.currentLanguage] || labels.ru;
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
      language: this.currentLanguage,
    };
  }
}

export default ChatGPTService;
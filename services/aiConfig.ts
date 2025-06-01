// config/aiConfig.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECRETS } from '../services/secret'; // Импортируем из secrets.ts

export interface AIConfigType {
  OPENAI_API_KEY: string;
  MODEL: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4o-mini';
  MAX_TOKENS: number;
  TEMPERATURE: number;
  MAX_MESSAGES_HISTORY: number;
  REQUEST_TIMEOUT: number;
  RETRY_ATTEMPTS: number;
  FALLBACK_RESPONSES: {
    ERROR: string;
    NETWORK_ERROR: string;
    API_LIMIT: string;
    INVALID_KEY: string;
  };
}

// Базовая конфигурация
const BASE_CONFIG: AIConfigType = {
  // API ключ загружается из secrets.ts
  OPENAI_API_KEY: SECRETS.OPENAI_API_KEY || '',
  
  // Настройки модели
  MODEL: 'gpt-3.5-turbo', // Самый дешевый и быстрый вариант
  MAX_TOKENS: 800,        // Максимум токенов в ответе
  TEMPERATURE: 0.7,       // Креативность (0.0 - 1.0)
  
  // Настройки производительности
  MAX_MESSAGES_HISTORY: 10,  // Сколько сообщений помнить в контексте
  REQUEST_TIMEOUT: 30000,     // Таймаут запроса в миллисекундах
  RETRY_ATTEMPTS: 3,          // Количество попыток при ошибке
  
  // Fallback сообщения при ошибках
  FALLBACK_RESPONSES: {
    ERROR: 'Извини, произошла ошибка. Попробуй еще раз! 😔',
    NETWORK_ERROR: 'Проблемы с интернетом. Проверь соединение и попробуй снова! 📶',
    API_LIMIT: 'Превышен лимит запросов. Попробуй через несколько минут! ⏰',
    INVALID_KEY: 'Проблема с настройками AI. Обратись к разработчику! 🔧',
  }
};

// Класс для управления конфигурацией
export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIConfigType;
  private configLoaded: boolean = false;

  private constructor() {
    this.config = { ...BASE_CONFIG };
  }

  public static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  // Инициализация конфигурации
  async initialize(): Promise<void> {
    if (this.configLoaded) return;

    try {
      // Проверяем что API ключ загрузился из secrets.ts
      if (!SECRETS.OPENAI_API_KEY || SECRETS.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
        console.warn('⚠️ API ключ не настроен в secrets.ts');
      } else {
        this.config.OPENAI_API_KEY = SECRETS.OPENAI_API_KEY;
      }

      // Пытаемся загрузить переопределенный API ключ из AsyncStorage
      const storedApiKey = await AsyncStorage.getItem('openai_api_key');
      if (storedApiKey && storedApiKey !== 'sk-your-openai-api-key-here') {
        this.config.OPENAI_API_KEY = storedApiKey;
        console.log('🔄 Используется API ключ из AsyncStorage');
      }

      // Загружаем другие настройки если они есть
      const storedModel = await AsyncStorage.getItem('ai_model');
      if (storedModel && this.isValidModel(storedModel)) {
        this.config.MODEL = storedModel as AIConfigType['MODEL'];
      }

      const storedTemp = await AsyncStorage.getItem('ai_temperature');
      if (storedTemp) {
        const temp = parseFloat(storedTemp);
        if (!isNaN(temp) && temp >= 0 && temp <= 1) {
          this.config.TEMPERATURE = temp;
        }
      }

      this.configLoaded = true;
      
      // Логируем статус инициализации (без показа самого ключа)
      console.log('✅ AI Config initialized:', {
        hasApiKey: this.isApiKeyValid(),
        keySource: storedApiKey ? 'AsyncStorage' : 'secrets.ts',
        model: this.config.MODEL,
        temperature: this.config.TEMPERATURE
      });
      
    } catch (error) {
      console.error('❌ Ошибка загрузки конфигурации AI:', error);
      // Используем базовую конфигурацию при ошибке
      this.configLoaded = true;
    }
  }

  // Получение текущей конфигурации
  getConfig(): AIConfigType {
    return { ...this.config };
  }

  // Получение API ключа
  getApiKey(): string {
    return this.config.OPENAI_API_KEY;
  }

  // Проверка валидности API ключа
  isApiKeyValid(): boolean {
    const key = this.config.OPENAI_API_KEY;
    return Boolean(key && key.startsWith('sk-') && key.length > 20 && key !== 'sk-your-openai-api-key-here');
  }

  // Установка API ключа
  async setApiKey(apiKey: string): Promise<void> {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Неверный формат API ключа');
    }

    this.config.OPENAI_API_KEY = apiKey;
    await AsyncStorage.setItem('openai_api_key', apiKey);
    console.log('🔑 API ключ обновлен и сохранен в AsyncStorage');
  }

  // Установка модели
  async setModel(model: AIConfigType['MODEL']): Promise<void> {
    if (!this.isValidModel(model)) {
      throw new Error('Неподдерживаемая модель');
    }

    this.config.MODEL = model;
    await AsyncStorage.setItem('ai_model', model);
  }

  // Установка температуры
  async setTemperature(temperature: number): Promise<void> {
    if (temperature < 0 || temperature > 1) {
      throw new Error('Температура должна быть от 0 до 1');
    }

    this.config.TEMPERATURE = temperature;
    await AsyncStorage.setItem('ai_temperature', temperature.toString());
  }

  // Валидация API ключа через запрос к OpenAI
  async validateApiKey(apiKey?: string): Promise<boolean> {
    const keyToValidate = apiKey || this.config.OPENAI_API_KEY;
    
    if (!keyToValidate || !keyToValidate.startsWith('sk-')) {
      return false;
    }

    // Создаем контроллер для отмены запроса по таймауту
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${keyToValidate}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Ошибка валидации API ключа:', error);
      return false;
    }
  }

  // Получение информации о лимитах
  async getUsageInfo(): Promise<any> {
    if (!this.isApiKeyValid()) {
      throw new Error('Невалидный API ключ');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.openai.com/v1/usage', {
        headers: {
          'Authorization': `Bearer ${this.config.OPENAI_API_KEY}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Ошибка получения информации об использовании:', error);
    }
    
    return null;
  }

  // Сброс конфигурации к базовой
  async resetToDefaults(): Promise<void> {
    this.config = { ...BASE_CONFIG };
    
    await AsyncStorage.multiRemove([
      'openai_api_key',
      'ai_model', 
      'ai_temperature'
    ]);
    
    this.configLoaded = false;
    console.log('🔄 Конфигурация сброшена к базовой');
  }

  // Экспорт конфигурации
  async exportConfig(): Promise<string> {
    const exportData = {
      model: this.config.MODEL,
      temperature: this.config.TEMPERATURE,
      maxTokens: this.config.MAX_TOKENS,
      // API ключ не экспортируем из соображений безопасности
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Импорт конфигурации
  async importConfig(configJson: string): Promise<void> {
    try {
      const importData = JSON.parse(configJson);
      
      if (importData.model && this.isValidModel(importData.model)) {
        await this.setModel(importData.model);
      }
      
      if (typeof importData.temperature === 'number') {
        await this.setTemperature(importData.temperature);
      }
      
      if (typeof importData.maxTokens === 'number' && importData.maxTokens > 0) {
        this.config.MAX_TOKENS = importData.maxTokens;
      }
      
    } catch (error) {
      throw new Error('Неверный формат конфигурации');
    }
  }

  // Приватные методы
  private isValidModel(model: string): boolean {
    return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o-mini'].includes(model);
  }

  // Получение стоимости запроса (примерно)
  getEstimatedCost(inputTokens: number, outputTokens: number): number {
    const costs = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }, // за 1K токенов
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    };

    const modelCosts = costs[this.config.MODEL] || costs['gpt-3.5-turbo'];
    
    return (
      (inputTokens / 1000) * modelCosts.input +
      (outputTokens / 1000) * modelCosts.output
    );
  }

  // Логирование использования
  async logUsage(inputTokens: number, outputTokens: number): Promise<void> {
    try {
      const cost = this.getEstimatedCost(inputTokens, outputTokens);
      const usageData = {
        timestamp: new Date().toISOString(),
        model: this.config.MODEL,
        inputTokens,
        outputTokens,
        estimatedCost: cost,
      };

      const existingLogs = await AsyncStorage.getItem('ai_usage_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(usageData);
      
      // Храним только последние 100 записей
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      await AsyncStorage.setItem('ai_usage_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Ошибка логирования использования:', error);
    }
  }

  // Получение статистики использования
  async getUsageStats(): Promise<{
    totalRequests: number;
    totalTokens: number;
    estimatedTotalCost: number;
    avgTokensPerRequest: number;
  }> {
    try {
      const logsData = await AsyncStorage.getItem('ai_usage_logs');
      if (!logsData) {
        return {
          totalRequests: 0,
          totalTokens: 0,
          estimatedTotalCost: 0,
          avgTokensPerRequest: 0,
        };
      }

      const logs = JSON.parse(logsData);
      
      const totalRequests = logs.length;
      const totalTokens = logs.reduce((sum: number, log: any) => 
        sum + log.inputTokens + log.outputTokens, 0
      );
      const estimatedTotalCost = logs.reduce((sum: number, log: any) => 
        sum + log.estimatedCost, 0
      );
      const avgTokensPerRequest = totalRequests > 0 ? totalTokens / totalRequests : 0;

      return {
        totalRequests,
        totalTokens,
        estimatedTotalCost,
        avgTokensPerRequest: Math.round(avgTokensPerRequest),
      };
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return {
        totalRequests: 0,
        totalTokens: 0,
        estimatedTotalCost: 0,
        avgTokensPerRequest: 0,
      };
    }
  }
}

// Экспортируем основную конфигурацию для обратной совместимости
export const AI_CONFIG = BASE_CONFIG;

// Singleton instance
export const aiConfigManager = AIConfigManager.getInstance();

// Удобные функции для быстрого доступа
export const getAIConfig = () => aiConfigManager.getConfig();
export const getApiKey = () => aiConfigManager.getApiKey();
export const isApiKeyValid = () => aiConfigManager.isApiKeyValid();
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Определяем параметры для экранов
export type RootStackParamList = {
  Start: undefined; // Экран вступительной страницы
  Login: undefined;
  Register: undefined;
  Home: { refreshed?: boolean };
  Task: { id?: string }; // id теперь явно необязательный
  EditTask: { id?: string };
  EditTaskForm: { task: { _id?: string; title: string; date: string; time: string; status: string; tags?: string[] } }; // Добавляем теги
  Profile: undefined;
  EditProfile: undefined;
  EmailVerification: { email: string };
  AIChat: undefined; // Добавляем AI чат
};

// =============================================================================
// НОВЫЕ ТИПЫ ДЛЯ ИИ АНАЛИЗА (TensorFlow Lite)
// =============================================================================

// Поддерживаемые языки
export type SupportedLanguage = 'ru' | 'en' | 'kz';

// Результат анализа тональности
export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  suggestion?: string;
  aiModelUsed: string;
}

// Полный анализ задачи ИИ
export interface TaskAnalysis {
  sentiment: SentimentResult;
  category: string;
  estimatedDuration: number;
  priority: 'high' | 'medium' | 'low';
}

// Обновленный тип Task с поддержкой ИИ анализа
export type Task = {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  status: "в прогрессе" | "выполнено";
  tags?: string[]; // Добавляем теги
  // Новые поля для ИИ анализа
  analysis?: TaskAnalysis;
  category?: string;
  estimatedDuration?: number;
  priority?: 'high' | 'medium' | 'low';
};

// Статистика ИИ анализа
export interface AIStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  averageConfidence: number;
  categories: { [key: string]: number };
  averageDuration: number;
  totalDuration: number; // Добавлено общее время
}

// Паттерны для многоязычного анализа
export interface LanguagePattern {
  words: string[];
  weight: number;
}

export interface MultilingualPatterns {
  [language: string]: LanguagePattern[];
}

export interface CategoryKeywords {
  ru: string[];
  en: string[];
  kz: string[];
}

// =============================================================================
// КАТЕГОРИИ ЗАДАЧ (обновленные для поддержки переводов)
// =============================================================================

export type TaskCategory = {
  key: string; // Ключ для переводов
  name: string; // Резервное название (для совместимости)
  icon: string;
  color: string;
  keywords?: CategoryKeywords; // Добавляем ключевые слова для ИИ
};

// Предустановленные категории (обновленные для поддержки переводов)
export const TASK_CATEGORIES: TaskCategory[] = [
  { 
    key: "work",
    name: "Работа", 
    icon: "briefcase-outline", 
    color: "#2196F3",
    keywords: {
      ru: ['работа', 'проект', 'код', 'программирование', 'разработка', 'тестирование', 'диплом', 'баг', 'фича'],
      en: ['work', 'project', 'code', 'programming', 'development', 'testing', 'diploma', 'thesis', 'job', 'bug', 'feature'],
      kz: ['жұмыс', 'жоба', 'код', 'бағдарламалау', 'дамыту']
    }
  },
  { 
    key: "study",
    name: "Учеба", 
    icon: "school-outline", 
    color: "#9C27B0",
    keywords: {
      ru: ['учеба', 'изучить', 'прочитать', 'экзамен', 'лекция', 'курс', 'университет', 'диплом'],
      en: ['study', 'learn', 'read', 'exam', 'lecture', 'course', 'university', 'diploma', 'education'],
      kz: ['оқу', 'үйрену', 'оқыту', 'емтихан', 'лекция', 'курс']
    }
  },
  { 
    key: "home",
    name: "Дом", 
    icon: "home-outline", 
    color: "#FF9800",
    keywords: {
      ru: ['дом', 'уборка', 'покупки', 'готовка', 'ремонт', 'стирка', 'посуда'],
      en: ['home', 'cleaning', 'shopping', 'cooking', 'repair', 'laundry', 'dishes'],
      kz: ['үй', 'тазалау', 'сатып алу', 'ас дайындау', 'жөндеу']
    }
  },
  { 
    key: "health",
    name: "Здоровье", 
    icon: "fitness-outline", 
    color: "#4CAF50",
    keywords: {
      ru: ['спорт', 'врач', 'тренировка', 'здоровье', 'фитнес', 'бег', 'зал', 'йога', 'бегать', 'run'],
      en: ['sport', 'doctor', 'workout', 'health', 'fitness', 'running', 'gym', 'yoga', 'exercise', 'run'],
      kz: ['спорт', 'дәрігер', 'жаттығу', 'денсаулық', 'фитнес', 'жүгіру']
    }
  },
  { 
    key: "finance",
    name: "Финансы", 
    icon: "card-outline", 
    color: "#F44336",
    keywords: {
      ru: ['деньги', 'счет', 'банк', 'платеж', 'долг', 'кредит', 'зарплата', 'бюджет'],
      en: ['money', 'bill', 'bank', 'payment', 'debt', 'credit', 'salary', 'budget'],
      kz: ['ақша', 'банк', 'төлем', 'қарыз', 'несие', 'жалақы']
    }
  },
  { 
    key: "personal",
    name: "Личное", 
    icon: "heart-outline", 
    color: "#E91E63",
    keywords: {
      ru: ['встреча', 'друзья', 'семья', 'хобби', 'отдых', 'путешествие', 'день рождения'],
      en: ['meeting', 'friends', 'family', 'hobby', 'rest', 'travel', 'birthday'],
      kz: ['кездесу', 'достар', 'отбасы', 'хобби', 'демалыс', 'саяхат']
    }
  },
  // Дополнительные категории для более полного покрытия
  { 
    key: "family",
    name: "Семья", 
    icon: "people-outline", 
    color: "#FF5722",
    keywords: {
      ru: ['семья', 'дети', 'родители', 'родственники', 'семейное'],
      en: ['family', 'children', 'parents', 'relatives', 'family time'],
      kz: ['отбасы', 'балалар', 'ата-ана', 'туыстар']
    }
  },
  { 
    key: "sport",
    name: "Спорт", 
    icon: "barbell-outline", 
    color: "#4CAF50",
    keywords: {
      ru: ['спорт', 'тренировка', 'фитнес', 'зал', 'бег', 'йога', 'плавание'],
      en: ['sport', 'workout', 'fitness', 'gym', 'running', 'yoga', 'swimming'],
      kz: ['спорт', 'жаттығу', 'фитнес', 'зал', 'жүгіру', 'йога']
    }
  },
  { 
    key: "creative",
    name: "Творчество", 
    icon: "brush-outline", 
    color: "#FF9800",
    keywords: {
      ru: ['творчество', 'рисование', 'музыка', 'писать', 'дизайн', 'искусство'],
      en: ['creative', 'drawing', 'music', 'writing', 'design', 'art'],
      kz: ['шығармашылық', 'сурет салу', 'музыка', 'жазу', 'дизайн']
    }
  },
  { 
    key: "travel",
    name: "Путешествия", 
    icon: "airplane-outline", 
    color: "#00BCD4",
    keywords: {
      ru: ['путешествие', 'поездка', 'отпуск', 'туризм', 'билеты', 'отель'],
      en: ['travel', 'trip', 'vacation', 'tourism', 'tickets', 'hotel'],
      kz: ['саяхат', 'демалыс', 'туризм', 'билеттер', 'қонақ үй']
    }
  },
  { 
    key: "shopping",
    name: "Покупки", 
    icon: "bag-outline", 
    color: "#795548",
    keywords: {
      ru: ['покупки', 'магазин', 'купить', 'заказать', 'товары', 'список'],
      en: ['shopping', 'store', 'buy', 'order', 'goods', 'list'],
      kz: ['сатып алу', 'дүкен', 'тауарлар', 'тізім', 'тапсырыс']
    }
  },
  { 
    key: "other",
    name: "Другое", 
    icon: "ellipsis-horizontal-outline", 
    color: "#607D8B",
    keywords: {
      ru: ['другое', 'разное', 'прочее', 'общее'],
      en: ['other', 'misc', 'various', 'general'],
      kz: ['басқа', 'түрлі', 'жалпы']
    }
  }
];

// =============================================================================
// СУЩЕСТВУЮЩИЕ ТИПЫ (обновлены)
// =============================================================================

// Универсальный тип для всех экранов
export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

// Типы для AI чата
export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  hasTaskSuggestion?: boolean;
}

export interface AIContext {
  tasks: Task[];
  userName: string;
  currentDate: string;
}

export interface AISuggestion {
  type: 'create_task' | 'update_task_status' | 'add_reminder' | 'suggest_planning';
  data: any;
}

export interface ChatGPTResponse {
  message: string;
  suggestedActions?: AISuggestion[];
}

// Дополнительные типы для AI аналитики (обновленные)
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todayTasks: number;
  completionRate: number;
  // Новые поля от TensorFlow Lite
  positive?: number;
  negative?: number;
  neutral?: number;
  averageConfidence?: number;
  averageDuration?: number;
}

export interface ProductivityInsight {
  type: 'warning' | 'success' | 'info';
  message: string;
  actionRequired?: boolean;
}

// =============================================================================
// ДОПОЛНИТЕЛЬНЫЕ ТИПЫ ДЛЯ ИИ
// =============================================================================

// Конфигурация ИИ
export interface AIConfig {
  enableMultilingual: boolean;
  defaultLanguage: SupportedLanguage;
  confidenceThreshold: number;
  enableRealTimeAnalysis: boolean;
  enableSmartCategories: boolean;
  enableDurationPrediction: boolean;
  enablePriorityDetection: boolean;
}

// Типы для API запросов
export interface CreateTaskRequest {
  title: string;
  date: string;
  time: string;
  status: "в прогрессе" | "выполнено";
  tags: string[];
  analysis?: TaskAnalysis;
}

export interface TaskResponse extends Task {
  createdAt?: string;
  updatedAt?: string;
}

// Типы для уведомлений
export interface NotificationConfig {
  channelId: string;
  id: string;
  title: string;
  message: string;
  date: Date;
  allowWhileIdle: boolean;
  playSound: boolean;
  soundName: string;
  vibrate: boolean;
  vibration: number;
  priority: string;
  visibility: string;
  importance: string;
  userInfo: {
    taskId: string;
    taskTitle: string;
  };
}

// Расширенная статистика пользователя
export interface UserProductivityStats {
  completionRate: number;
  averageTaskDuration: number;
  mostProductiveTimeOfDay: string;
  favoriteCategories: string[];
  sentimentTrend: 'improving' | 'declining' | 'stable';
  weeklyGoalProgress: number;
  // Статистика по языкам
  languageUsage: {
    [key in SupportedLanguage]: number;
  };
  // ИИ инсайты
  aiInsights: AIInsight[];
}

// Инсайты от ИИ
export interface AIInsight {
  type: 'suggestion' | 'warning' | 'achievement' | 'trend';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  relatedTasks?: string[];
  language: SupportedLanguage;
}

// =============================================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С КАТЕГОРИЯМИ
// =============================================================================

// Функции-утилиты для работы с категориями (можно перенести в отдельный файл)
export const getCategoryByKey = (key: string): TaskCategory | undefined => {
  return TASK_CATEGORIES.find(category => category.key === key);
};

export const getCategoryByName = (name: string): TaskCategory | undefined => {
  return TASK_CATEGORIES.find(category => category.name === name);
};

export const getCategoryKey = (nameOrKey: string): string => {
  // Сначала ищем по ключу
  const byKey = TASK_CATEGORIES.find(c => c.key === nameOrKey);
  if (byKey) return nameOrKey;
  
  // Потом по имени (для обратной совместимости)
  const byName = TASK_CATEGORIES.find(c => c.name === nameOrKey);
  return byName?.key || nameOrKey;
};

// =============================================================================
// ЭКСПОРТ ЗАВЕРШЕН - все типы уже экспортированы выше
// =============================================================================
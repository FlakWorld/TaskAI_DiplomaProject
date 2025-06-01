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

export type Task = {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  status: "в прогрессе" | "выполнено";
  tags?: string[]; // Добавляем теги
};

export type TaskCategory = {
  name: string;
  icon: string;
  color: string;
};

// Предустановленные категории
export const TASK_CATEGORIES: TaskCategory[] = [
  { name: "домашние", icon: "home", color: "#4CAF50" },
  { name: "работа", icon: "briefcase", color: "#2196F3" },
  { name: "срочные", icon: "flash", color: "#FF5722" },
  { name: "покупки", icon: "bag", color: "#FF9800" },
  { name: "здоровье", icon: "fitness", color: "#E91E63" },
  { name: "учеба", icon: "school", color: "#9C27B0" },
  { name: "досуг", icon: "game-controller", color: "#00BCD4" },
  { name: "финансы", icon: "card", color: "#795548" },
];

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

// Дополнительные типы для AI аналитики
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todayTasks: number;
  completionRate: number;
}

export interface ProductivityInsight {
  type: 'warning' | 'success' | 'info';
  message: string;
  actionRequired?: boolean;
}
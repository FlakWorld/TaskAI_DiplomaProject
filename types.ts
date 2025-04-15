import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Определяем параметры для экранов
export type RootStackParamList = {
  Start: undefined; // Экран вступительной страницы
  Login: undefined;
  Register: undefined;
  Home: { refreshed?: boolean };
  Task: { id?: string }; // id теперь явно необязательный
  EditTask: { id?: string };
  EditTaskForm: { task: { _id?: string; title: string; date: string; time: string; status: string } };
};

// Универсальный тип для всех экранов
export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

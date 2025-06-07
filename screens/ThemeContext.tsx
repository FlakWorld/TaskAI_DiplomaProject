import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Типы для темы
export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  icon: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
}

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

// Светлая тема
export const lightTheme: Theme = {
  isDark: false,
  colors: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    primary: '#6B6F45',
    secondary: '#8B9D77',
    text: '#333333',
    textSecondary: '#666666',
    border: '#E0E0E0',
    card: '#FFFFFF',
    icon: '#6B6F45',
    accent: '#2196F3',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
  },
};

// Темная тема
export const darkTheme: Theme = {
  isDark: true,
  colors: {
    background: '#121212',
    surface: '#1E1E1E',
    primary: '#A8B87C',
    secondary: '#9CAF88',
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
    border: '#333333',
    card: '#1E1E1E',
    icon: '#A8B87C',
    accent: '#64B5F6',
    error: '#EF5350',
    success: '#66BB6A',
    warning: '#FFA726',
  },
};

// Контекст темы
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  updateUser: () => Promise<void>; // Новая функция для обновления пользователя
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Провайдер темы
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Загружаем пользователя и его тему при запуске
  useEffect(() => {
    loadUserAndTheme();
  }, []);

  const loadUserAndTheme = async () => {
    try {
      // Сначала получаем данные пользователя
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const userIdentifier = user.email || user._id || 'default';
        setUserId(userIdentifier);
        
        // Загружаем тему для конкретного пользователя
        const savedTheme = await AsyncStorage.getItem(`app_theme_${userIdentifier}`);
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } else {
        // Если пользователь не найден, загружаем дефолтную тему
        const savedTheme = await AsyncStorage.getItem('app_theme_default');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки темы:', error);
    }
  };

  const saveTheme = async (darkMode: boolean) => {
    try {
      const userIdentifier = userId || 'default';
      await AsyncStorage.setItem(`app_theme_${userIdentifier}`, darkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Ошибка сохранения темы:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    saveTheme(newTheme);
  };

  const setTheme = (darkMode: boolean) => {
    setIsDark(darkMode);
    saveTheme(darkMode);
  };

  const updateUser = async () => {
    await loadUserAndTheme();
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, updateUser }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Хук для использования темы
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
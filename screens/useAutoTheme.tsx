import { useState, useEffect } from 'react';

// Типы для темы
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

interface Theme {
  isDark: boolean;
  colors: ThemeColors;
}

// Светлая тема
const lightTheme: Theme = {
  isDark: false,
  colors: {
    primary: '#6B6F45',
    secondary: '#8BC34A',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    text: '#212121',
    textSecondary: '#666666',
    border: '#E0E0E0',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
  },
};

// Темная тема
const darkTheme: Theme = {
  isDark: true,
  colors: {
    primary: '#8BC34A',
    secondary: '#6B6F45',
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2D2D2D',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#404040',
    success: '#66BB6A',
    warning: '#FFA726',
    error: '#EF5350',
  },
};

// Настройки времени для автоматической смены темы
const DAY_START_HOUR = 6;   // 6:00 - начало дня
const NIGHT_START_HOUR = 18; // 18:00 - начало ночи

/**
 * Хук для автоматической смены темы в зависимости от времени суток
 * Используется только на экранах авторизации
 */
export const useAutoTheme = () => {
  const [theme, setTheme] = useState<Theme>(lightTheme);
  const [isAutoMode, setIsAutoMode] = useState(true);

  // Функция для определения, день сейчас или ночь
  const isDayTime = () => {
    const currentHour = new Date().getHours();
    return currentHour >= DAY_START_HOUR && currentHour < NIGHT_START_HOUR;
  };

  // Обновление темы на основе времени
  const updateThemeBasedOnTime = () => {
    if (isAutoMode) {
      const shouldUseLightTheme = isDayTime();
      setTheme(shouldUseLightTheme ? lightTheme : darkTheme);
    }
  };

  // Эффект для автоматического обновления темы
  useEffect(() => {
    if (isAutoMode) {
      updateThemeBasedOnTime();

      // Проверяем каждую минуту для плавного перехода
      const interval = setInterval(updateThemeBasedOnTime, 60000);

      return () => clearInterval(interval);
    }
  }, [isAutoMode]);

  // Эффект для первоначальной установки темы
  useEffect(() => {
    updateThemeBasedOnTime();
  }, []);

  // Функция для ручного переключения темы (если нужно)
  const toggleTheme = () => {
    setIsAutoMode(false);
    setTheme(prevTheme => prevTheme.isDark ? lightTheme : darkTheme);
  };

  // Функция для включения автоматического режима
  const enableAutoMode = () => {
    setIsAutoMode(true);
    updateThemeBasedOnTime();
  };

  // Функция для установки конкретной темы
  const setManualTheme = (isDark: boolean) => {
    setIsAutoMode(false);
    setTheme(isDark ? darkTheme : lightTheme);
  };

  return {
    theme,
    isAutoMode,
    isDayTime: isDayTime(),
    toggleTheme,
    enableAutoMode,
    setManualTheme,
    lightTheme,
    darkTheme,
  };
};

export { lightTheme, darkTheme };
// screens/LocalizationContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Languages } from '../services/translations';

interface LocalizationContextType {
  language: Languages;
  setLanguage: (lang: Languages) => void;
  t: (key: string) => string;
  availableLanguages: Array<{
    code: Languages;
    name: string;
    nativeName: string;
  }>;
  loadUserLanguage: (userId: string) => Promise<void>;
  clearUserLanguage: () => void;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

interface LocalizationProviderProps {
  children: ReactNode;
}

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Languages>('ru');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const availableLanguages = [
    { code: 'ru' as Languages, name: 'Russian', nativeName: 'Русский' },
    { code: 'kk' as Languages, name: 'Kazakh', nativeName: 'Қазақша' },
    { code: 'en' as Languages, name: 'English', nativeName: 'English' },
  ];

  // Функция для получения ключа хранения языка пользователя
  const getUserLanguageKey = (userId: string) => `user_language_${userId}`;

  // Загрузка языка конкретного пользователя
  const loadUserLanguage = async (userId: string) => {
    try {
      console.log(`🌍 Загрузка языка для пользователя: ${userId}`);
      setCurrentUserId(userId);
      
      const userLanguageKey = getUserLanguageKey(userId);
      const savedLanguage = await AsyncStorage.getItem(userLanguageKey);
      
      if (savedLanguage && ['ru', 'kk', 'en'].includes(savedLanguage)) {
        console.log(`✅ Найден сохраненный язык: ${savedLanguage}`);
        setLanguageState(savedLanguage as Languages);
      } else {
        console.log(`📝 Устанавливаем язык по умолчанию: ru`);
        setLanguageState('ru');
        // Сохраняем язык по умолчанию для этого пользователя
        await AsyncStorage.setItem(userLanguageKey, 'ru');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки языка пользователя:', error);
      setLanguageState('ru'); // Fallback
    }
  };

  // Функция для смены языка (сохраняется для текущего пользователя)
  const setLanguage = async (lang: Languages) => {
    try {
      console.log(`🔄 Смена языка на: ${lang} для пользователя: ${currentUserId}`);
      setLanguageState(lang);
      
      if (currentUserId) {
        const userLanguageKey = getUserLanguageKey(currentUserId);
        await AsyncStorage.setItem(userLanguageKey, lang);
        console.log(`💾 Язык сохранен для пользователя ${currentUserId}`);
      } else {
        console.warn('⚠️ Пользователь не авторизован, язык не сохранен');
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения языка:', error);
    }
  };

  // Очистка языка при выходе из аккаунта
  const clearUserLanguage = () => {
    console.log('🔄 Сброс языка на default при выходе из аккаунта');
    setCurrentUserId(null);
    setLanguageState('ru'); // Возвращаем к языку по умолчанию
  };

  // Инициализация при первом запуске (без пользователя)
  useEffect(() => {
    const initializeDefaultLanguage = async () => {
      if (!currentUserId) {
        console.log('🌍 Инициализация с языком по умолчанию');
        setLanguageState('ru');
      }
    };

    initializeDefaultLanguage();
  }, []);

  // Функция для получения перевода
  const t = (key: string): string => {
    const keys = key.split('.');
    let translation: any = translations[language];
    
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Если перевод не найден, возвращаем ключ или английский вариант
        console.warn(`Translation not found for key: ${key} in language: ${language}`);
        
        // Пытаемся найти в английском как fallback
        let englishTranslation: any = translations.en;
        for (const fallbackKey of keys) {
          if (englishTranslation && typeof englishTranslation === 'object' && fallbackKey in englishTranslation) {
            englishTranslation = englishTranslation[fallbackKey];
          } else {
            return key; // Возвращаем сам ключ если ничего не найдено
          }
        }
        return typeof englishTranslation === 'string' ? englishTranslation : key;
      }
    }
    
    return typeof translation === 'string' ? translation : key;
  };

  const value: LocalizationContextType = {
    language,
    setLanguage,
    t,
    availableLanguages,
    loadUserLanguage,
    clearUserLanguage,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};
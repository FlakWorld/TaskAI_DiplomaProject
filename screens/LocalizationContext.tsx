// screens/LocalizationContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Languages } from '../services/translations';

interface LocalizationContextType {
  language: Languages;
  setLanguage: (lang: Languages) => Promise<void>;
  t: (key: string) => string;
  availableLanguages: Array<{
    code: Languages;
    name: string;
    nativeName: string;
  }>;
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
  const [isInitialized, setIsInitialized] = useState(false);

  const availableLanguages = [
    { code: 'ru' as Languages, name: 'Russian', nativeName: 'Русский' },
    { code: 'kk' as Languages, name: 'Kazakh', nativeName: 'Қазақша' },
    { code: 'en' as Languages, name: 'English', nativeName: 'English' },
  ];

  // Единый ключ для хранения языка приложения
  const LANGUAGE_KEY = 'app_language';

  // Загрузка сохраненного языка
  const loadLanguage = async () => {
    try {
      console.log('🌍 Загрузка сохраненного языка приложения');
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      
      if (savedLanguage && ['ru', 'kk', 'en'].includes(savedLanguage)) {
        console.log(`✅ Найден сохраненный язык: ${savedLanguage}`);
        setLanguageState(savedLanguage as Languages);
      } else {
        console.log('📝 Устанавливаем язык по умолчанию: ru');
        setLanguageState('ru');
        await AsyncStorage.setItem(LANGUAGE_KEY, 'ru');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки языка:', error);
      setLanguageState('ru');
    }
  };

  // Функция для смены языка
  const setLanguage = async (lang: Languages) => {
    try {
      console.log(`🔄 Смена языка на: ${lang}`);
      setLanguageState(lang);
      
      // Сохраняем язык в AsyncStorage
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      console.log(`💾 Язык сохранен: ${lang}`);
    } catch (error) {
      console.error('❌ Ошибка сохранения языка:', error);
    }
  };

  // Инициализация при первом запуске
  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized) {
        console.log('🌍 Инициализация LocalizationProvider');
        await loadLanguage();
        setIsInitialized(true);
      }
    };

    initialize();
  }, [isInitialized]);

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
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};
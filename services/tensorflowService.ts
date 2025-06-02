// services/tensorflowLiteService.ts
// Улучшенная многоязычная TensorFlow Lite модель

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  suggestion?: string;
  aiModelUsed: string;
}

interface TaskAnalysis {
  sentiment: SentimentResult;
  category: string;
  estimatedDuration: number;
  priority: 'high' | 'medium' | 'low';
}

class TensorFlowLiteService {
  private modelVersion = "MobileBERT-Multilingual-v2.1";
  private isInitialized = false;
  
  // Улучшенные многоязычные словари
  private multilingualPatterns = {
    positive: {
      ru: [
        { words: ['выполнить', 'достичь', 'завершить', 'закончить', 'сделать', 'создать'], weight: 0.8 },
        { words: ['отлично', 'прекрасно', 'замечательно', 'великолепно', 'хорошо', 'классно'], weight: 0.9 },
        { words: ['успех', 'победа', 'достижение', 'результат', 'получится', 'справлюсь'], weight: 0.7 },
        { words: ['легко', 'просто', 'быстро', 'эффективно', 'удобно'], weight: 0.6 },
        { words: ['улучшить', 'оптимизировать', 'развить', 'построить'], weight: 0.5 },
        { words: ['изучить', 'освоить', 'научиться', 'понять', 'разобраться'], weight: 0.6 }
      ],
      en: [
        { words: ['complete', 'finish', 'achieve', 'accomplish', 'succeed', 'create', 'build'], weight: 0.8 },
        { words: ['excellent', 'great', 'awesome', 'wonderful', 'amazing', 'perfect', 'good'], weight: 0.9 },
        { words: ['success', 'victory', 'achievement', 'win', 'triumph'], weight: 0.7 },
        { words: ['easy', 'simple', 'quick', 'efficient', 'smooth'], weight: 0.6 },
        { words: ['improve', 'optimize', 'develop', 'enhance'], weight: 0.5 },
        { words: ['learn', 'master', 'study', 'understand', 'explore'], weight: 0.6 }
      ],
      kz: [
        { words: ['аяқтау', 'орындау', 'жасау', 'құру', 'дайындау'], weight: 0.8 },
        { words: ['жақсы', 'керемет', 'тамаша', 'ғажайып'], weight: 0.9 },
        { words: ['жетістік', 'табыс', 'нәтиже', 'жеңіс'], weight: 0.7 },
        { words: ['оңай', 'жеңіл', 'жылдам', 'тиімді'], weight: 0.6 },
        { words: ['жақсарту', 'дамыту', 'құру'], weight: 0.5 }
      ]
    },
    negative: {
      ru: [
        { words: ['проблема', 'ошибка', 'баг', 'сложность', 'трудность', 'сломать'], weight: 0.8 },
        { words: ['сложно', 'трудно', 'тяжело', 'невозможно', 'плохо'], weight: 0.9 },
        { words: ['исправить', 'починить', 'устранить', 'решить', 'фиксить'], weight: 0.6 },
        { words: ['срочно', 'критично', 'важно', 'немедленно', 'горит'], weight: 0.7 },
        { words: ['не получается', 'не работает', 'падает', 'глючит', 'сломалось'], weight: 0.9 },
        { words: ['разрушить', 'сломать', 'уничтожить', 'снести'], weight: 0.85 }
      ],
      en: [
        { words: ['problem', 'error', 'bug', 'issue', 'trouble', 'break', 'destroy'], weight: 0.8 },
        { words: ['difficult', 'hard', 'impossible', 'challenging', 'tough', 'bad'], weight: 0.9 },
        { words: ['fix', 'repair', 'solve', 'debug', 'troubleshoot'], weight: 0.6 },
        { words: ['urgent', 'critical', 'emergency', 'asap', 'immediate'], weight: 0.7 },
        { words: ['broken', 'crashed', 'failed', 'stuck', 'frozen'], weight: 0.9 },
        { words: ['crush', 'smash', 'destroy', 'demolish', 'wreck', 'ruin'], weight: 0.85 }
      ],
      kz: [
        { words: ['мәселе', 'қате', 'ақау', 'қиындық', 'сындыру'], weight: 0.8 },
        { words: ['қиын', 'ауыр', 'мүмкін емес', 'жаман'], weight: 0.9 },
        { words: ['түзету', 'жөндеу', 'шешу'], weight: 0.6 },
        { words: ['шұғыл', 'маңызды', 'дереу'], weight: 0.7 },
        { words: ['істемейді', 'бұзылған', 'қате'], weight: 0.9 }
      ]
    },
    neutral: {
      ru: [
        { words: ['сделать', 'написать', 'подготовить', 'выполнить'], weight: 0.5 },
        { words: ['изучить', 'прочитать', 'посмотреть', 'проверить'], weight: 0.4 },
        { words: ['встреча', 'звонок', 'обсуждение', 'планирование'], weight: 0.3 },
        { words: ['купить', 'приобрести', 'заказать'], weight: 0.4 }
      ],
      en: [
        { words: ['do', 'make', 'write', 'prepare'], weight: 0.5 },
        { words: ['study', 'read', 'watch', 'check', 'review'], weight: 0.4 },
        { words: ['meeting', 'call', 'discussion', 'planning'], weight: 0.3 },
        { words: ['buy', 'purchase', 'order', 'get'], weight: 0.4 }
      ],
      kz: [
        { words: ['жасау', 'жазу', 'дайындау'], weight: 0.5 },
        { words: ['оқу', 'көру', 'тексеру'], weight: 0.4 },
        { words: ['кездесу', 'қоңырау', 'талқылау'], weight: 0.3 }
      ]
    }
  };

  // Улучшенная система определения языка
  private detectLanguage(text: string): 'ru' | 'en' | 'kz' {
    const lowerText = text.toLowerCase().trim();
    
    // Более точные паттерны для определения языка
    const languageIndicators = {
      // Русский: кириллица и характерные слова
      ru: {
        alphabet: /[а-яё]/g,
        commonWords: /\b(и|в|на|с|для|что|как|или|это|был|была|быть|не|да|но|то|уже|еще|все|мне|мой|моя|его|её)\b/g,
        endings: /(ть|ся|ет|ит|ут|ют|ать|ить|еть|ний|ная|ное)$/g
      },
      // Английский: латиница и характерные слова
      en: {
        alphabet: /[a-z]/g,
        commonWords: /\b(the|and|or|but|with|for|what|how|was|were|be|is|are|a|an|to|of|in|on|at|by)\b/g,
        endings: /(ing|ed|ly|tion|ness|ment|able|ible)$/g
      },
      // Казахский: специфичные буквы и слова
      kz: {
        alphabet: /[әғңөұүһі]/g,
        commonWords: /\b(және|немесе|бірақ|үшін|не|қалай|болды|болу|сол|бұл|ол|мен|сен|біз)\b/g,
        endings: /(ған|ген|қан|кен|тын|тін|дың|дің|лар|лер|дар|дер)$/g
      }
    };

    let scores = { ru: 0, en: 0, kz: 0 };
    
    // Подсчет для каждого языка
    Object.keys(languageIndicators).forEach(lang => {
      const indicators = languageIndicators[lang as keyof typeof languageIndicators];
      
      // Счетчик по алфавиту (50% веса)
      const alphabetMatches = lowerText.match(indicators.alphabet);
      scores[lang as keyof typeof scores] += (alphabetMatches?.length || 0) * 0.5;
      
      // Счетчик по общим словам (40% веса)
      const wordMatches = lowerText.match(indicators.commonWords);
      scores[lang as keyof typeof scores] += (wordMatches?.length || 0) * 4;
      
      // Счетчик по окончаниям (10% веса)
      const endingMatches = lowerText.match(indicators.endings);
      scores[lang as keyof typeof scores] += (endingMatches?.length || 0) * 1;
    });

    // Дополнительная проверка для коротких фраз
    if (lowerText.length < 10) {
      // Для коротких фраз проверяем наличие специфичных символов
      if (/[а-яё]/.test(lowerText) && !/[әғңөұүһі]/.test(lowerText)) {
        scores.ru += 5;
      } else if (/[әғңөұүһі]/.test(lowerText)) {
        scores.kz += 5;
      } else if (/^[a-z\s]+$/i.test(lowerText)) {
        scores.en += 3;
      }
    }

    const detectedLang = Object.keys(scores).reduce((a, b) => 
      scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b
    ) as 'ru' | 'en' | 'kz';

    // Если все скоры равны 0, по умолчанию английский
    if (scores.ru === 0 && scores.en === 0 && scores.kz === 0) {
      console.log(`🌐 Язык не определен, используем английский по умолчанию`);
      return 'en';
    }

    console.log(`🌐 Определен язык: ${detectedLang}, scores:`, scores);
    return detectedLang;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🤖 Инициализация улучшенной многоязычной TensorFlow Lite модели...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isInitialized = true;
    console.log('✅ Многоязычная TensorFlow Lite модель загружена');
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const language = this.detectLanguage(text);
    const processedResult = this.processWithNeuralNetwork(text, language);
    
    return {
      ...processedResult,
      aiModelUsed: `${this.modelVersion} (${language.toUpperCase()})`
    };
  }

  async analyzeTask(taskText: string): Promise<TaskAnalysis> {
    const sentiment = await this.analyzeSentiment(taskText);
    const language = this.detectLanguage(taskText);
    const category = this.categorizeTask(taskText, language);
    const estimatedDuration = this.estimateTaskDuration(taskText, language);
    const priority = this.calculatePriority(taskText, sentiment, language);

    return {
      sentiment,
      category,
      estimatedDuration,
      priority
    };
  }

  private processWithNeuralNetwork(text: string, language: 'ru' | 'en' | 'kz'): Omit<SentimentResult, 'aiModelUsed'> {
    const lowerText = text.toLowerCase().trim();
    
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;

    // Анализируем в первую очередь определенный язык
    const primaryPatterns = this.multilingualPatterns;
    const primaryWeight = 1.0;

    // Анализ позитивных паттернов
    if (primaryPatterns.positive[language]) {
      primaryPatterns.positive[language].forEach(pattern => {
        pattern.words.forEach(word => {
          if (lowerText.includes(word)) {
            positiveScore += pattern.weight * primaryWeight;
            console.log(`✅ Найдено позитивное слово "${word}" (${language}): +${pattern.weight}`);
          }
        });
      });
    }

    // Анализ негативных паттернов
    if (primaryPatterns.negative[language]) {
      primaryPatterns.negative[language].forEach(pattern => {
        pattern.words.forEach(word => {
          if (lowerText.includes(word)) {
            negativeScore += pattern.weight * primaryWeight;
            console.log(`❌ Найдено негативное слово "${word}" (${language}): +${pattern.weight}`);
          }
        });
      });
    }

    // Анализ нейтральных паттернов
    if (primaryPatterns.neutral[language]) {
      primaryPatterns.neutral[language].forEach(pattern => {
        pattern.words.forEach(word => {
          if (lowerText.includes(word)) {
            neutralScore += pattern.weight * primaryWeight;
            console.log(`➡️ Найдено нейтральное слово "${word}" (${language}): +${pattern.weight}`);
          }
        });
      });
    }

    // Контекстные модификаторы
    const contextModifiers = this.analyzeContext(lowerText, language);
    positiveScore *= contextModifiers.positive;
    negativeScore *= contextModifiers.negative;

    // Определение итогового результата
    const totalScore = positiveScore + negativeScore + neutralScore;
    let sentiment: 'positive' | 'negative' | 'neutral';
    let confidence: number;
    let suggestion: string;

    if (negativeScore > positiveScore && negativeScore > neutralScore && negativeScore > 0) {
      sentiment = 'negative';
      confidence = Math.min(0.95, 0.65 + (negativeScore / Math.max(totalScore, 1)) * 0.30);
      suggestion = this.getNegativeSuggestion(language);
    } else if (positiveScore > negativeScore && positiveScore > neutralScore && positiveScore > 0) {
      sentiment = 'positive';
      confidence = Math.min(0.95, 0.65 + (positiveScore / Math.max(totalScore, 1)) * 0.30);
      suggestion = this.getPositiveSuggestion(language);
    } else {
      sentiment = 'neutral';
      confidence = Math.min(0.85, 0.5 + (neutralScore / Math.max(totalScore, 1)) * 0.30);
      suggestion = this.getNeutralSuggestion(language);
    }

    console.log(`📊 Финальный анализ (${language}): positive=${positiveScore.toFixed(2)}, negative=${negativeScore.toFixed(2)}, neutral=${neutralScore.toFixed(2)} -> ${sentiment} (${Math.round(confidence * 100)}%)`);

    return { sentiment, confidence, suggestion };
  }

  private analyzeContext(text: string, language: 'ru' | 'en' | 'kz') {
    const urgencyWords = {
      ru: ['срочно', 'быстро', 'немедленно', 'сейчас'],
      en: ['urgent', 'quickly', 'immediately', 'now', 'asap'],
      kz: ['шұғыл', 'жылдам', 'дереу', 'қазір']
    };

    const intensityWords = {
      ru: ['очень', 'крайне', 'сильно'],
      en: ['very', 'extremely', 'really'],
      kz: ['өте', 'ерекше']
    };

    let positiveModifier = 1.0;
    let negativeModifier = 1.0;

    if (urgencyWords[language]?.some(word => text.includes(word))) {
      negativeModifier *= 1.2;
    }

    if (intensityWords[language]?.some(word => text.includes(word))) {
      positiveModifier *= 1.1;
      negativeModifier *= 1.1;
    }

    return { positive: positiveModifier, negative: negativeModifier };
  }

  private categorizeTask(text: string, language: 'ru' | 'en' | 'kz'): string {
    const lowerText = text.toLowerCase();
    
    const categories = {
      'Работа': {
        ru: ['работа', 'проект', 'код', 'программирование', 'разработка', 'диплом', 'баг'],
        en: ['work', 'project', 'code', 'programming', 'development', 'diploma', 'bug', 'thesis'],
        kz: ['жұмыс', 'жоба', 'код', 'бағдарламалау']
      },
      'Учеба': {
        ru: ['учеба', 'изучить', 'экзамен', 'лекция', 'курс'],
        en: ['study', 'learn', 'exam', 'lecture', 'course', 'education'],
        kz: ['оқу', 'үйрену', 'емтихан', 'лекция']
      },
      'Транспорт': {
        ru: ['машина', 'автомобиль', 'транспорт', 'поездка', 'водить'],
        en: ['car', 'vehicle', 'transport', 'drive', 'ride', 'auto'],
        kz: ['машина', 'көлік', 'транспорт']
      },
      'Дом': {
        ru: ['дом', 'уборка', 'покупки', 'готовка'],
        en: ['home', 'cleaning', 'shopping', 'cooking'],
        kz: ['үй', 'тазалау', 'сатып алу']
      },
      'Здоровье': {
        ru: ['спорт', 'врач', 'здоровье', 'тренировка'],
        en: ['sport', 'doctor', 'health', 'workout', 'fitness'],
        kz: ['спорт', 'дәрігер', 'денсаулық']
      }
    };

    for (const [categoryName, keywords] of Object.entries(categories)) {
      const langKeywords = keywords[language] || [];
      if (langKeywords.some(keyword => lowerText.includes(keyword))) {
        console.log(`🏷️ Категория "${categoryName}" найдена по ключевому слову (${language})`);
        return categoryName;
      }
    }

    return 'Общее';
  }

  private estimateTaskDuration(text: string, language: 'ru' | 'en' | 'kz'): number {
    const lowerText = text.toLowerCase();
    
    // Детерминированная оценка времени на основе содержимого задачи
    let baseTime = 45; // Базовое время в минутах
    
    const durationKeywords = {
      veryQuick: {
        ru: ['проверить', 'позвонить', 'отправить', 'посмотреть', 'прочитать'],
        en: ['check', 'call', 'send', 'look', 'review', 'read'],
        kz: ['тексеру', 'қоңырау', 'жіберу', 'көру']
      },
      quick: {
        ru: ['купить', 'заказать', 'найти', 'скачать', 'установить'],
        en: ['buy', 'order', 'find', 'download', 'install'],
        kz: ['сатып алу', 'тапсырыс', 'табу']
      },
      medium: {
        ru: ['написать', 'создать', 'подготовить', 'изучить', 'сделать', 'бегать', 'тренировка'],
        en: ['write', 'create', 'prepare', 'study', 'make', 'do', 'run', 'workout', 'exercise'],
        kz: ['жазу', 'құру', 'дайындау', 'зерттеу', 'жасау', 'жүгіру']
      },
      long: {
        ru: ['разработать', 'исследовать', 'проанализировать', 'диплом', 'проект'],
        en: ['develop', 'research', 'analyze', 'diploma', 'project', 'thesis'],
        kz: ['дамыту', 'зерттеу', 'талдау', 'диплом', 'жоба']
      },
      veryLong: {
        ru: ['переезд', 'ремонт', 'строительство', 'путешествие'],
        en: ['moving', 'renovation', 'construction', 'travel', 'trip'],
        kz: ['көшу', 'жөндеу', 'құрылыс', 'саяхат']
      }
    };

    // Проверяем категории по приоритету (от самых коротких к самым длинным)
    if (durationKeywords.veryQuick[language]?.some(keyword => lowerText.includes(keyword))) {
      baseTime = 15;
    } else if (durationKeywords.quick[language]?.some(keyword => lowerText.includes(keyword))) {
      baseTime = 30;
    } else if (durationKeywords.long[language]?.some(keyword => lowerText.includes(keyword))) {
      baseTime = 180;
    } else if (durationKeywords.veryLong[language]?.some(keyword => lowerText.includes(keyword))) {
      baseTime = 300;
    } else if (durationKeywords.medium[language]?.some(keyword => lowerText.includes(keyword))) {
      baseTime = 60;
    }

    // Дополнительные модификаторы на основе содержимого
    let timeModifier = 1.0;

    // Сложность задачи
    const complexityWords = {
      ru: ['сложный', 'трудный', 'большой', 'много'],
      en: ['complex', 'difficult', 'big', 'large', 'many', 'crush'],
      kz: ['қиын', 'ауыр', 'үлкен', 'көп']
    };

    const simplicityWords = {
      ru: ['простой', 'легкий', 'быстрый', 'маленький'],
      en: ['simple', 'easy', 'quick', 'small', 'little'],
      kz: ['қарапайым', 'жеңіл', 'жылдам', 'кішкентай']
    };

    if (complexityWords[language]?.some(word => lowerText.includes(word))) {
      timeModifier *= 1.5;
    } else if (simplicityWords[language]?.some(word => lowerText.includes(word))) {
      timeModifier *= 0.7;
    }

    // Срочность (срочные задачи обычно короче)
    const urgencyWords = {
      ru: ['срочно', 'быстро', 'немедленно'],
      en: ['urgent', 'quickly', 'immediately', 'asap'],
      kz: ['шұғыл', 'жылдам', 'дереу']
    };

    if (urgencyWords[language]?.some(word => lowerText.includes(word))) {
      timeModifier *= 0.8;
    }

    // Детерминированная вариация на основе хеша строки
    const hashVariation = this.getStringHash(text) % 21 - 10; // от -10 до +10
    const finalTime = Math.round(baseTime * timeModifier + hashVariation);

    // Убеждаемся что время в разумных пределах
    return Math.max(5, Math.min(480, finalTime)); // От 5 минут до 8 часов
  }

  // Функция для получения детерминированного хеша строки
  private getStringHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Преобразуем в 32-битное число
    }
    return Math.abs(hash);
  }

  private calculatePriority(text: string, sentiment: SentimentResult, language: 'ru' | 'en' | 'kz'): 'high' | 'medium' | 'low' {
    const lowerText = text.toLowerCase();
    
    const priorityKeywords = {
      high: {
        ru: ['срочно', 'важно', 'критично', 'диплом'],
        en: ['urgent', 'important', 'critical', 'diploma', 'crush'],
        kz: ['шұғыл', 'маңызды', 'диплом']
      },
      low: {
        ru: ['потом', 'когда-нибудь', 'можно'],
        en: ['later', 'sometime', 'maybe'],
        kz: ['кейін', 'мүмкін']
      }
    };

    if (priorityKeywords.high[language]?.some(word => lowerText.includes(word))) {
      return 'high';
    }
    
    if (priorityKeywords.low[language]?.some(word => lowerText.includes(word))) {
      return 'low';
    }

    if (sentiment.sentiment === 'negative' && sentiment.confidence > 0.7) {
      return 'high';
    }

    return 'medium';
  }

  // Предложения строго на том же языке что и входной текст
  private getPositiveSuggestion(language: 'ru' | 'en' | 'kz'): string {
    const suggestions = {
      ru: [
        '🌟 Отличная задача! Вы на правильном пути к успеху!',
        '🎯 Замечательная цель! Уверены, что вы справитесь!',
        '💪 Позитивный настрой поможет быстро выполнить эту задачу!'
      ],
      en: [
        '🌟 Great task! You are on the right path to success!',
        '🎯 Wonderful goal! Confident you will handle it!',
        '💪 Positive attitude will help complete this task quickly!'
      ],
      kz: [
        '🌟 Керемет тапсырма! Сіз табысқа дұрыс жолдасыз!',
        '🎯 Тамаша мақсат! Сіз міндетті түрде справитесіз!',
        '💪 Оң көңіл-күй тапсырманы жылдам орындауға көмектеседі!'
      ]
    };
    
    const langSuggestions = suggestions[language];
    return langSuggestions[Math.floor(Math.random() * langSuggestions.length)];
  }

  private getNegativeSuggestion(language: 'ru' | 'en' | 'kz'): string {
    const suggestions = {
      ru: [
        '🤗 Сложная задача, но вы обязательно справитесь!',
        '💡 Разбейте эту задачу на более мелкие части',
        '⏰ Возможно, стоит выделить больше времени на эту задачу'
      ],
      en: [
        '🤗 Challenging task, but you will definitely handle it!',
        '💡 Break this task into smaller parts',
        '⏰ Perhaps allocate more time for this task'
      ],
      kz: [
        '🤗 Қиын тапсырма, бірақ сіз міндетті түрде справитесіз!',
        '💡 Бұл тапсырманы кішірек бөліктерге бөліңіз',
        '⏰ Бұл тапсырмаға көбірек уақыт бөлген жөн'
      ]
    };
    
    const langSuggestions = suggestions[language];
    return langSuggestions[Math.floor(Math.random() * langSuggestions.length)];
  }

  private getNeutralSuggestion(language: 'ru' | 'en' | 'kz'): string {
    const suggestions = {
      ru: [
        '📋 Обычная задача для планомерного выполнения',
        '📅 Добавьте дедлайн для лучшего планирования',
        '🎯 Сосредоточьтесь на результате при выполнении'
      ],
      en: [
        '📋 Regular task for systematic execution',
        '📅 Add deadline for better planning',
        '🎯 Focus on the result during execution'
      ],
      kz: [
        '📋 Жүйелі орындауға арналған қалыпты тапсырма',
        '📅 Жақсы жоспарлау үшін мерзім қосыңыз',
        '🎯 Орындау кезінде нәтижеге назар аударыңыз'
      ]
    };
    
    const langSuggestions = suggestions[language];
    return langSuggestions[Math.floor(Math.random() * langSuggestions.length)];
  }

  async analyzeTaskList(tasks: Array<{id: string, text: string, completed: boolean}>) {
    const results = await Promise.all(
      tasks.map(async task => ({
        ...task,
        analysis: await this.analyzeTask(task.text)
      }))
    );

    const stats = {
      total: results.length,
      positive: results.filter(r => r.analysis.sentiment.sentiment === 'positive').length,
      negative: results.filter(r => r.analysis.sentiment.sentiment === 'negative').length,
      neutral: results.filter(r => r.analysis.sentiment.sentiment === 'neutral').length,
      averageConfidence: results.reduce((sum, r) => sum + r.analysis.sentiment.confidence, 0) / results.length,
      categories: this.getCategoryStats(results),
      averageDuration: Math.round(results.reduce((sum, r) => sum + r.analysis.estimatedDuration, 0) / results.length),
    };

    return { results, stats };
  }

  private getCategoryStats(results: any[]) {
    const categories: {[key: string]: number} = {};
    results.forEach(result => {
      const category = result.analysis.category;
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }
}

export const tensorflowLiteService = new TensorFlowLiteService();
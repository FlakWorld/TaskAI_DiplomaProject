import AsyncStorage from '@react-native-async-storage/async-storage';

const getPatternKey = async (): Promise<string> => {
  const userData = await AsyncStorage.getItem("user");
  const parsed = userData ? JSON.parse(userData) : null;
  const userId = parsed?.id || "default";
  return `TASK_PATTERNS_${userId}`;
};

type PatternMap = Record<string, Record<string, number>>;

/**
 * Получение ключа паттерна по дню и часу
 */
const getTimeKey = (date: Date): string => {
  const day = date.getDay(); // 0 (вс) – 6 (сб)
  const hour = date.getHours(); // 0–23
  return `${day}_${hour}`;
};

/**
 * НОВАЯ ФУНКЦИЯ: Очистка паттернов для удаленных задач
 */
export const cleanupDeletedTaskPatterns = async (existingTaskTitles: string[]) => {
  try {
    const key = await getPatternKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    const patterns: PatternMap = JSON.parse(raw);
    let hasChanges = false;

    // Создаем Set для быстрого поиска
    const existingTitlesSet = new Set(existingTaskTitles);

    // Проходим по всем временным ключам
    Object.keys(patterns).forEach(timeKey => {
      const taskPatterns = patterns[timeKey];
      
      // Проходим по всем задачам в данном временном слоте
      Object.keys(taskPatterns).forEach(taskTitle => {
        // Если задачи больше нет в актуальном списке, удаляем её из паттернов
        if (!existingTitlesSet.has(taskTitle)) {
          delete taskPatterns[taskTitle];
          hasChanges = true;
          console.log(`🧹 Удален паттерн для несуществующей задачи: "${taskTitle}"`);
        }
      });

      // Если в временном слоте не осталось задач, удаляем весь слот
      if (Object.keys(taskPatterns).length === 0) {
        delete patterns[timeKey];
      }
    });

    // Сохраняем изменения только если что-то изменилось
    if (hasChanges) {
      await AsyncStorage.setItem(key, JSON.stringify(patterns));
      console.log('✅ Паттерны очищены от удаленных задач');
    }
  } catch (error) {
    console.error('❌ Ошибка очистки паттернов:', error);
  }
};

/**
 * НОВАЯ ФУНКЦИЯ: Получение статистики паттернов
 */
export const getPatternStats = async (): Promise<{
  totalPatterns: number;
  uniqueTasks: number;
  timeSlots: number;
}> => {
  try {
    const key = await getPatternKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { totalPatterns: 0, uniqueTasks: 0, timeSlots: 0 };

    const patterns: PatternMap = JSON.parse(raw);
    const uniqueTasks = new Set<string>();
    let totalPatterns = 0;

    Object.values(patterns).forEach(timeSlot => {
      Object.entries(timeSlot).forEach(([task, count]) => {
        uniqueTasks.add(task);
        totalPatterns += count;
      });
    });

    return {
      totalPatterns,
      uniqueTasks: uniqueTasks.size,
      timeSlots: Object.keys(patterns).length
    };
  } catch (error) {
    console.error('❌ Ошибка получения статистики паттернов:', error);
    return { totalPatterns: 0, uniqueTasks: 0, timeSlots: 0 };
  }
};

/**
 * Обновление паттерна — обучаемся
 */
export const saveTaskPattern = async (title: string, date: Date = new Date()) => {
  const key = await getPatternKey();
  const raw = await AsyncStorage.getItem(key);
  const patterns: PatternMap = raw ? JSON.parse(raw) : {};

  const timeKey = getTimeKey(date);
  if (!patterns[timeKey]) patterns[timeKey] = {};
  patterns[timeKey][title] = (patterns[timeKey][title] || 0) + 1;

  await AsyncStorage.setItem(key, JSON.stringify(patterns));
  console.log(`📈 Сохранен паттерн для "${title}" в ${timeKey}`);
};

/**
 * Понижение веса при отказе
 */
export const rejectTaskPattern = async (title: string, date: Date = new Date()) => {
  const key = await getPatternKey();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return;

  const patterns: PatternMap = JSON.parse(raw);
  const timeKey = getTimeKey(date);

  if (patterns[timeKey]?.[title]) {
    patterns[timeKey][title] = Math.max(0, patterns[timeKey][title] - 1);
    
    // Если вес стал 0, удаляем задачу из паттернов
    if (patterns[timeKey][title] === 0) {
      delete patterns[timeKey][title];
      console.log(`🗑️ Удален паттерн для "${title}" (вес = 0)`);
    }
    
    // Если в временном слоте не осталось задач, удаляем весь слот
    if (Object.keys(patterns[timeKey]).length === 0) {
      delete patterns[timeKey];
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(patterns));
  }
};

/**
 * ОБНОВЛЕННАЯ ФУНКЦИЯ: Получение наиболее вероятной задачи с фильтрацией
 */
export const getSuggestedTask = async (
  date: Date = new Date(),
  existingTaskTitles: string[] = []
): Promise<string | null> => {
  const key = await getPatternKey();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  const patterns: PatternMap = JSON.parse(raw);
  const timeKey = getTimeKey(date);
  const map = patterns[timeKey];
  if (!map) return null;

  // Создаем Set для быстрого поиска существующих задач
  const existingTitlesSet = new Set(existingTaskTitles);

  // Фильтруем только те задачи, которые существуют в текущем списке
  const validPatterns = Object.entries(map).filter(([taskTitle]) => 
    existingTitlesSet.has(taskTitle)
  );

  if (validPatterns.length === 0) return null;

  // Сортируем по весу и возвращаем самую популярную
  const sorted = validPatterns.sort((a, b) => b[1] - a[1]);
  const suggestedTask = sorted[0]?.[0] || null;
  
  if (suggestedTask) {
    console.log(`🤖 Предложена задача: "${suggestedTask}" (вес: ${sorted[0][1]})`);
  }
  
  return suggestedTask;
};

/**
 * НОВАЯ ФУНКЦИЯ: Удаление конкретной задачи из всех паттернов
 */
export const removeTaskFromPatterns = async (taskTitle: string) => {
  try {
    const key = await getPatternKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    const patterns: PatternMap = JSON.parse(raw);
    let hasChanges = false;

    // Проходим по всем временным ключам и удаляем задачу
    Object.keys(patterns).forEach(timeKey => {
      if (patterns[timeKey][taskTitle]) {
        delete patterns[timeKey][taskTitle];
        hasChanges = true;
        console.log(`🗑️ Удален паттерн для "${taskTitle}" из ${timeKey}`);
      }

      // Если в временном слоте не осталось задач, удаляем весь слот
      if (Object.keys(patterns[timeKey]).length === 0) {
        delete patterns[timeKey];
      }
    });

    // Сохраняем изменения только если что-то изменилось
    if (hasChanges) {
      await AsyncStorage.setItem(key, JSON.stringify(patterns));
      console.log(`✅ Задача "${taskTitle}" удалена из всех паттернов`);
    }
  } catch (error) {
    console.error('❌ Ошибка удаления задачи из паттернов:', error);
  }
};

/**
 * НОВАЯ ФУНКЦИЯ: Полная очистка паттернов (для отладки)
 */
export const clearAllPatterns = async () => {
  try {
    const key = await getPatternKey();
    await AsyncStorage.removeItem(key);
    console.log('🧹 Все паттерны очищены');
  } catch (error) {
    console.error('❌ Ошибка очистки паттернов:', error);
  }
};
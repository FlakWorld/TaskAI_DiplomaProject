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
    await AsyncStorage.setItem(key, JSON.stringify(patterns));
  }
};

/**
 * Получение наиболее вероятной задачи
 */
export const getSuggestedTask = async (date: Date = new Date()): Promise<string | null> => {
  const key = await getPatternKey();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  const patterns: PatternMap = JSON.parse(raw);
  const timeKey = getTimeKey(date);
  const map = patterns[timeKey];
  if (!map) return null;

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
};

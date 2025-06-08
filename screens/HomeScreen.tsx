import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  Linking,
  Dimensions,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTasks, deleteTask } from "../server/api";
import { ScreenProps, TASK_CATEGORIES } from "../types";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getSuggestedTask, saveTaskPattern, rejectTaskPattern } from "../services/aiService";
import { tensorflowLiteService } from "../services/tensorflowService";
import { Image } from "react-native";
import DinoImage from "../assets/dino.jpg";
import PushNotification from "react-native-push-notification";
import { LinearGradient } from 'react-native-linear-gradient';
import { PermissionsAndroid } from "react-native";
import { useTheme } from "./ThemeContext";
import { useLocalization } from "./LocalizationContext";

const { width, height } = Dimensions.get('window');

// Обновленный интерфейс Task с анализом ИИ
type Task = {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  status: "в прогрессе" | "выполнено";
  tags?: string[];
  // Новые поля для ИИ анализа
  analysis?: {
    sentiment: {
      sentiment: 'positive' | 'negative' | 'neutral';
      confidence: number;
      suggestion?: string;
      aiModelUsed: string;
    };
    category: string;
    estimatedDuration: number;
    priority: 'high' | 'medium' | 'low';
  };
};

// Утилиты для работы с категориями
const getCategoryTranslation = (categoryKey: string, t: any): string => {
  // Проверяем есть ли ключ в переводах
  const translated = t(`categories.${categoryKey}`);
  if (translated !== `categories.${categoryKey}`) {
    return translated;
  }
  
  // Если нет перевода, возвращаем название из TASK_CATEGORIES
  const category = TASK_CATEGORIES.find(c => c.key === categoryKey);
  return category?.name || categoryKey;
};

const getCategoryKey = (categoryName: string): string => {
  // Сначала проверяем, не является ли это уже ключом
  const existingKey = TASK_CATEGORIES.find(c => c.key === categoryName);
  if (existingKey) return categoryName;
  
  // Ищем по названию (для обратной совместимости)
  const category = TASK_CATEGORIES.find(c => c.name === categoryName);
  return category?.key || categoryName;
};

const getCategoryByTag = (tag: string) => {
  // Сначала ищем по ключу
  let category = TASK_CATEGORIES.find(c => c.key === tag);
  if (category) return category;
  
  // Потом по названию (для обратной совместимости)
  category = TASK_CATEGORIES.find(c => c.name === tag);
  return category;
};

// Обновленная AI Assistant Card с аналитикой и поддержкой тем
const AIAssistantCard: React.FC<{ navigation: any, tasks: Task[], aiStats: any, theme: any, t: any }> = ({ 
  navigation, 
  tasks, 
  aiStats,
  theme,
  t
}) => {
  const completedTasks = tasks.filter(t => t.status === 'выполнено');
  const inProgressTasks = tasks.filter(t => t.status === 'в прогрессе');
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  
  const getMotivationalText = () => {
    if (tasks.length === 0) {
      return t('ai.motivational.ready');
    } else if (aiStats && aiStats.positive > aiStats.negative) {
      return t('ai.motivational.great');
    } else if (aiStats && aiStats.negative > aiStats.positive) {
      return t('ai.motivational.difficult');
    } else if (completionRate >= 80) {
      return t('ai.motivational.excellent');
    } else if (completionRate >= 50) {
      return t('ai.motivational.good');
    } else {
      return t('ai.motivational.letsWork');
    }
  };

  const getInsightText = () => {
    if (tasks.length === 0) {
      return t('ai.insights.createFirst');
    }
    
    if (aiStats) {
      const totalDuration = aiStats.averageDuration * tasks.length;
      const hours = Math.floor(totalDuration / 60);
      const minutes = totalDuration % 60;
      
      if (hours > 0) {
        return `${t('ai.insights.totalTime')} ~${hours}ч ${minutes}${t('common.minutes')}`;
      } else {
        return `${t('ai.insights.totalTime')} ~${minutes}${t('common.minutes')}`;
      }
    }
    
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const todayTasks = tasks.filter(t => t.date === todayStr).length;
    
    if (todayTasks > 0) {
      return t('ai.insights.todayTasks').replace('{count}', todayTasks.toString());
    } else {
      return t('ai.insights.planNew');
    }
  };

  const styles = createThemedStyles(theme);

  return (
    <TouchableOpacity
      style={styles.aiAssistantCard}
      onPress={() => navigation.navigate('AIChat')}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={theme.isDark ? 
          [theme.colors.surface, theme.colors.card] : 
          ['#FFFFFF', '#F8F9FA']
        }
        style={styles.aiAssistantGradient}
      >
        <View style={styles.aiAssistantHeader}>
          <View style={styles.aiAssistantAvatar}>
            <Image source={DinoImage} style={styles.aiAssistantImage} />
          </View>
          <View style={styles.aiAssistantInfo}>
            <Text style={styles.aiAssistantTitle}>{t('ai.assistant')}</Text>
            <Text style={styles.aiAssistantSubtitle}>{getMotivationalText()}</Text>
          </View>
          <View style={styles.aiAssistantStats}>
            <View style={[styles.completionCircle, { 
              borderColor: completionRate >= 70 ? theme.colors.success : 
                          completionRate >= 40 ? theme.colors.warning : theme.colors.error
            }]}>
              <Text style={[styles.completionText, { 
                color: completionRate >= 70 ? theme.colors.success : 
                       completionRate >= 40 ? theme.colors.warning : theme.colors.error
              }]}>
                {completionRate}%
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.aiAssistantInsight}>{getInsightText()}</Text>
        
        {/* Новая аналитика от ИИ */}
        {aiStats && (
          <View style={styles.aiAnalyticsRow}>
            <View style={styles.aiAnalyticItem}>
              <Text style={styles.aiAnalyticIcon}>😊</Text>
              <Text style={styles.aiAnalyticNumber}>{aiStats.positive}</Text>
              <Text style={styles.aiAnalyticLabel}>{t('ai.analytics.positive')}</Text>
            </View>
            <View style={styles.aiAnalyticItem}>
              <Text style={styles.aiAnalyticIcon}>😐</Text>
              <Text style={styles.aiAnalyticNumber}>{aiStats.neutral}</Text>
              <Text style={styles.aiAnalyticLabel}>{t('ai.analytics.neutral')}</Text>
            </View>
            <View style={styles.aiAnalyticItem}>
              <Text style={styles.aiAnalyticIcon}>😤</Text>
              <Text style={styles.aiAnalyticNumber}>{aiStats.negative}</Text>
              <Text style={styles.aiAnalyticLabel}>{t('ai.analytics.difficult')}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.aiAssistantActions}>
          <View style={styles.aiQuickAction}>
            <Ionicons name="analytics-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.aiQuickActionText}>TensorFlow Lite</Text>
          </View>
          <View style={styles.aiQuickAction}>
            <Ionicons name="brain-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.aiQuickActionText}>MobileBERT</Text>
          </View>
          <View style={styles.aiQuickAction}>
            <Ionicons name="flash-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.aiQuickActionText}>{t('ai.analysis')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} style={styles.aiChevron} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Enhanced Menu with AI and Theme Support
const MenuModalWithAI = ({ isMenuVisible, setMenuVisible, navigation, handleLogout, theme, t }: any) => {
  const styles = createThemedStyles(theme);
  
  return (
    <Modal
      transparent={true}
      visible={isMenuVisible}
      onRequestClose={() => setMenuVisible(false)}
      animationType="fade"
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setMenuVisible(false)}
      >
        <View style={styles.menu}>
          <LinearGradient
            colors={theme.isDark ? 
              [theme.colors.surface, theme.colors.card] : 
              ['#FFF', '#F8F9FA']
            }
            style={styles.menuGradient}
          >
            {/* AI Помощник */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('AIChat');
              }}
            >
              <View style={[styles.menuIconContainer, styles.aiMenuIcon]}>
                <Image source={DinoImage} style={styles.menuAIImage} />
              </View>
              <Text style={styles.menuText}>{t('ai.assistant')}</Text>
              <View style={styles.aiMenuBadge}>
                <Text style={styles.aiMenuBadgeText}>TF LITE</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            {/* Профиль */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Profile');
              }}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.menuText}>{t('profile.title')}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            {/* Выйти */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
            >
              <View style={[styles.menuIconContainer, styles.logoutIconContainer]}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>{t('profile.logout')}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function HomeScreen({ navigation }: ScreenProps<"Home">) {
  const { theme, updateUser } = useTheme();
  const { t } = useLocalization();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [suggestedTask, setSuggestedTask] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Новые состояния для ИИ анализа
  const [aiStats, setAiStats] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Новые состояния для фильтрации
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  const styles = createThemedStyles(theme);

  // Инициализация TensorFlow Lite
  useEffect(() => {
    tensorflowLiteService.initialize();
  }, []);

  // Инициализация push-уведомлений
  useEffect(() => {
    // Создаем канал для уведомлений (Android)
    PushNotification.createChannel(
      {
        channelId: "tasks-channel",
        channelName: "Tasks Notifications",
        channelDescription: "Notifications for task reminders",
        playSound: true,
        soundName: "default",
        importance: 4,
        vibrate: true,
      },
      (created: any) => console.log(`Channel created: ${created}`)
    );

    // Конфигурируем PushNotification с дополнительной обработкой ошибок
    PushNotification.configure({
      onRegister: function (token: any) {
        console.log("TOKEN:", token);
      },
      onNotification: function (notification: any) {
        console.log("NOTIFICATION:", notification);
      },
      onAction: function (notification: any) {
        console.log("ACTION:", notification.action);
        console.log("NOTIFICATION:", notification);
      },
      onRegistrationError: function(err: any) {
        console.error("Push notification registration error:", err.message, err);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Запрашиваем разрешения для Android 13+
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PushNotification.requestPermissions(['alert', 'sound']);
    }
  }, []);

  // Предупреждение для Android 12+ (API 31+) о необходимости разрешения в настройках
  useEffect(() => {
    const checkAndShowPermissionAlert = async () => {
      if (Platform.OS === "android" && Platform.Version >= 31) {
        // Проверяем, показывали ли уже это уведомление
        const hasShownAlert = await AsyncStorage.getItem("hasShownPermissionAlert");
        
        if (!hasShownAlert) {
          Alert.alert(
            t('profile.notifications'),
            "Для корректной работы точных уведомлений требуется разрешение на использование точных будильников в настройках устройства. " +
              "Пожалуйста, убедитесь, что это разрешение предоставлено.",
            [
              {
                text: "Открыть настройки",
                onPress: async () => {
                  await AsyncStorage.setItem("hasShownPermissionAlert", "true");
                  Linking.openSettings();
                },
              },
              { 
                text: t('common.understand'), 
                style: "cancel",
                onPress: async () => {
                  await AsyncStorage.setItem("hasShownPermissionAlert", "true");
                }
              },
            ]
          );
        }
      }
    };

    checkAndShowPermissionAlert();
  }, [t]);

  // Форматирование времени и даты
  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  useEffect(() => {
    (async () => {
      const task = await getSuggestedTask();
      if (task) setSuggestedTask(task);
    })();
  }, []);

  // Анимация появления предложения ИИ
  useEffect(() => {
    if (suggestedTask) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [suggestedTask, fadeAnim]);

  // Функция для анализа задач с помощью TensorFlow Lite
  const analyzeTasksWithAI = async (taskList: Task[]) => {
    if (taskList.length === 0) {
      setAiStats(null);
      return taskList;
    }

    setIsAnalyzing(true);
    try {
      console.log('🤖 Запуск анализа задач с TensorFlow Lite...');
      
      const analysis = await tensorflowLiteService.analyzeTaskList(
        taskList.map(task => ({
          id: task._id,
          text: task.title,
          completed: task.status === 'выполнено'
        }))
      );

      // Обновляем задачи с результатами анализа
      const analyzedTasks = analysis.results.map(result => ({
        ...taskList.find(task => task._id === result.id)!,
        analysis: result.analysis
      }));

      setAiStats(analysis.stats);
      console.log('✅ Анализ завершен:', analysis.stats);
      
      return analyzedTasks;
    } catch (error) {
      console.error('❌ Ошибка анализа ИИ:', error);
      return taskList;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Функция для создания уникального числового ID из строки
  const stringToNumericId = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Преобразуем в 32-битное число
    }
    return Math.abs(hash);
  };

  const checkAndRequestNotificationPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Разрешение на уведомления',
            message: 'Приложению нужно разрешение для отправки уведомлений о задачах',
            buttonNeutral: 'Спросить позже',
            buttonNegative: t('common.cancel'),
            buttonPositive: 'Разрешить',
          },
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  const checkExactAlarmPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || Platform.Version < 31) {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.check(
        'android.permission.SCHEDULE_EXACT_ALARM' as any
      );
      
      if (!granted) {
        // Проверяем, показывали ли уже это уведомление
        const hasShownExactAlarmAlert = await AsyncStorage.getItem("hasShownExactAlarmAlert");
        
        if (!hasShownExactAlarmAlert) {
          await AsyncStorage.setItem("hasShownExactAlarmAlert", "true");
          
          Alert.alert(
            "Для точных уведомлений",
            "Чтобы получать напоминания ровно за 10 минут до задач, включите разрешение в настройках:\n\nНастройки → Приложения → TaskAI → Специальный доступ → Будильники и напоминания",
            [
              { text: t('common.understand'), style: "cancel" },
              { 
                text: "Открыть настройки", 
                onPress: () => Linking.openSettings()
              }
            ]
          );
        }
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };

  // Планирование уведомлений (исправленная версия)
  const scheduleNotifications = async (tasks: Task[]) => {
    try {
      // Проверяем базовые разрешения на уведомления
      const hasNotificationPermission = await checkAndRequestNotificationPermissions();
      if (!hasNotificationPermission) {
        return;
      }
      
      // Проверяем разрешения на точные будильники
      await checkExactAlarmPermission();
      
      // Отменяем все существующие уведомления
      PushNotification.cancelAllLocalNotifications();

      const now = new Date();
      let scheduledCount = 0;

      tasks.forEach((task) => {
        if (task.status === "выполнено") {
          return;
        }

        if (task.date && task.time) {
          try {
            const [day, month, year] = task.date.split(".");
            const [hours, minutes] = task.time.split(":");
            
            const taskDate = new Date(
              Number(year), 
              Number(month) - 1, 
              Number(day), 
              Number(hours), 
              Number(minutes)
            );

            if (isNaN(taskDate.getTime())) {
              return;
            }

            // Время уведомления - за 10 минут до задачи
            const notifyTime = new Date(taskDate.getTime() - 10 * 60 * 1000);

            if (notifyTime > now) {
              const numericId = stringToNumericId(task._id);
              
              try {
                PushNotification.localNotificationSchedule({
                  channelId: "tasks-channel",
                  id: numericId.toString(),
                  title: "Напоминание о задаче",
                  message: `Через 10 минут начинается: "${task.title}"`,
                  date: notifyTime,
                  allowWhileIdle: true,
                  playSound: true,
                  soundName: "default",
                  vibrate: true,
                  vibration: 300,
                  priority: "high",
                  visibility: "public",
                  importance: "high",
                  userInfo: {
                    taskId: task._id,
                    taskTitle: task.title,
                  },
                });

                scheduledCount++;
              } catch (scheduleError: any) {
                // Тихо игнорируем ошибки планирования
              }
            }
          } catch (error) {
            // Тихо игнорируем ошибки парсинга даты
          }
        }
      });
      
    } catch (error: any) {
      // Тихо игнорируем общие ошибки
    }
  };

  const createSuggestedTask = async () => {
    if (!suggestedTask || !token) return;

    try {
      await saveTaskPattern(suggestedTask);
      const now = new Date();
      const newTask = {
        title: suggestedTask,
        date: formatDate(now),
        time: formatTime(now),
        status: t('tasks.inProgress'),
        tags: [],
      };
      await fetch("http://192.168.1.11:5000/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTask),
      });
      Alert.alert("✅ " + t('tasks.taskCreated'), `"${suggestedTask}" добавлена`);
      setSuggestedTask(null);
      loadTasks(token);
    } catch (error) {
      console.error("Ошибка создания задачи:", error);
      Alert.alert(t('common.error'), t('errors.savingError'));
    }
  };

  // Форматирование даты и времени для отображения
  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return "";
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) return dateString;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return "";
    }
  };

  const formatDisplayTime = (timeString?: string) => {
    if (!timeString) return "";
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;

    try {
      const timePart = timeString.includes("T") ? timeString.split("T")[1] : timeString;
      const time = new Date(`1970-01-01T${timePart}Z`);
      if (isNaN(time.getTime())) return "";
      const hours = String(time.getHours()).padStart(2, "0");
      const minutes = String(time.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  // Загрузка задач с сервера и анализ ИИ
  const loadTasks = useCallback(
    async (userToken: string) => {
      try {
        setLoading(true);
        const data = await getTasks(userToken);

        if (!Array.isArray(data)) throw new Error("Invalid tasks data format");

        const formattedTasks = data.map((task) => ({
          ...task,
          date: formatDisplayDate(task.date),
          time: formatDisplayTime(task.time),
          status: task.status || t('tasks.inProgress'),
          tags: task.tags || [],
        }));

        // Анализируем задачи с помощью ИИ
        const analyzedTasks = await analyzeTasksWithAI(formattedTasks);
        setTasks(analyzedTasks);
        
        scheduleNotifications(analyzedTasks);
      } catch (error) {
        console.error("Failed to load tasks:", error);
        Alert.alert(t('common.error'), error instanceof Error ? error.message : t('errors.loadingError'));

        if (error instanceof Error && error.message.includes("401")) {
          await AsyncStorage.removeItem("token");
          navigation.replace("Login");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation, t]
  );

  const loadData = useCallback(async () => {
    // Обновляем пользователя и тему
    await updateUser();
    
    const storedToken = await AsyncStorage.getItem("token");
    if (!storedToken) {
      navigation.replace("Login");
      return;
    }
    setToken(storedToken);
    await loadTasks(storedToken);
  }, [loadTasks, navigation, updateUser]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      // Обновляем пользователя и тему при фокусе на экране
      await updateUser();
      
      if (token) {
        loadTasks(token);
      }
    });

    return unsubscribe;
  }, [navigation, token, loadTasks, updateUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const removeTask = async (id: string) => {
    if (!token) return;

    try {
      // Отменяем уведомление для удаляемой задачи
      const numericId = stringToNumericId(id);
      PushNotification.cancelLocalNotifications({ id: numericId.toString() });
      
      await deleteTask(id, token);
      setTasks((prev) => prev.filter((task) => task._id !== id));
    } catch (error) {
      console.error("Failed to delete task:", error);
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('errors.deleteError'));
    }
  };

  const handleLogout = async () => {
    // Отменяем все уведомления при выходе
    PushNotification.cancelAllLocalNotifications();
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  };

  // Обновленная фильтрация с поддержкой ключей категорий
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    
    // Если категория не выбрана, показываем все задачи
    if (!selectedCategory) {
      return matchesSearch;
    }
    
    // Проверяем есть ли теги у задачи
    if (!task.tags || task.tags.length === 0) {
      return false; // Если нет тегов, не показываем при активном фильтре
    }
    
    // Проверяем совпадение как по ключу, так и по названию (для совместимости)
    const matchesCategory = task.tags && task.tags.some(tag => {
      const tagKey = getCategoryKey(tag);
      return tagKey === selectedCategory || tag === selectedCategory;
    });
    
    return matchesSearch && matchesCategory;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === t('tasks.inProgress') && b.status === t('tasks.completed')) return -1;
    if (a.status === t('tasks.completed') && b.status === t('tasks.inProgress')) return 1;
    return a.title.localeCompare(b.title);
  });

  // Функции для отображения ИИ данных
  const getSentimentIcon = (sentiment?: string) => {
    if (!sentiment) return '';
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😤';
      default: return '😐';
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return theme.colors.textSecondary;
    switch (priority) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  const getPriorityIcon = (priority?: string) => {
    if (!priority) return '📋';
    switch (priority) {
      case 'high': return '🚨';
      case 'medium': return '⚡';
      case 'low': return '😌';
      default: return '📋';
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.taskAnimationContainer}>
      <TouchableOpacity
        style={[styles.task, item.status === t('tasks.completed') && styles.taskCompleted]}
        onPress={() => navigation.navigate("EditTask", { id: item._id })}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={item.status === t('tasks.completed') ? 
            (theme.isDark ? [theme.colors.card, theme.colors.surface] : ['#E8F5E8', '#F0F8F0']) : 
            (theme.isDark ? [theme.colors.surface, theme.colors.card] : ['#FFFFFF', '#F8F9FA'])
          }
          style={styles.taskGradient}
        >
          <View style={styles.taskLeft}>
            {/* Индикатор приоритета (цвет от ИИ) */}
            <View style={[
              styles.statusIndicator,
              { backgroundColor: item.analysis ? getPriorityColor(item.analysis.priority) : 
                (item.status === t('tasks.completed') ? theme.colors.success : theme.colors.warning) }
            ]} />
            
            <View style={styles.taskContent}>
              <View style={styles.taskHeader}>
                <Text style={[
                  styles.taskTitle,
                  item.status === t('tasks.completed') && styles.taskTitleCompleted
                ]}>
                  {item.title}
                </Text>
                
                {/* ИИ анализ в заголовке */}
                {item.analysis && (
                  <View style={styles.aiIndicatorsRow}>
                    <Text style={styles.sentimentIcon}>
                      {getSentimentIcon(item.analysis.sentiment.sentiment)}
                    </Text>
                    <Text style={styles.priorityIcon}>
                      {getPriorityIcon(item.analysis.priority)}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Обновленное отображение тегов с переводом */}
              {item.tags && item.tags.length > 0 && (
                <View style={styles.taskTags}>
                  {item.tags.slice(0, 3).map((tag) => {
                    const category = getCategoryByTag(tag);
                    const translatedName = getCategoryTranslation(getCategoryKey(tag), t);
                    
                    return (
                      <View 
                        key={tag} 
                        style={[styles.taskTag, { backgroundColor: category?.color + '20' }]}
                      >
                        <Ionicons 
                          name={category?.icon as any || 'pricetag'} 
                          size={10} 
                          color={category?.color || theme.colors.primary} 
                        />
                        <Text style={[styles.taskTagText, { color: category?.color || theme.colors.primary }]}>
                          {translatedName}
                        </Text>
                      </View>
                    );
                  })}
                  {item.tags.length > 3 && (
                    <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
                  )}
                </View>
              )}
              
              {/* ИИ аналитика */}
              {item.analysis && (
                <View style={styles.aiAnalysisContainer}>
                  <Text style={styles.aiAnalysisText}>
                    🤖 {item.analysis.category} • ~{item.analysis.estimatedDuration}{t('common.minutes')} • 
                    {item.analysis.sentiment.sentiment === 'positive' ? ` ${t('ai.analytics.positive')}` : 
                     item.analysis.sentiment.sentiment === 'negative' ? ` ${t('ai.analytics.difficult')}` : ` ${t('ai.analytics.neutral')}`} 
                    ({Math.round(item.analysis.sentiment.confidence * 100)}%)
                  </Text>
                </View>
              )}
              
              <View style={styles.taskMeta}>
                {item.date && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.primary} />
                    <Text style={styles.taskDate}>{item.date}</Text>
                  </View>
                )}
                {item.time && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.primary} />
                    <Text style={styles.taskTime}>{item.time}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.taskRight}>
            {/* Статус бейдж */}
            <View style={[
              styles.statusBadge,
              item.status === t('tasks.completed') ? styles.statusBadgeCompleted : styles.statusBadgeProgress
            ]}>
              <Text style={[
                styles.statusText,
                item.status === t('tasks.completed') && styles.statusTextCompleted
              ]}>
                {item.status === t('tasks.completed') ? t('tasks.done') : t('tasks.inWork')}
              </Text>
            </View>
            
            {/* Кнопка удаления */}
            <TouchableOpacity 
              onPress={() => removeTask(item._id)} 
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <LinearGradient
        colors={theme.isDark ? 
          [theme.colors.background, theme.colors.surface] : 
          ['#8BC34A', '#6B6F45']
        }
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('ai.initializingAI')}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.isDark ? 
        [theme.colors.background, theme.colors.surface] : 
        ['#8BC34A', '#6B6F45']
      }
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
        >
          <LinearGradient
            colors={theme.isDark ? 
              [theme.colors.surface, theme.colors.card] : 
              ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']
            }
            style={styles.menuButtonGradient}
          >
            <Ionicons name="menu" size={24} color={theme.isDark ? theme.colors.text : "#FFF"} />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('tasks.title')}</Text>
          <Text style={styles.tasksCount}>
            {t('stats.tasksCount').replace('{count}', tasks.length.toString())}
            {isAnalyzing && <Text style={styles.analyzingIndicator}> • {t('ai.analyzing')}</Text>}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowCategoryFilter(true)}
        >
          <LinearGradient
            colors={theme.isDark ? 
              [theme.colors.surface, theme.colors.card] : 
              ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']
            }
            style={styles.filterButtonGradient}
          >
            <Ionicons name="funnel-outline" size={20} color={theme.isDark ? theme.colors.text : "#FFF"} />
            {selectedCategory && (
              <View style={styles.filterIndicator} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      {selectedCategory && (
        <View style={styles.activeFilterContainer}>
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              {t('tasks.filter')}: {getCategoryTranslation(selectedCategory, t)}
            </Text>
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Ionicons name="close" size={16} color={theme.isDark ? theme.colors.text : "#FFF"} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <LinearGradient
          colors={theme.isDark ? 
            [theme.colors.surface, theme.colors.card] : 
            ['#FFFFFF', '#F8F9FA']
          }
          style={styles.searchGradient}
        >
          <Ionicons name="search" size={20} color={theme.colors.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('tasks.searchTasks')}
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : null}
        </LinearGradient>
      </View>

      {/* AI Assistant Card with enhanced analytics */}
      <AIAssistantCard navigation={navigation} tasks={tasks} aiStats={aiStats} theme={theme} t={t} />

      {/* AI Suggestion */}
      {suggestedTask && (
        <Animated.View style={[styles.suggestionContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={theme.isDark ? 
              [theme.colors.surface, theme.colors.card] : 
              ['#FFF', '#F8F9FA']
            }
            style={styles.suggestionGradient}
          >
            <View style={styles.suggestionHeader}>
              <View style={styles.aiIcon}>
                <Image
                  source={DinoImage}
                  style={styles.aiImage}
                />
              </View>
              <View style={styles.suggestionTitleContainer}>
                <Text style={styles.suggestionTitle}>{t('ai.suggests')}</Text>
                <Text style={styles.suggestionSubtitle}>{t('ai.tensorflowAnalysis')}</Text>
              </View>
            </View>
            
            <Text style={styles.suggestionText}>{suggestedTask}</Text>
            
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={createSuggestedTask}
              >
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.acceptButtonText}>{t('ai.actions.create')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={async () => {
                  await rejectTaskPattern(suggestedTask || "");
                  setSuggestedTask(null);
                }}
              >
                <Ionicons name="close" size={16} color={theme.colors.error} />
                <Text style={styles.rejectButtonText}>{t('ai.actions.reject')}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Tasks List */}
      <FlatList
        data={sortedTasks}
        keyExtractor={item => item._id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="clipboard-outline" size={60} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>
              {search || selectedCategory ? t('tasks.nothingFound') : t('tasks.noTasks')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search || selectedCategory ? t('tasks.tryChangeFilters') : t('tasks.createFirstTask')}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("Task", { id: undefined })}
      >
        <LinearGradient
          colors={theme.isDark ? 
            [theme.colors.surface, theme.colors.card] : 
            ['#FFF', '#F8F9FA']
          }
          style={styles.addButtonGradient}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>{t('tasks.newTask')}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Обновленный Category Filter Modal с переводами */}
      <Modal
        transparent={true}
        visible={showCategoryFilter}
        onRequestClose={() => setShowCategoryFilter(false)}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryFilter(false)}
        >
          <View style={styles.categoryModal}>
            <LinearGradient
              colors={theme.isDark ? 
                [theme.colors.surface, theme.colors.card] : 
                ['#FFF', '#F8F9FA']
              }
              style={styles.categoryModalGradient}
            >
              <Text style={styles.categoryModalTitle}>{t('tasks.filterByCategories')}</Text>
              
              <TouchableOpacity
                style={[styles.categoryOption, !selectedCategory && styles.categoryOptionActive]}
                onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryFilter(false);
                }}
              >
                <Ionicons name="apps" size={20} color={!selectedCategory ? theme.colors.success : theme.colors.primary} />
                <Text style={[styles.categoryOptionText, !selectedCategory && styles.categoryOptionTextActive]}>
                  {t('tasks.allTasks')}
                </Text>
              </TouchableOpacity>
              
              {TASK_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[styles.categoryOption, selectedCategory === category.key && styles.categoryOptionActive]}
                  onPress={() => {
                    setSelectedCategory(category.key);
                    setShowCategoryFilter(false);
                  }}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={20} 
                    color={selectedCategory === category.key ? theme.colors.success : category.color} 
                  />
                  <Text style={[
                    styles.categoryOptionText,
                    selectedCategory === category.key && styles.categoryOptionTextActive
                  ]}>
                    {getCategoryTranslation(category.key, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Enhanced Menu Modal with AI */}
      <MenuModalWithAI 
        isMenuVisible={isMenuVisible}
        setMenuVisible={setMenuVisible}
        navigation={navigation}
        handleLogout={handleLogout}
        theme={theme}
        t={t}
      />
    </LinearGradient>
  );
}

// Функция создания стилей с поддержкой тем (сокращена для краткости)
const createThemedStyles = (theme: any) => StyleSheet.create({
  // ... все стили из оригинального файла остаются без изменений
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: theme.isDark ? theme.colors.text : '#FFF',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  menuButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.isDark ? theme.colors.text : "#FFF",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tasksCount: {
    fontSize: 14,
    color: theme.isDark ? theme.colors.textSecondary : 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  analyzingIndicator: {
    color: theme.isDark ? theme.colors.text : 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  filterButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
  },
  activeFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? `${theme.colors.primary}40` : 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  activeFilterText: {
    flex: 1,
    color: theme.isDark ? theme.colors.text : '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  
  // Enhanced AI Assistant Card Styles
  aiAssistantCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  aiAssistantGradient: {
    padding: 20,
  },
  aiAssistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiAssistantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 16,
  },
  aiAssistantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  aiAssistantInfo: {
    flex: 1,
  },
  aiAssistantTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  aiAssistantSubtitle: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  aiAssistantStats: {
    alignItems: 'center',
  },
  completionCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  completionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  aiAssistantInsight: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  // New AI Analytics Styles
  aiAnalyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: theme.isDark ? `${theme.colors.primary}15` : 'rgba(139, 195, 74, 0.05)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  aiAnalyticItem: {
    alignItems: 'center',
  },
  aiAnalyticIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  aiAnalyticNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  aiAnalyticLabel: {
    fontSize: 10,
    color: theme.colors.primary,
    opacity: 0.8,
  },
  aiAssistantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiQuickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? `${theme.colors.primary}20` : 'rgba(139, 195, 74, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  aiQuickActionText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  aiChevron: {
    marginLeft: 'auto',
  },

  // Enhanced Menu Styles
  aiMenuIcon: {
    backgroundColor: theme.isDark ? `${theme.colors.primary}20` : 'rgba(139, 195, 74, 0.1)',
    borderWidth: 1,
    borderColor: theme.isDark ? `${theme.colors.primary}30` : 'rgba(139, 195, 74, 0.3)',
  },
  menuAIImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  aiMenuBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  aiMenuBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Enhanced Task Styles with AI Analysis
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  aiIndicatorsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sentimentIcon: {
    fontSize: 16,
  },
  priorityIcon: {
    fontSize: 14,
  },
  aiAnalysisContainer: {
    backgroundColor: theme.isDark ? `${theme.colors.primary}15` : 'rgba(139, 195, 74, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  aiAnalysisText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Original styles continue...
  suggestionContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionGradient: {
    padding: 20,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  aiImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  suggestionTitleContainer: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  suggestionText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
    lineHeight: 22,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  acceptButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: theme.isDark ? `${theme.colors.error}20` : 'rgba(255, 107, 107, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.isDark ? `${theme.colors.error}30` : 'rgba(255, 107, 107, 0.3)',
    gap: 6,
  },
  rejectButtonText: {
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  taskAnimationContainer: {
    marginBottom: 12,
  },
  task: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  taskCompleted: {
    opacity: 0.8,
  },
  taskGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 80,
  },
  taskLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 4,
    height: 50,
    borderRadius: 2,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 20,
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  taskTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  taskTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  taskTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDate: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  taskTime: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  taskRight: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusBadgeProgress: {
    backgroundColor: theme.isDark ? `${theme.colors.warning}20` : 'rgba(255, 152, 0, 0.15)',
    borderWidth: 1,
    borderColor: theme.isDark ? `${theme.colors.warning}30` : 'rgba(255, 152, 0, 0.3)',
  },
  statusBadgeCompleted: {
    backgroundColor: theme.isDark ? `${theme.colors.success}20` : 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: theme.isDark ? `${theme.colors.success}30` : 'rgba(76, 175, 80, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  statusTextCompleted: {
    color: theme.colors.success,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.isDark ? `${theme.colors.error}20` : 'rgba(255, 107, 107, 0.1)',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  categoryModal: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  categoryModalGradient: {
    padding: 20,
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  categoryOptionActive: {
    backgroundColor: theme.isDark ? `${theme.colors.success}20` : 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: theme.isDark ? `${theme.colors.success}30` : 'rgba(76, 175, 80, 0.3)',
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: theme.colors.success,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  menu: {
    marginLeft: 20,
    marginRight: 60,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  menuGradient: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.isDark ? `${theme.colors.primary}20` : 'rgba(107, 111, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIconContainer: {
    backgroundColor: theme.isDark ? `${theme.colors.error}20` : 'rgba(255, 107, 107, 0.1)',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  logoutText: {
    color: theme.colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 20,
  },
});
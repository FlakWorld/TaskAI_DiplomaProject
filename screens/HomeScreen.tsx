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
import { Image } from "react-native";
import DinoImage from "../assets/dino.jpg";
import PushNotification from "react-native-push-notification";
import { LinearGradient } from 'react-native-linear-gradient';
import { PermissionsAndroid } from "react-native";

const { width, height } = Dimensions.get('window');

type Task = {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  status: "в прогрессе" | "выполнено";
  tags?: string[];
};

export default function HomeScreen({ navigation }: ScreenProps<"Home">) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [suggestedTask, setSuggestedTask] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Новые состояния для фильтрации
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

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
            "Важное уведомление",
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
                text: "Понятно", 
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
  }, []);

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
            buttonNegative: 'Отмена',
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
              { text: "Понятно", style: "cancel" },
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
        status: "в прогрессе",
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
      Alert.alert("✅ Создано", `"${suggestedTask}" добавлена`);
      setSuggestedTask(null);
      loadTasks(token);
    } catch (error) {
      console.error("Ошибка создания задачи:", error);
      Alert.alert("Ошибка", "Не удалось создать задачу");
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

  // Загрузка задач с сервера и планирование уведомлений
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
          status: task.status || "в прогрессе",
          tags: task.tags || [],
        }));

        setTasks(formattedTasks);
        scheduleNotifications(formattedTasks);
      } catch (error) {
        console.error("Failed to load tasks:", error);
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to load tasks");

        if (error instanceof Error && error.message.includes("401")) {
          await AsyncStorage.removeItem("token");
          navigation.replace("Login");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation]
  );

  const loadData = useCallback(async () => {
    const storedToken = await AsyncStorage.getItem("token");
    if (!storedToken) {
      navigation.replace("Login");
      return;
    }
    setToken(storedToken);
    await loadTasks(storedToken);
  }, [loadTasks, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (token) loadTasks(token);
    });

    return unsubscribe;
  }, [navigation, token, loadTasks]);

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
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to delete task");
    }
  };

  const handleLogout = async () => {
    // Отменяем все уведомления при выходе
    PushNotification.cancelAllLocalNotifications();
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  };

  // Обновленная фильтрация с поддержкой категорий
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || 
      (task.tags && task.tags.includes(selectedCategory));
    return matchesSearch && matchesCategory;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === "в прогрессе" && b.status === "выполнено") return -1;
    if (a.status === "выполнено" && b.status === "в прогрессе") return 1;
    return a.title.localeCompare(b.title);
  });

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.taskAnimationContainer}>
      <TouchableOpacity
        style={[styles.task, item.status === "выполнено" && styles.taskCompleted]}
        onPress={() => navigation.navigate("EditTask", { id: item._id })}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={item.status === "выполнено" ? ['#E8F5E8', '#F0F8F0'] : ['#FFFFFF', '#F8F9FA']}
          style={styles.taskGradient}
        >
          <View style={styles.taskLeft}>
            {/* Индикатор статуса */}
            <View style={[
              styles.statusIndicator,
              item.status === "выполнено" ? styles.statusCompleted : styles.statusInProgress
            ]} />
            
            <View style={styles.taskContent}>
              <Text style={[
                styles.taskTitle,
                item.status === "выполнено" && styles.taskTitleCompleted
              ]}>
                {item.title}
              </Text>
              
              {/* Отображение тегов */}
              {item.tags && item.tags.length > 0 && (
                <View style={styles.taskTags}>
                  {item.tags.slice(0, 3).map((tag) => {
                    const category = TASK_CATEGORIES.find(c => c.name === tag);
                    return (
                      <View 
                        key={tag} 
                        style={[styles.taskTag, { backgroundColor: category?.color + '20' }]}
                      >
                        <Ionicons 
                          name={category?.icon as any || 'pricetag'} 
                          size={10} 
                          color={category?.color || '#6B6F45'} 
                        />
                        <Text style={[styles.taskTagText, { color: category?.color || '#6B6F45' }]}>
                          {tag}
                        </Text>
                      </View>
                    );
                  })}
                  {item.tags.length > 3 && (
                    <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
                  )}
                </View>
              )}
              
              <View style={styles.taskMeta}>
                {item.date && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color="#6B6F45" />
                    <Text style={styles.taskDate}>{item.date}</Text>
                  </View>
                )}
                {item.time && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color="#6B6F45" />
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
              item.status === "выполнено" ? styles.statusBadgeCompleted : styles.statusBadgeProgress
            ]}>
              <Text style={[
                styles.statusText,
                item.status === "выполнено" && styles.statusTextCompleted
              ]}>
                {item.status === "выполнено" ? "Готово" : "В работе"}
              </Text>
            </View>
            
            {/* Кнопка удаления */}
            <TouchableOpacity 
              onPress={() => removeTask(item._id)} 
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#8BC34A', '#6B6F45']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.menuButtonGradient}
          >
            <Ionicons name="menu" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Мои Задачи</Text>
          <Text style={styles.tasksCount}>{tasks.length} задач</Text>
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowCategoryFilter(true)}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.filterButtonGradient}
          >
            <Ionicons name="funnel-outline" size={20} color="#FFF" />
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
              Фильтр: {selectedCategory}
            </Text>
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Ionicons name="close" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FA']}
          style={styles.searchGradient}
        >
          <Ionicons name="search" size={20} color="#6B6F45" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск задач..."
            placeholderTextColor="rgba(107, 111, 69, 0.6)"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#6B6F45" />
            </TouchableOpacity>
          ) : null}
        </LinearGradient>
      </View>

      {/* AI Suggestion */}
      {suggestedTask && (
        <Animated.View style={[styles.suggestionContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#FFF', '#F8F9FA']}
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
                <Text style={styles.suggestionTitle}>ИИ предлагает:</Text>
                <Text style={styles.suggestionSubtitle}>Основано на ваших привычках</Text>
              </View>
            </View>
            
            <Text style={styles.suggestionText}>{suggestedTask}</Text>
            
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={createSuggestedTask}
              >
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.acceptButtonText}>Создать</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={async () => {
                  await rejectTaskPattern(suggestedTask || "");
                  setSuggestedTask(null);
                }}
              >
                <Ionicons name="close" size={16} color="#FF6B6B" />
                <Text style={styles.rejectButtonText}>Отклонить</Text>
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
            colors={["#FFF"]}
            tintColor="#FFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="clipboard-outline" size={60} color="rgba(255,255,255,0.6)" />
            </View>
            <Text style={styles.emptyTitle}>
              {search || selectedCategory ? "Ничего не найдено" : "Пока нет задач"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search || selectedCategory ? "Попробуйте изменить фильтры" : "Создайте свою первую задачу"}
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
          colors={['#FFF', '#F8F9FA']}
          style={styles.addButtonGradient}
        >
          <Ionicons name="add" size={24} color="#6B6F45" />
          <Text style={styles.addButtonText}>Новая задача</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Category Filter Modal */}
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
              colors={['#FFF', '#F8F9FA']}
              style={styles.categoryModalGradient}
            >
              <Text style={styles.categoryModalTitle}>Фильтр по категориям</Text>
              
              <TouchableOpacity
                style={[styles.categoryOption, !selectedCategory && styles.categoryOptionActive]}
                onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryFilter(false);
                }}
              >
                <Ionicons name="apps" size={20} color={!selectedCategory ? "#4CAF50" : "#6B6F45"} />
                <Text style={[styles.categoryOptionText, !selectedCategory && styles.categoryOptionTextActive]}>
                  Все задачи
                </Text>
              </TouchableOpacity>
              
              {TASK_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.name}
                  style={[styles.categoryOption, selectedCategory === category.name && styles.categoryOptionActive]}
                  onPress={() => {
                    setSelectedCategory(category.name);
                    setShowCategoryFilter(false);
                  }}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={20} 
                    color={selectedCategory === category.name ? "#4CAF50" : category.color} 
                  />
                  <Text style={[
                    styles.categoryOptionText,
                    selectedCategory === category.name && styles.categoryOptionTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Menu Modal */}
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
              colors={['#FFF', '#F8F9FA']}
              style={styles.menuGradient}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Profile');
                }}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="person-outline" size={20} color="#6B6F45" />
                </View>
                <Text style={styles.menuText}>Профиль</Text>
                <Ionicons name="chevron-forward" size={16} color="#6B6F45" />
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  handleLogout();
                }}
              >
                <View style={[styles.menuIconContainer, styles.logoutIconContainer]}>
                  <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                </View>
                <Text style={[styles.menuText, styles.logoutText]}>Выйти</Text>
                <Ionicons name="chevron-forward" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    color: "#FFF",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tasksCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
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
    backgroundColor: '#FF5722',
  },
  activeFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  activeFilterText: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
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
    color: "#333",
  },
  suggestionContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
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
    color: '#6B6F45',
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: 'rgba(107, 111, 69, 0.6)',
    marginTop: 2,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 22,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
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
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    gap: 6,
  },
  rejectButtonText: {
    color: '#FF6B6B',
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
    shadowColor: '#000',
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
  statusInProgress: {
    backgroundColor: '#FF9800',
  },
  statusCompleted: {
    backgroundColor: '#4CAF50',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    lineHeight: 20,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(51, 51, 51, 0.6)',
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
    color: '#6B6F45',
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
    color: "#6B6F45",
    fontWeight: '500',
  },
  taskTime: {
    fontSize: 12,
    color: "#6B6F45",
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
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  statusTextCompleted: {
    color: '#4CAF50',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
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
    color: "#6B6F45",
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
    shadowColor: '#000',
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
    color: '#333',
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
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#4CAF50',
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
    shadowColor: '#000',
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
    backgroundColor: 'rgba(107, 111, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIconContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: '500',
  },
  logoutText: {
    color: "#FF6B6B",
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(107, 111, 69, 0.1)',
    marginHorizontal: 20,
  },
});
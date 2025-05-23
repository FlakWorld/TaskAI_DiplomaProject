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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTasks, deleteTask } from "../server/api";
import { ScreenProps } from "../types";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getSuggestedTask, saveTaskPattern, rejectTaskPattern } from "../services/aiService";
import { Image } from "react-native";
import DinoImage from "../assets/dino.jpg";
import PushNotification from "react-native-push-notification";

type Task = {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  status: "в прогрессе" | "выполнено";
};

export default function HomeScreen({ navigation }: ScreenProps<"Home">) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [suggestedTask, setSuggestedTask] = useState<string | null>(null);

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

    // Конфигурируем PushNotification
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
        console.error(err.message, err);
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
    if (Platform.OS === "android" && Platform.Version >= 31) {
      Alert.alert(
        "Важное уведомление",
        "Для корректной работы точных уведомлений требуется разрешение на использование точных будильников в настройках устройства. " +
          "Пожалуйста, убедитесь, что это разрешение предоставлено.",
        [
          {
            text: "Открыть настройки",
            onPress: () => Linking.openSettings(),
          },
          { text: "Отмена", style: "cancel" },
        ]
      );
    }
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

  // Планирование уведомлений (исправленная версия)
  const scheduleNotifications = (tasks: Task[]) => {
    // Отменяем все существующие уведомления
    PushNotification.cancelAllLocalNotifications();

    console.log("Планируем уведомления для задач:", tasks.length);

    tasks.forEach((task) => {
      if (task.status === "выполнено") {
        console.log(`Пропускаем выполненную задачу: ${task.title}`);
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
            console.warn(`Некорректная дата у задачи "${task.title}":`, task.date, task.time);
            return;
          }

          // Время уведомления - за 10 минут до задачи
          const notifyTime = new Date(taskDate.getTime() - 10 * 60 * 1000);
          const now = new Date();

          console.log(`Задача: ${task.title}`);
          console.log(`Время задачи: ${taskDate}`);
          console.log(`Время уведомления: ${notifyTime}`);
          console.log(`Текущее время: ${now}`);

          if (notifyTime > now) {
            const numericId = stringToNumericId(task._id);
            
            PushNotification.localNotificationSchedule({
              channelId: "tasks-channel",
              id: numericId.toString(), // Преобразуем в строку для совместимости
              title: "Напоминание о задаче",
              message: `Уважаемый пользователь, через 10 минут начинается задача: "${task.title}"`,
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

            console.log(`Уведомление запланировано для задачи "${task.title}" на ${notifyTime}`);
          } else {
            console.log(`Время уведомления для задачи "${task.title}" уже прошло`);
          }
        } catch (error) {
          console.warn(`Ошибка при планировании уведомления для задачи "${task.title}":`, error);
        }
      } else {
        console.log(`У задачи "${task.title}" нет даты или времени`);
      }
    });
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

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === "в прогрессе" && b.status === "выполнено") return -1;
    if (a.status === "выполнено" && b.status === "в прогрессе") return 1;
    return a.title.localeCompare(b.title);
  });

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[styles.task, item.status === "выполнено" && styles.taskCompleted]}
      onPress={() => navigation.navigate("EditTask", { id: item._id })}
    >
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <View style={styles.taskMeta}>
          {item.date && <Text style={styles.taskDate}>{item.date}</Text>}
          {item.time && <Text style={styles.taskTime}>{item.time}</Text>}
          <Text
            style={[styles.taskStatus, item.status === "выполнено" && styles.statusCompleted]}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => removeTask(item._id)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>My Tasks</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#5C573E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor="#5C573E"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {suggestedTask && (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Image
              source={DinoImage}
              style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
            />
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>ИИ предлагает задачу:</Text>
          </View>
          <Text style={{ fontSize: 16, marginBottom: 12 }}>{suggestedTask}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity
              style={{ backgroundColor: "#D4E157", padding: 10, borderRadius: 8 }}
              onPress={createSuggestedTask}
            >
              <Text style={{ fontWeight: "bold" }}>Создать</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: "#EF5350", padding: 10, borderRadius: 8 }}
              onPress={async () => {
                await rejectTaskPattern(suggestedTask || "");
                setSuggestedTask(null);
              }}
            >
              <Text style={{ fontWeight: "bold", color: "#fff" }}>Отклонить</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={sortedTasks}
        keyExtractor={(item) => item._id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#fff"]}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>{search ? "No matching tasks found" : "No tasks yet"}</Text>
        }
      />

      <TouchableOpacity
        onPress={() => {
          // Тестовое уведомление
          PushNotification.localNotification({
            channelId: "tasks-channel",
            title: "Тестовое уведомление",
            message: "Если вы видите это, уведомления работают!",
            playSound: true,
            soundName: "default",
            vibrate: true,
          });
        }}
        style={{ padding: 20, backgroundColor: "#4CAF50", margin: 10, borderRadius: 8 }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>Показать тестовое уведомление</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("Task", { id: undefined })}>
        <Ionicons name="add" size={24} color="#5C573E" />
        <Text style={styles.addButtonText}>New Task</Text>
      </TouchableOpacity>

      <Modal transparent visible={isMenuVisible} onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("Profile");
              }}
            >
              <Ionicons name="person-outline" size={20} style={styles.menuIcon} />
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} style={[styles.menuIcon, styles.logoutIcon]} />
              <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6B6F45",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6B6F45",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9D8A6",
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#333",
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  task: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  taskCompleted: {
    backgroundColor: "#D8E9C6",
    opacity: 0.8,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskDate: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  taskTime: {
    fontSize: 12,
    color: "#666",
    marginRight: 12,
  },
  taskStatus: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
  },
  statusCompleted: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9D8A6",
    padding: 16,
    borderRadius: 10,
    marginTop: 12,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5C573E",
    marginLeft: 8,
  },
  emptyText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    paddingTop: 60,
  },
  menu: {
    backgroundColor: "#fff",
    width: 200,
    borderRadius: 10,
    marginLeft: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 12,
    color: "#333",
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  logoutIcon: {
    color: "#ff4444",
  },
  logoutText: {
    color: "#ff4444",
  },
});
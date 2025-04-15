import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ScreenProps } from "../types";
import { getTaskById, updateTaskStatus, deleteTask } from "../server/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";

type Task = {
  _id: string;
  title: string;
  date: string;
  time: string;
  status: "в прогрессе" | "выполнено";
};

export default function TaskDetail({ route, navigation }: ScreenProps<"EditTask">) {
  const { id } = route.params || {};
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const loadTask = async (userToken: string) => {
      try {
        if (!id) {
          setTask({
            _id: "",
            title: "Новая задача",
            date: new Date().toISOString(),
            time: new Date().toISOString(),
            status: "в прогрессе"
          });
          return;
        }
  
        const data = await getTaskById(id, userToken);
        if (!data || data.error) {
          throw new Error(data?.error || "Задача не найдена");
        }
        setTask(data);
      } catch (error) {
        console.error("Ошибка загрузки:", error);
        Alert.alert("Ошибка", error instanceof Error ? error.message : "Не удалось загрузить задачу");
        
        if (error === "Unauthorized") {
          await AsyncStorage.removeItem("token");
          navigation.replace("Login");
        }
      } finally {
        setLoading(false);
      }
    };
  
    const loadData = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      if (!storedToken) {
        navigation.replace("Login");
        return;
      }
      setToken(storedToken);
      loadTask(storedToken);
    };
  
    loadData();
  }, [id, navigation]); // Теперь loadTask внутри, зависимости не изменились

  const toggleTaskStatus = async () => {
    if (!task || !token) return;

    const newStatus = task.status === "в прогрессе" ? "выполнено" : "в прогрессе";
    try {
      await updateTaskStatus(task._id, newStatus, token);
      setTask({ ...task, status: newStatus });
    } catch (error) {
      console.error("Ошибка обновления:", error);
      Alert.alert("Ошибка", "Не удалось обновить статус");
    }
  };

  const handleDelete = async () => {
    if (!task?._id || !token) return;

    try {
      await deleteTask(task._id, token);
      Alert.alert("Успех", "Задача удалена");
      navigation.navigate("Home", { refreshed: true });
    } catch (error) {
      console.error("Ошибка удаления:", error);
      Alert.alert("Ошибка", "Не удалось удалить задачу");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "null") return "Дата не указана";
    
    // Проверяем, это ISO-строка или наш кастомный формат
    if (dateString.includes('T')) { // Это ISO формат
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? "Дата не указана" : date.toLocaleDateString("ru-RU");
    } else { // Это формат DD.MM.YYYY из CreationTask.tsx
      const [day, month, year] = dateString.split('.');
      if (!day || !month || !year) return "Дата не указана";
      return dateString; // Возвращаем как есть, т.к. уже в нужном формате
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === "null") return "Время не указано";
    
    if (timeString.includes('T') || timeString.includes(':')) { // ISO или HH:mm
      // Пробуем распарсить время
      const time = new Date(`1970-01-01T${timeString.includes('T') ? 
        timeString.split('T')[1] : 
        timeString}Z`);
      
      return isNaN(time.getTime()) ? 
        "Время не указано" : 
        time.toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' });
    }
    
    return "Время не указано";
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Задача не найдена</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>{task.title}</Text>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color="#E9D8A6" />
          <Text style={styles.detailText}>{formatDate(task.date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={20} color="#E9D8A6" />
          <Text style={styles.detailText}>{formatTime(task.time)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons 
            name={task.status === "выполнено" ? "checkmark-circle" : "hourglass"} 
            size={20} 
            color="#E9D8A6" 
          />
          <Text style={styles.detailText}>
            Статус: {task.status === "выполнено" ? "Выполнено" : "В процессе"}
          </Text>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[
            styles.button, 
            task.status === "выполнено" ? styles.inProgressButton : styles.completeButton
          ]}
          onPress={toggleTaskStatus}
        >
          <Text style={styles.buttonText}>
            {task.status === "выполнено" ? "Возобновить задачу" : "Завершить задачу"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => navigation.navigate("EditTaskForm", { task })}
        >
          <Text style={styles.buttonText}>Редактировать</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={styles.buttonText}>Удалить задачу</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6B6F45",
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 30,
    textAlign: "center",
  },
  detailsContainer: {
    backgroundColor: "rgba(233, 216, 166, 0.2)",
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  detailText: {
    fontSize: 16,
    color: "#fff",
    marginLeft: 10,
  },
  buttonsContainer: {
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  completeButton: {
    backgroundColor: "#4CAF50",
  },
  inProgressButton: {
    backgroundColor: "#FFA000",
  },
  editButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginTop: 50,
  },
});
// EditTaskScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ScreenProps } from "../types";
import { getTaskById, updateTaskStatus } from "../server/api";
import Ionicons from "react-native-vector-icons/Ionicons"; // Импортируем иконки

export default function EditTaskScreen({ route, navigation }: ScreenProps<"EditTask">) {
  const { id } = route.params || {}; // Получаем id задачи из параметров маршрута
  const [task, setTask] = useState<{
    _id?: string;
    title: string;
    date: string;
    time: string;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTask = async () => {
      try {
        if (id) {
          const data = await getTaskById(id); // Получаем задачу по id
          console.log("Ответ от сервера:", data); // Логируем ответ
          setTask(data);
        } else {
          setTask({ title: "", date: "", time: "", status: "в прогрессе" }); // Новая задача
        }
      } catch (error) {
        console.error("Ошибка при загрузке задачи:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [id]);

  const toggleTaskStatus = async () => {
    if (!task || !task._id) return;

    const newStatus = task.status === "в прогрессе" ? "выполнено" : "в прогрессе";
    try {
      await updateTaskStatus(task._id, newStatus);
      setTask({ ...task, status: newStatus });
    } catch (error) {
      console.error("Ошибка при обновлении статуса:", error);
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    if (!dateString) return "Дата не указана";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Функция для форматирования времени
  const formatTime = (timeString: string) => {
    if (!timeString) return "Время не указано";
    const time = new Date(timeString);
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Форматированные дата и время
  const formattedDate = formatDate(task?.date || "");
  const formattedTime = formatTime(task?.time || "");

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Кнопка "Назад" */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("Home")} // Переход на главный экран
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      {/* Заголовок задачи */}
      <Text style={styles.title}>{task?.title || "Новая задача"}</Text>

      {/* Дата и время */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.detailText}>{formattedDate}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={20} color="#fff" />
          <Text style={styles.detailText}>{formattedTime}</Text>
        </View>
      </View>

      {/* Статус задачи */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Статус:</Text>
        <Text style={styles.statusText}>
          {task?.status === "в прогрессе" ? "В прогрессе" : "Выполнено"}
        </Text>
      </View>

      {/* Кнопка изменения статуса */}
      <TouchableOpacity style={styles.button} onPress={toggleTaskStatus}>
        <Text style={styles.buttonText}>
          {task?.status === "в прогрессе" ? "Отметить выполненной" : "Отметить в прогрессе"}
        </Text>
      </TouchableOpacity>

      {/* Кнопка редактирования задачи */}
      <TouchableOpacity
        style={[styles.button, styles.editButton]}
        onPress={() =>
          navigation.navigate("EditTaskForm", {
            task: task, // Передаем текущую задачу в форму редактирования
          })
        }
      >
        <Text style={styles.buttonText}>Редактировать задачу</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#6f714e",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 60,
    marginBottom: 20,
    textAlign: "center",
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: "#fff",
    marginLeft: 10,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  statusLabel: {
    fontSize: 18,
    color: "#fff",
    marginRight: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  button: {
    backgroundColor: "#dacb93",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10, // Добавляем отступ между кнопками
  },
  editButton: {
    backgroundColor: "#4CAF50", // Зеленый цвет для кнопки редактирования
  },
  buttonText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
  },
});
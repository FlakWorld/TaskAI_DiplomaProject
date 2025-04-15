import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { ScreenProps } from "../types";
import { updateTask } from "../server/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function EditTaskForm({ route, navigation }: ScreenProps<"EditTaskForm">) {
  const { task } = route.params || {};
  const [title, setTitle] = useState(task?.title || "");
  const [date, setDate] = useState(parseDate(task?.date));
  const [time, setTime] = useState(parseTime(task?.time));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Функции для парсинга даты и времени из строки
  function parseDate(dateString?: string): Date {
    if (!dateString) return new Date();
    
    // Если дата в формате ISO (от бэкенда)
    if (dateString.includes('T')) {
      return new Date(dateString);
    }
    
    // Если дата в формате DD.MM.YYYY (от CreationTask)
    const [day, month, year] = dateString.split('.').map(Number);
    return new Date(year, month - 1, day);
  }

  function parseTime(timeString?: string): Date {
    if (!timeString) return new Date();
    
    // Если время в формате ISO (от бэкенда)
    if (timeString.includes('T')) {
      return new Date(timeString);
    }
    
    // Если время в формате HH:mm (от CreationTask)
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date;
  }

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      if (!storedToken) {
        navigation.replace("Login");
        return;
      }
      setToken(storedToken);
    };
    loadToken();
  }, [navigation]);

  const handleSave = async () => {
    console.log('Starting save...');
    if (!token) {
      Alert.alert("Ошибка", "Требуется авторизация");
      return;
    }
  
    if (!title.trim()) {
      Alert.alert("Ошибка", "Введите название задачи");
      return;
    }
  
    try {
      // Форматируем дату и время в строковый формат DD.MM.YYYY и HH:mm
      const formatDateToSend = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      };
  
      const formatTimeToSend = (time: Date) => {
        const hours = String(time.getHours()).padStart(2, '0');
        const minutes = String(time.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };
  
      const updatedTask = {
        ...task,
        _id: task?._id || "",
        title,
        date: formatDateToSend(date),
        time: formatTimeToSend(time),
        status: task?.status || "в прогрессе",
      };

      console.log('Data being sent:', updatedTask);
  
      const response = await updateTask(updatedTask, token);

      console.log('Server response:', response);
  
      if (response.error) {
        throw new Error(response.error);
      }
  
      Alert.alert("Успех", "Задача успешно обновлена");
      navigation.navigate("Home", { refreshed: true }); // Добавляем флаг обновления
    } catch (error) {
      console.error("Ошибка при обновлении:", error);
      Alert.alert(
        "Ошибка",
        error instanceof Error ? error.message : "Не удалось обновить задачу"
      );
      
      if (error === "Unauthorized") {
        await AsyncStorage.removeItem("token");
        navigation.replace("Login");
      }
    }
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString("ru-RU");
  };

  const formatTimeForDisplay = (time: Date) => {
    return time.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.container}>
      {/* Остальной JSX остается без изменений */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Редактирование задачи</Text>

      <TextInput
        style={styles.input}
        placeholder="Название задачи"
        placeholderTextColor="#5C573E"
        value={title}
        onChangeText={setTitle}
      />

      <TouchableOpacity
        style={styles.dateTimeButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateTimeText}>
          Дата: {formatDateForDisplay(date)}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDate(selectedDate);
            }
          }}
        />
      )}

      <TouchableOpacity
        style={styles.dateTimeButton}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.dateTimeText}>
          Время: {formatTimeForDisplay(time)}
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={(_, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setTime(selectedTime);
            }
          }}
        />
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Сохранить изменения</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#6B6F45",
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
  input: {
    width: "100%",
    backgroundColor: "#E9D8A6",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
    color: "#333",
  },
  dateTimeButton: {
    backgroundColor: "#E9D8A6",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  dateTimeText: {
    color: "#5C573E",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
});
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenProps } from "../types";
import { createTask } from "../server/api";

export default function TaskScreen({ navigation }: ScreenProps<"Task">) {
  const [task, setTask] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  // Функция для форматирования даты
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Функция для форматирования времени
  const formatTime = (time: Date) => {
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const saveTask = async () => {
    if (!task.trim()) {
      Alert.alert("Ошибка", "Введите название задачи!");
      return;
    }

    const newTask = {
      title: task,
      date: date.toISOString(),
      time: time.toISOString(),
      status: "в прогрессе", // Задача сразу в работе
    };

    try {
      // Отправляем задачу на сервер
      const response = await createTask(newTask.title, newTask.date, newTask.time, newTask.status);
      if (!response || response.error) {
        throw new Error(response?.error || "Ошибка создания задачи на сервере");
      }
      console.log("✅ Задача отправлена на сервер:", response);
      // Сохраняем задачу локально
      const storedTasks = await AsyncStorage.getItem("tasks");
      const tasks = storedTasks ? JSON.parse(storedTasks) : [];
      const updatedTasks = [...tasks, response]; // Используем ответ от сервера
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));
      navigation.navigate("Home");
    } catch (error) {
      console.error("❌ Ошибка сохранения задачи:", error);
      Alert.alert("Ошибка", "Не удалось сохранить задачу.");
    }
  };

  const showDatePicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: "date",
      is24Hour: true,
      onChange: (_, selectedDate) => {
        if (selectedDate) {
          setDate(selectedDate);
        }
      },
    });
  };

  const showTimePicker = () => {
    DateTimePickerAndroid.open({
      value: time,
      mode: "time",
      is24Hour: true,
      onChange: (_, selectedTime) => {
        if (selectedTime) {
          setTime(selectedTime);
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Создать задачу</Text>

      <TextInput
        style={styles.input}
        value={task}
        onChangeText={setTask}
        placeholder="Введите название"
        placeholderTextColor="#5C573E"
      />

      <TouchableOpacity style={styles.button} onPress={showDatePicker}>
        <Text style={styles.buttonText}>Выбрать дату</Text>
      </TouchableOpacity>
      <Text style={styles.dateText}>Дата: {formatDate(date)}</Text>

      <TouchableOpacity style={styles.button} onPress={showTimePicker}>
        <Text style={styles.buttonText}>Выбрать время</Text>
      </TouchableOpacity>
      <Text style={styles.dateText}>Время: {formatTime(time)}</Text>

      <TouchableOpacity style={styles.button} onPress={saveTask}>
        <Text style={styles.buttonText}>Сохранить</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6B6F45",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    color: "white",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#E9D8A6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#E9D8A6",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    color: "#5C573E",
    textAlign: "center",
  },
  dateText: {
    fontSize: 16,
    color: "white",
    marginVertical: 10,
  },
});
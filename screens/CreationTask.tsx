import React, { useState, useEffect } from "react";
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
import Ionicons from "react-native-vector-icons/Ionicons";

export default function CreationTask({ navigation }: ScreenProps<"Task">) {
  const [task, setTask] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [token, setToken] = useState<string | null>(null);

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

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

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
  
    if (!token) {
      Alert.alert("Ошибка", "Требуется авторизация");
      return;
    }
  
    try {
      const taskData = {
        title: task,
        date: formatDate(date),
        time: formatTime(time),
        status: "в прогрессе"
      };
  
      console.log("Отправка данных:", taskData);
      
      const response = await createTask(
        taskData.title,
        taskData.date,
        taskData.time,
        taskData.status,
        token
      );
  
      console.log("Ответ сервера:", response);
      
      Alert.alert("Успех", "Задача успешно создана");
      navigation.navigate("Home", { refreshed: true });
  
    } catch (error) {
      console.error("Полная ошибка:", error);
      
      let errorMessage = "Не удалось создать задачу";
      Alert.alert("Ошибка", errorMessage);
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
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Создать задачу</Text>

      <TextInput
        style={styles.input}
        value={task}
        onChangeText={setTask}
        placeholder="Введите название"
        placeholderTextColor="#5C573E"
      />

      <View style={styles.dateTimeContainer}>
        <TouchableOpacity style={styles.dateTimeButton} onPress={showDatePicker}>
          <Text style={styles.buttonText}>Выбрать дату</Text>
        </TouchableOpacity>
        <Text style={styles.dateTimeText}>{formatDate(date)}</Text>
      </View>

      <View style={styles.dateTimeContainer}>
        <TouchableOpacity style={styles.dateTimeButton} onPress={showTimePicker}>
          <Text style={styles.buttonText}>Выбрать время</Text>
        </TouchableOpacity>
        <Text style={styles.dateTimeText}>{formatTime(time)}</Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
        <Text style={styles.saveButtonText}>Сохранить задачу</Text>
      </TouchableOpacity>
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
    color: "white",
    marginBottom: 30,
    textAlign: "center",
    fontWeight: "bold",
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
  dateTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dateTimeButton: {
    backgroundColor: "#E9D8A6",
    padding: 12,
    borderRadius: 10,
    marginRight: 10,
    flex: 1,
  },
  dateTimeText: {
    color: "white",
    fontSize: 16,
    flex: 1,
    textAlign: "center",
  },
  buttonText: {
    color: "#5C573E",
    textAlign: "center",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  saveButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
});
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert, // Используем Alert вместо alert
} from "react-native";
import { ScreenProps } from "../types";
import { updateTask } from "../server/api"; // Функция для обновления задачи
import DateTimePicker from "@react-native-community/datetimepicker"; // Для выбора даты и времени

export default function EditTaskForm({ route, navigation }: ScreenProps<"EditTaskForm">) {
  const { task } = route.params || {}; // Получаем задачу из параметров маршрута

  const [title, setTitle] = useState(task?.title || "");
  const [date, setDate] = useState(new Date(task?.date || Date.now()));
  const [time, setTime] = useState(new Date(task?.time || Date.now()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = async () => {
    try {
      const updatedTask = {
        ...task,
        title,
        date: date.toISOString(),
        time: time.toISOString(),
      };

      // Отправляем обновленную задачу на сервер
      const response = await updateTask(updatedTask);

      if (response.error) {
        throw new Error(response.error);
      }

      // Возвращаемся на предыдущий экран с обновленными данными
      navigation.navigate("Home", { updatedTask: response.task });
    } catch (error) {
      console.error("Ошибка при обновлении задачи:", error);
      Alert.alert("Ошибка", "Не удалось обновить задачу. Попробуйте снова."); // Используем Alert
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Название задачи"
        value={title}
        onChangeText={setTitle}
      />

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text>{date.toLocaleDateString()}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDate(selectedDate);
            }
          }}
        />
      )}

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowTimePicker(true)}
      >
        <Text>{time.toLocaleTimeString()}</Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setTime(selectedTime);
            }
          }}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Сохранить</Text>
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
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#dacb93",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
  },
});
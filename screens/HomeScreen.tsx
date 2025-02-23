import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkAuth, getTasks, deleteTask } from "../server/api";
import { ScreenProps } from "../types";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function HomeScreen({ route, navigation }: ScreenProps<"Home">) {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMenuVisible, setMenuVisible] = useState(false);

  // Обработка обновленных данных, переданных с EditTaskScreen
  useEffect(() => {
    if (route.params?.updatedTask) {
      const { _id, status } = route.params.updatedTask;
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task._id === _id ? { ...task, status } : task
        )
      );
    }
  }, [route.params?.updatedTask]);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) return navigation.replace("Login");

      const res = await checkAuth(token);
      if (res.error) return navigation.replace("Login");

      loadTasks();
    };

    verifyAuth();
  }, [navigation]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks();
      console.log("Полученные задачи:", data);
      setTasks(data);
    } catch (error) {
      console.error("Ошибка при загрузке задач:", error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация задач по поисковому запросу
  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  // Сортировка задач: сначала "в прогрессе", затем "выполнено"
  const sortedTasks = filteredTasks.sort((a, b) => {
    if (a.status === "в прогрессе" && b.status === "выполнено") return -1;
    if (a.status === "выполнено" && b.status === "в прогрессе") return 1;
    return 0;
  });

  const removeTask = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks((prevTasks) => {
        console.log("Удаляем задачу:", id);
        return prevTasks.filter((task) => task._id !== id);
      });
    } catch (error) {
      console.error("Ошибка при удалении задачи:", error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    navigation.replace("Register");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu" size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>To do list</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#5C573E"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={sortedTasks} // Используем отсортированный список задач
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.task, item.status === "выполнено" && styles.taskCompleted]}
            onPress={() => navigation.navigate("EditTask", { id: item._id })}
          >
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.taskStatus}>
              {item.status === "в прогрессе" ? "в прогрессе" : "выполнено"}
            </Text>
            <TouchableOpacity onPress={() => removeTask(item._id)}>
              <Text>🗑</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("Task", { id: undefined })}
      >
        <Text style={styles.addButtonText}>Add Task</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={isMenuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("Login");
              }}
            >
              <Text style={styles.menuText}>Аккаунт</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
            >
              <Text style={styles.menuText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#6f714e" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginLeft: 10 },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#dacb93",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#333" },
  task: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    marginTop: 10,
    borderRadius: 5,
  },
  taskCompleted: { backgroundColor: "#c5e1a5" },
  taskTitle: { fontSize: 18, fontWeight: "bold" },
  taskStatus: { fontSize: 14, color: "#555" },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    paddingTop: 50,
  },
  menu: {
    backgroundColor: "#fff",
    width: 200,
    borderRadius: 10,
    padding: 10,
  },
  menuItem: {
    padding: 15,
  },
  menuText: {
    fontSize: 18,
  },
  addButton: {
    backgroundColor: "#dacb93",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    fontSize: 18,
    color: "#333",
  },
});
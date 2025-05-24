import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { ScreenProps } from "../types";
import { getTaskById, updateTaskStatus, deleteTask } from "../server/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { LinearGradient } from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  // Анимация появления
  useEffect(() => {
    if (!loading && task) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, task, fadeAnim, scaleAnim]);

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
  }, [id, navigation]);

  const toggleTaskStatus = async () => {
    if (!task || !token) return;

    const newStatus = task.status === "в прогрессе" ? "выполнено" : "в прогрессе";
    try {
      await updateTaskStatus(task._id, newStatus, token);
      setTask({ ...task, status: newStatus });
      Alert.alert("Успех", `Задача отмечена как "${newStatus}"`);
    } catch (error) {
      console.error("Ошибка обновления:", error);
      Alert.alert("Ошибка", "Не удалось обновить статус");
    }
  };

  const handleDelete = async () => {
    if (!task?._id || !token) return;

    Alert.alert(
      "Подтверждение",
      "Вы уверены, что хотите удалить эту задачу?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTask(task._id, token);
              Alert.alert("Успех", "Задача удалена");
              navigation.navigate("Home", { refreshed: true });
            } catch (error) {
              console.error("Ошибка удаления:", error);
              Alert.alert("Ошибка", "Не удалось удалить задачу");
            }
          }
        }
      ]
    );
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

  const getStatusIcon = () => {
    return task?.status === "выполнено" ? "checkmark-circle" : "time";
  };

  const getStatusColor = () => {
    return task?.status === "выполнено" ? "#4CAF50" : "#FF9800";
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#8BC34A', '#6B6F45']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Загрузка задачи...</Text>
      </LinearGradient>
    );
  }

  if (!task) {
    return (
      <LinearGradient
        colors={['#8BC34A', '#6B6F45']}
        style={styles.errorContainer}
      >
        <Ionicons name="alert-circle-outline" size={60} color="rgba(255,255,255,0.8)" />
        <Text style={styles.errorText}>Задача не найдена</Text>
        <TouchableOpacity 
          style={styles.backToHomeButton}
          onPress={() => navigation.navigate("Home", { refreshed: true })}
        >
          <Text style={styles.backToHomeText}>Вернуться к задачам</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#8BC34A', '#6B6F45', '#4A5D23']}
      style={styles.container}
    >
      {/* Декоративные элементы */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <View style={styles.backButtonContainer}>
                <Ionicons name="arrow-back" size={20} color="#6B6F45" />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Детали задачи</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Task Card */}
          <View style={styles.taskCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F9FA']}
              style={styles.taskCardGradient}
            >
              {/* Status Badge */}
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
                  <Ionicons 
                    name={getStatusIcon()} 
                    size={16} 
                    color={getStatusColor()} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor() }]}>
                    {task.status === "выполнено" ? "Выполнено" : "В процессе"}
                  </Text>
                </View>
              </View>

              {/* Task Title */}
              <Text style={styles.taskTitle}>{task.title}</Text>

              {/* Task Details */}
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="calendar-outline" size={20} color="#6B6F45" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Дата</Text>
                    <Text style={styles.detailValue}>{formatDate(task.date)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="time-outline" size={20} color="#6B6F45" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Время</Text>
                    <Text style={styles.detailValue}>{formatTime(task.time)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="flag-outline" size={20} color="#6B6F45" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Статус</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor() }]}>
                      {task.status === "выполнено" ? "Выполнено" : "В процессе"}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {/* Status Toggle */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={toggleTaskStatus}
            >
              <LinearGradient
                colors={task.status === "выполнено" ? ['#FF9800', '#F57C00'] : ['#4CAF50', '#45A049']}
                style={styles.actionButtonGradient}
              >
                <Ionicons 
                  name={task.status === "выполнено" ? "refresh" : "checkmark-circle"} 
                  size={20} 
                  color="#FFF" 
                />
                <Text style={styles.actionButtonText}>
                  {task.status === "выполнено" ? "Возобновить" : "Завершить"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("EditTaskForm", { task })}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="create-outline" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Редактировать</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <LinearGradient
                colors={['#F44336', '#D32F2F']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="trash-outline" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Удалить</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Additional Info */}
          <View style={styles.infoCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.infoCardGradient}
            >
              <Ionicons name="information-circle-outline" size={20} color="#FFF" />
              <Text style={styles.infoText}>
                Нажмите "Редактировать" чтобы изменить детали задачи
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
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
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
    fontWeight: '600',
  },
  backToHomeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backToHomeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -20,
    right: -20,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: 100,
    left: -20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerRight: {
    width: 40,
  },
  taskCard: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  taskCardGradient: {
    padding: 25,
  },
  statusContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 25,
    lineHeight: 30,
  },
  detailsContainer: {
    gap: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(107, 111, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(107, 111, 69, 0.7)',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  actionButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },
});
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
} from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenProps } from "../types";
import { createTask } from "../server/api";
import Ionicons from "react-native-vector-icons/Ionicons";
import { saveTaskPattern } from "../services/aiService";
import { LinearGradient } from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function CreationTask({ navigation }: ScreenProps<"Task">) {
  const [task, setTask] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [token, setToken] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

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

    // Анимация появления
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [navigation, fadeAnim, scaleAnim]);

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
      
      await saveTaskPattern(task); // обучение ИИ

      Alert.alert("Успех", "Задача успешно создана", [
        { text: "OK", onPress: () => navigation.navigate("Home", { refreshed: true }) }
      ]);
  
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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateDisplayText = () => {
    if (isToday(date)) return "Сегодня";
    if (isTomorrow(date)) return "Завтра";
    return formatDate(date);
  };

  return (
    <LinearGradient
      colors={['#8BC34A', '#6B6F45', '#4A5D23']}
      style={styles.container}
    >
      {/* Декоративные элементы */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

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

            <View style={styles.titleContainer}>
              <Text style={styles.title}>Создать задачу</Text>
              <Text style={styles.subtitle}>Добавьте новую задачу в ваш список</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F9FA']}
              style={styles.formGradient}
            >
              {/* Task Input */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>Название задачи</Text>
                <View style={styles.taskInputContainer}>
                  <View style={styles.taskIconContainer}>
                    <Ionicons name="create-outline" size={20} color="#6B6F45" />
                  </View>
                  <TextInput
                    style={styles.taskInput}
                    value={task}
                    onChangeText={setTask}
                    placeholder="Введите название"
                    placeholderTextColor="rgba(107, 111, 69, 0.5)"
                    multiline
                    maxLength={100}
                  />
                </View>
                <Text style={styles.charCounter}>{task.length}/100</Text>
              </View>

              {/* Date & Time Section */}
              <View style={styles.dateTimeSection}>
                <Text style={styles.sectionTitle}>Дата и время</Text>
                
                <View style={styles.dateTimeGrid}>
                  <TouchableOpacity 
                    style={styles.dateTimeCard} 
                    onPress={showDatePicker}
                  >
                    <LinearGradient
                      colors={['#F8F9FA', '#F0F2F5']}
                      style={styles.dateTimeCardGradient}
                    >
                      <View style={styles.dateTimeIcon}>
                        <Ionicons name="calendar" size={24} color="#6B6F45" />
                      </View>
                      <Text style={styles.dateTimeLabel}>Дата</Text>
                      <Text style={styles.dateTimeValue}>{getDateDisplayText()}</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.dateTimeCard} 
                    onPress={showTimePicker}
                  >
                    <LinearGradient
                      colors={['#F8F9FA', '#F0F2F5']}
                      style={styles.dateTimeCardGradient}
                    >
                      <View style={styles.dateTimeIcon}>
                        <Ionicons name="time" size={24} color="#6B6F45" />
                      </View>
                      <Text style={styles.dateTimeLabel}>Время</Text>
                      <Text style={styles.dateTimeValue}>{formatTime(time)}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActionsSection}>
                <Text style={styles.sectionTitle}>Быстрые действия</Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => {
                      const today = new Date();
                      today.setHours(9, 0, 0, 0);
                      setDate(today);
                      setTime(today);
                    }}
                  >
                    <Ionicons name="sunny" size={16} color="#FF9800" />
                    <Text style={styles.quickActionText}>Утром</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => {
                      const today = new Date();
                      today.setHours(14, 0, 0, 0);
                      setDate(today);
                      setTime(today);
                    }}
                  >
                    <Ionicons name="partly-sunny" size={16} color="#FFC107" />
                    <Text style={styles.quickActionText}>Днем</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => {
                      const today = new Date();
                      today.setHours(19, 0, 0, 0);
                      setDate(today);
                      setTime(today);
                    }}
                  >
                    <Ionicons name="moon" size={16} color="#9C27B0" />
                    <Text style={styles.quickActionText}>Вечером</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(9, 0, 0, 0);
                      setDate(tomorrow);
                      setTime(tomorrow);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#2196F3" />
                    <Text style={styles.quickActionText}>Завтра</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, !task.trim() && styles.saveButtonDisabled]} 
            onPress={saveTask}
            disabled={!task.trim()}
          >
            <LinearGradient
              colors={task.trim() ? ['#4CAF50', '#45A049'] : ['#E0E0E0', '#BDBDBD']}
              style={styles.saveButtonGradient}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color={task.trim() ? "#FFF" : "#999"} 
              />
              <Text style={[
                styles.saveButtonText,
                !task.trim() && styles.saveButtonTextDisabled
              ]}>
                Сохранить задачу
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -30,
    right: -30,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: 150,
    left: -30,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    top: height * 0.4,
    right: 20,
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
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '300',
  },
  formContainer: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  formGradient: {
    padding: 25,
  },
  inputSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B6F45',
    marginBottom: 12,
  },
  taskInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(107, 111, 69, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
  },
  taskIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 111, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  taskInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  charCounter: {
    textAlign: 'right',
    fontSize: 12,
    color: 'rgba(107, 111, 69, 0.6)',
    marginTop: 8,
  },
  dateTimeSection: {
    marginBottom: 30,
  },
  dateTimeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dateTimeCardGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  dateTimeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(107, 111, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: 'rgba(107, 111, 69, 0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 14,
    color: '#6B6F45',
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 111, 69, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(107, 111, 69, 0.15)',
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    color: '#6B6F45',
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    shadowColor: '#E0E0E0',
    shadowOpacity: 0.1,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  saveButtonTextDisabled: {
    color: "#999",
  },
});
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
import { ScreenProps, TASK_CATEGORIES } from "../types";
import { updateTask } from "../server/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { LinearGradient } from 'react-native-linear-gradient';
import { useTheme } from "./ThemeContext";

const { width, height } = Dimensions.get('window');

export default function EditTaskForm({ route, navigation }: ScreenProps<"EditTaskForm">) {
  const { theme } = useTheme();
  const { task } = route.params || {};
  const [title, setTitle] = useState(task?.title || "");
  const [date, setDate] = useState(parseDate(task?.date));
  const [time, setTime] = useState(parseTime(task?.time));
  const [selectedTags, setSelectedTags] = useState<string[]>(task?.tags || []);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [loading, setLoading] = useState(false);

  const styles = createThemedStyles(theme);

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

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

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
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [navigation, fadeAnim, scaleAnim]);

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
  
    setLoading(true);
  
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
        tags: selectedTags,
      };

      console.log('Data being sent:', updatedTask);
  
      const response = await updateTask(updatedTask, token);

      console.log('Server response:', response);
  
      if (response.error) {
        throw new Error(response.error);
      }
  
      Alert.alert("Успех", "Задача успешно обновлена", [
        { text: "OK", onPress: () => navigation.navigate("Home", { refreshed: true }) }
      ]);
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
    } finally {
      setLoading(false);
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
    return formatDateForDisplay(date);
  };

  return (
    <LinearGradient
      colors={theme.isDark ? 
        [theme.colors.background, theme.colors.surface, theme.colors.card] : 
        ['#8BC34A', '#6B6F45', '#4A5D23']
      }
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
                <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.title}>Редактирование</Text>
              <Text style={styles.subtitle}>Обновите детали задачи</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <LinearGradient
              colors={theme.isDark ? 
                [theme.colors.surface, theme.colors.card] : 
                ['#FFFFFF', '#F8F9FA']
              }
              style={styles.formGradient}
            >
              {/* Task Title Section */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>Название задачи</Text>
                <View style={styles.taskInputContainer}>
                  <View style={styles.taskIconContainer}>
                    <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <TextInput
                    style={styles.taskInput}
                    placeholder="Название задачи"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    multiline
                    maxLength={100}
                  />
                </View>
                <Text style={styles.charCounter}>{title.length}/100</Text>
              </View>

              {/* Categories Section */}
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionTitle}>Категории</Text>
                <View style={styles.tagsGrid}>
                  {TASK_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.name}
                      style={[
                        styles.tagItem,
                        selectedTags.includes(category.name) && {
                          backgroundColor: category.color + '20',
                          borderColor: category.color,
                        }
                      ]}
                      onPress={() => toggleTag(category.name)}
                    >
                      <Ionicons 
                        name={category.icon as any} 
                        size={16} 
                        color={selectedTags.includes(category.name) ? category.color : theme.colors.primary} 
                      />
                      <Text style={[
                        styles.tagText,
                        selectedTags.includes(category.name) && { color: category.color }
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date & Time Section */}
              <View style={styles.dateTimeSection}>
                <Text style={styles.sectionTitle}>Дата и время</Text>
                
                <View style={styles.dateTimeGrid}>
                  <TouchableOpacity 
                    style={styles.dateTimeCard} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <LinearGradient
                      colors={theme.isDark ? 
                        [theme.colors.card, theme.colors.background] : 
                        ['#F8F9FA', '#F0F2F5']
                      }
                      style={styles.dateTimeCardGradient}
                    >
                      <View style={styles.dateTimeIcon}>
                        <Ionicons name="calendar" size={24} color={theme.colors.primary} />
                      </View>
                      <Text style={styles.dateTimeLabel}>Дата</Text>
                      <Text style={styles.dateTimeValue}>{getDateDisplayText()}</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.dateTimeCard} 
                    onPress={() => setShowTimePicker(true)}
                  >
                    <LinearGradient
                      colors={theme.isDark ? 
                        [theme.colors.card, theme.colors.background] : 
                        ['#F8F9FA', '#F0F2F5']
                      }
                      style={styles.dateTimeCardGradient}
                    >
                      <View style={styles.dateTimeIcon}>
                        <Ionicons name="time" size={24} color={theme.colors.primary} />
                      </View>
                      <Text style={styles.dateTimeLabel}>Время</Text>
                      <Text style={styles.dateTimeValue}>{formatTimeForDisplay(time)}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status Section */}
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>Статус задачи</Text>
                <View style={styles.statusContainer}>
                  <View style={[
                    styles.statusBadge,
                    { 
                      backgroundColor: task?.status === "выполнено" ? 
                        (theme.isDark ? `${theme.colors.success}20` : '#E8F5E8') : 
                        (theme.isDark ? `${theme.colors.warning}20` : '#FFF3E0')
                    }
                  ]}>
                    <Ionicons 
                      name={task?.status === "выполнено" ? "checkmark-circle" : "time"} 
                      size={16} 
                      color={task?.status === "выполнено" ? theme.colors.success : theme.colors.warning} 
                    />
                    <Text style={[
                      styles.statusText,
                      { color: task?.status === "выполнено" ? theme.colors.success : theme.colors.warning }
                    ]}>
                      {task?.status === "выполнено" ? "Выполнено" : "В процессе"}
                    </Text>
                  </View>
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
                    <Ionicons name="sunny" size={16} color={theme.colors.warning} />
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
                    <Ionicons name="partly-sunny" size={16} color={theme.colors.accent} />
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
                    <Ionicons name="moon" size={16} color={theme.colors.secondary} />
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
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.accent} />
                    <Text style={styles.quickActionText}>Завтра</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, (!title.trim() || loading) && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={!title.trim() || loading}
          >
            <LinearGradient
              colors={title.trim() && !loading ? 
                [theme.colors.success, theme.isDark ? theme.colors.success + 'DD' : '#45A049'] : 
                [theme.colors.border, theme.colors.textSecondary]
              }
              style={styles.saveButtonGradient}
            >
              {loading ? (
                <>
                  <View style={styles.loadingSpinner}>
                    <Ionicons name="sync" size={20} color="#FFF" />
                  </View>
                  <Text style={styles.saveButtonText}>Сохранение...</Text>
                </>
              ) : (
                <>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={title.trim() ? "#FFF" : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.saveButtonText,
                    !title.trim() && styles.saveButtonTextDisabled
                  ]}>
                    Сохранить изменения
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Date Picker */}
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

      {/* Time Picker */}
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
    </LinearGradient>
  );
}

// Функция создания стилей с поддержкой тем
const createThemedStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}08` : 'rgba(255, 255, 255, 0.08)',
    top: -30,
    right: -30,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}06` : 'rgba(255, 255, 255, 0.06)',
    bottom: 150,
    left: -30,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}04` : 'rgba(255, 255, 255, 0.04)',
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
    backgroundColor: theme.isDark ? 
      theme.colors.surface : 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.text,
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
    color: theme.isDark ? theme.colors.text : "white",
    fontWeight: "bold",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.isDark ? 
      theme.colors.textSecondary : 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '300',
  },
  formContainer: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: theme.colors.text,
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
  categoriesSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  taskInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.isDark ? 
      theme.colors.background : '#F8F9FA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
  },
  taskIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}20` : 'rgba(107, 111, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  taskInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  charCounter: {
    textAlign: 'right',
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}15` : 'rgba(107, 111, 69, 0.05)',
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
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
    shadowColor: theme.colors.text,
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
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}20` : 'rgba(107, 111, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusSection: {
    marginBottom: 30,
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}15` : 'rgba(107, 111, 69, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.isDark ? 
      `${theme.colors.primary}30` : 'rgba(107, 111, 69, 0.15)',
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    shadowColor: theme.colors.border,
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
    color: theme.colors.textSecondary,
  },
  loadingSpinner: {
    // Можно добавить анимацию вращения здесь
  },
});
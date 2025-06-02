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
  ActivityIndicator,
} from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenProps, TASK_CATEGORIES } from "../types";
import { createTask } from "../server/api";
import Ionicons from "react-native-vector-icons/Ionicons";
import { saveTaskPattern } from "../services/aiService";
import { tensorflowLiteService } from "../services/tensorflowService"; // Новый импорт
import { LinearGradient } from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

// Интерфейс для анализа ИИ
interface TaskAnalysis {
  sentiment: {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    suggestion?: string;
    aiModelUsed: string;
  };
  category: string;
  estimatedDuration: number;
  priority: 'high' | 'medium' | 'low';
}

export default function CreationTask({ navigation }: ScreenProps<"Task">) {
  const [task, setTask] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  
  // Новые состояния для ИИ анализа
  const [taskAnalysis, setTaskAnalysis] = useState<TaskAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisAnim] = useState(new Animated.Value(0));

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

    // Инициализируем TensorFlow Lite
    tensorflowLiteService.initialize();

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

  // Анализ задачи в реальном времени
  useEffect(() => {
    if (task.length > 3) {
      const timer = setTimeout(async () => {
        setIsAnalyzing(true);
        try {
          console.log('🤖 Анализ задачи:', task);
          const analysis = await tensorflowLiteService.analyzeTask(task);
          setTaskAnalysis(analysis);
          setShowAnalysis(true);
          
          // Анимация появления анализа
          Animated.timing(analysisAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
          
          console.log('✅ Анализ завершен:', analysis);
        } catch (error) {
          console.error('❌ Ошибка анализа:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }, 1000); // Анализируем через 1 секунду после остановки печати

      return () => clearTimeout(timer);
    } else {
      setTaskAnalysis(null);
      setShowAnalysis(false);
      analysisAnim.setValue(0);
    }
  }, [task, analysisAnim]);

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

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
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
      // Получаем финальный анализ от ИИ
      let finalAnalysis = taskAnalysis;
      if (!finalAnalysis && task.length > 3) {
        console.log('🤖 Финальный анализ задачи...');
        finalAnalysis = await tensorflowLiteService.analyzeTask(task);
      }

      const taskData = {
        title: task,
        date: formatDate(date),
        time: formatTime(time),
        status: "в прогрессе",
        tags: selectedTags,
        // Добавляем результаты анализа ИИ
        analysis: finalAnalysis
      };
  
      console.log("Отправка данных:", taskData);
      
      const response = await createTask(
        taskData.title,
        taskData.date,
        taskData.time,
        taskData.status,
        taskData.tags,
        token
      );
  
      console.log("Ответ сервера:", response);
      
      await saveTaskPattern(task); // обучение ИИ

      // Показываем детальное сообщение с результатами анализа ИИ
      let alertMessage = "Задача успешно создана";
      if (finalAnalysis) {
        alertMessage += `\n\n🤖 Анализ ИИ:\n` +
          `📂 Категория: ${finalAnalysis.category}\n` +
          `⏱️ Время: ~${finalAnalysis.estimatedDuration} мин\n` +
          `🎯 Приоритет: ${finalAnalysis.priority === 'high' ? 'Высокий' : 
                          finalAnalysis.priority === 'medium' ? 'Средний' : 'Низкий'}\n` +
          `😊 Тональность: ${finalAnalysis.sentiment.sentiment === 'positive' ? 'Позитивная' : 
                            finalAnalysis.sentiment.sentiment === 'negative' ? 'Сложная' : 'Нейтральная'} ` +
          `(${Math.round(finalAnalysis.sentiment.confidence * 100)}%)`;
        
        if (finalAnalysis.sentiment.suggestion) {
          alertMessage += `\n\n💡 ${finalAnalysis.sentiment.suggestion}`;
        }
      }

      Alert.alert("Успех", alertMessage, [
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

  // Функции для отображения результатов анализа ИИ
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '#4CAF50';
      case 'negative': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😤';
      default: return '😐';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🚨';
      case 'medium': return '⚡';
      case 'low': return '😌';
      default: return '📋';
    }
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
              <Text style={styles.subtitle}>ИИ поможет с анализом и планированием</Text>
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
                    placeholder="Введите название (ИИ проанализирует автоматически)"
                    placeholderTextColor="rgba(107, 111, 69, 0.5)"
                    multiline
                    maxLength={100}
                  />
                  {isAnalyzing && (
                    <View style={styles.analyzingIndicator}>
                      <ActivityIndicator size="small" color="#6B6F45" />
                    </View>
                  )}
                </View>
                <Text style={styles.charCounter}>{task.length}/100</Text>
              </View>

              {/* AI Analysis Results */}
              {showAnalysis && taskAnalysis && (
                <Animated.View style={[
                  styles.aiAnalysisSection,
                  { opacity: analysisAnim }
                ]}>
                  <Text style={styles.sectionTitle}>🤖 Анализ ИИ (TensorFlow Lite)</Text>
                  
                  <View style={styles.analysisGrid}>
                    {/* Тональность */}
                    <View style={[styles.analysisCard, { borderLeftColor: getSentimentColor(taskAnalysis.sentiment.sentiment) }]}>
                      <View style={styles.analysisHeader}>
                        <Text style={styles.analysisIcon}>{getSentimentIcon(taskAnalysis.sentiment.sentiment)}</Text>
                        <Text style={styles.analysisTitle}>Тональность</Text>
                      </View>
                      <Text style={styles.analysisValue}>
                        {taskAnalysis.sentiment.sentiment === 'positive' ? 'Позитивная' : 
                         taskAnalysis.sentiment.sentiment === 'negative' ? 'Сложная' : 'Нейтральная'}
                      </Text>
                      <Text style={styles.analysisConfidence}>
                        Уверенность: {Math.round(taskAnalysis.sentiment.confidence * 100)}%
                      </Text>
                    </View>

                    {/* Категория */}
                    <View style={styles.analysisCard}>
                      <View style={styles.analysisHeader}>
                        <Text style={styles.analysisIcon}>📂</Text>
                        <Text style={styles.analysisTitle}>Категория</Text>
                      </View>
                      <Text style={styles.analysisValue}>{taskAnalysis.category}</Text>
                      <Text style={styles.analysisSubtext}>Автоопределение</Text>
                    </View>

                    {/* Время выполнения */}
                    <View style={styles.analysisCard}>
                      <View style={styles.analysisHeader}>
                        <Text style={styles.analysisIcon}>⏱️</Text>
                        <Text style={styles.analysisTitle}>Время</Text>
                      </View>
                      <Text style={styles.analysisValue}>~{taskAnalysis.estimatedDuration} мин</Text>
                      <Text style={styles.analysisSubtext}>Прогноз ИИ</Text>
                    </View>

                    {/* Приоритет */}
                    <View style={[styles.analysisCard, { borderLeftColor: getPriorityColor(taskAnalysis.priority) }]}>
                      <View style={styles.analysisHeader}>
                        <Text style={styles.analysisIcon}>{getPriorityIcon(taskAnalysis.priority)}</Text>
                        <Text style={styles.analysisTitle}>Приоритет</Text>
                      </View>
                      <Text style={[styles.analysisValue, { color: getPriorityColor(taskAnalysis.priority) }]}>
                        {taskAnalysis.priority === 'high' ? 'Высокий' : 
                         taskAnalysis.priority === 'medium' ? 'Средний' : 'Низкий'}
                      </Text>
                      <Text style={styles.analysisSubtext}>На основе анализа</Text>
                    </View>
                  </View>

                  {/* AI Suggestion */}
                  {taskAnalysis.sentiment.suggestion && (
                    <View style={styles.aiSuggestionContainer}>
                      <Text style={styles.aiSuggestionTitle}>💡 Рекомендация ИИ:</Text>
                      <Text style={styles.aiSuggestionText}>{taskAnalysis.sentiment.suggestion}</Text>
                    </View>
                  )}

                  {/* Model Info */}
                  <View style={styles.modelInfoContainer}>
                    <Text style={styles.modelInfoText}>
                      Модель: {taskAnalysis.sentiment.aiModelUsed} • Обработка: локально
                    </Text>
                  </View>
                </Animated.View>
              )}

              {/* Categories Section */}
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionTitle}>
                  Дополнительные категории
                  {taskAnalysis && (
                    <Text style={styles.aiSuggestedText}> (ИИ предложил: {taskAnalysis.category})</Text>
                  )}
                </Text>
                <View style={styles.tagsGrid}>
                  {TASK_CATEGORIES.map((category) => {
                    const isAISuggested = taskAnalysis && taskAnalysis.category === category.name;
                    return (
                      <TouchableOpacity
                        key={category.name}
                        style={[
                          styles.tagItem,
                          selectedTags.includes(category.name) && {
                            backgroundColor: category.color + '20',
                            borderColor: category.color,
                          },
                          isAISuggested && styles.aiSuggestedTag
                        ]}
                        onPress={() => toggleTag(category.name)}
                      >
                        <Ionicons 
                          name={category.icon as any} 
                          size={16} 
                          color={selectedTags.includes(category.name) ? category.color : '#6B6F45'} 
                        />
                        <Text style={[
                          styles.tagText,
                          selectedTags.includes(category.name) && { color: category.color }
                        ]}>
                          {category.name}
                        </Text>
                        {isAISuggested && (
                          <View style={styles.aiSuggestedBadge}>
                            <Text style={styles.aiSuggestedBadgeText}>ИИ</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
                {taskAnalysis ? 'Сохранить с анализом ИИ' : 'Сохранить задачу'}
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
  categoriesSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B6F45',
    marginBottom: 12,
  },
  aiSuggestedText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#4CAF50',
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
  analyzingIndicator: {
    marginLeft: 8,
    marginTop: 4,
  },
  charCounter: {
    textAlign: 'right',
    fontSize: 12,
    color: 'rgba(107, 111, 69, 0.6)',
    marginTop: 8,
  },

  // AI Analysis Section Styles
  aiAnalysisSection: {
    marginBottom: 30,
    backgroundColor: 'rgba(139, 195, 74, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.2)',
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  analysisCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  analysisTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6F45',
  },
  analysisValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  analysisConfidence: {
    fontSize: 10,
    color: '#666',
  },
  analysisSubtext: {
    fontSize: 10,
    color: '#999',
  },
  aiSuggestionContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  aiSuggestionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  aiSuggestionText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  modelInfoContainer: {
    backgroundColor: 'rgba(107, 111, 69, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
  modelInfoText: {
    fontSize: 10,
    color: '#6B6F45',
    textAlign: 'center',
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
    borderColor: 'rgba(107, 111, 69, 0.2)',
    backgroundColor: 'rgba(107, 111, 69, 0.05)',
    gap: 6,
  },
  aiSuggestedTag: {
    borderColor: 'rgba(76, 175, 80, 0.5)',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B6F45',
  },
  aiSuggestedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  aiSuggestedBadgeText: {
    fontSize: 8,
    color: '#FFF',
    fontWeight: 'bold',
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
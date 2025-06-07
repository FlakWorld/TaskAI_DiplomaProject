// screens/AIChatScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ChatGPTService from '../services/chatGPTService';
import { getTasks } from '../server/api';
import { ScreenProps } from '../types';
import { Image } from 'react-native';
import DinoImage from '../assets/dino.jpg';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');

type Task = {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  status: "в прогрессе" | "выполнено";
  tags?: string[];
};

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  hasTaskSuggestion?: boolean;
}

const AIChatScreen: React.FC<ScreenProps<'AIChat'>> = ({ navigation }) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState('Пользователь');
  const [token, setToken] = useState<string | null>(null);
  const [chatService] = useState(() => new ChatGPTService());
  const scrollViewRef = useRef<ScrollView>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const styles = createThemedStyles(theme);

  // Ключ для сохранения истории чата для конкретного пользователя
  const getChatHistoryKey = (userId: string) => `chat_history_${userId}`;

  // Сохранение истории чата
  const saveChatHistory = useCallback(async (chatMessages: ChatMessage[], userId: string) => {
    try {
      const historyKey = getChatHistoryKey(userId);
      const historyData = {
        messages: chatMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(), // Конвертируем Date в string для JSON
        })),
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(historyKey, JSON.stringify(historyData));
    } catch (error) {
      console.error('Ошибка сохранения истории чата:', error);
    }
  }, []);

  // Загрузка истории чата
  const loadChatHistory = useCallback(async (userId: string): Promise<ChatMessage[]> => {
    try {
      const historyKey = getChatHistoryKey(userId);
      const historyData = await AsyncStorage.getItem(historyKey);
      
      if (historyData) {
        const parsed = JSON.parse(historyData);
        return parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp), // Конвертируем string обратно в Date
        }));
      }
    } catch (error) {
      console.error('Ошибка загрузки истории чата:', error);
    }
    return [];
  }, []);

  // Очистка истории чата
  const clearChatHistory = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);
      const userId = user.id || user._id || user.email;
      
      if (!userId) return;

      Alert.alert(
        'Очистить историю чата?',
        'Все сообщения будут удалены без возможности восстановления.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Очистить',
            style: 'destructive',
            onPress: async () => {
              try {
                const historyKey = getChatHistoryKey(userId);
                await AsyncStorage.removeItem(historyKey);
                setMessages([]);
                // Добавляем приветственное сообщение после очистки
                setTimeout(() => {
                  addWelcomeMessage();
                }, 100);
              } catch (error) {
                console.error('Ошибка очистки истории чата:', error);
                Alert.alert('Ошибка', 'Не удалось очистить историю чата');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Ошибка получения данных пользователя:', error);
    }
  }, []);

  // Форматирование даты и времени для отображения (как в HomeScreen)
  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return "";
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) return dateString;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return "";
    }
  };

  const formatDisplayTime = (timeString?: string) => {
    if (!timeString) return "";
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;

    try {
      const timePart = timeString.includes("T") ? timeString.split("T")[1] : timeString;
      const time = new Date(`1970-01-01T${timePart}Z`);
      if (isNaN(time.getTime())) return "";
      const hours = String(time.getHours()).padStart(2, "0");
      const minutes = String(time.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const loadTasks = useCallback(async (userToken: string) => {
    try {
      const data = await getTasks(userToken);

      if (!Array.isArray(data)) {
        console.error("Invalid tasks data format");
        return;
      }

      // Форматируем задачи как в HomeScreen
      const formattedTasks = data.map((task: any) => ({
        ...task,
        date: formatDisplayDate(task.date),
        time: formatDisplayTime(task.time),
        status: task.status || "в прогрессе",
        tags: task.tags || [],
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
      // При ошибке загрузки задач не показываем alert, просто логируем
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    if (token) {
      await loadTasks(token);
    }
  }, [token, loadTasks]);

  const addWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      text: `Привет${userName !== 'Пользователь' ? `, ${userName}` : ''}! 👋\n\nЯ твой AI помощник по задачам. Могу помочь с:\n\n🔍 Анализом продуктивности\n📅 Планированием дня\n✨ Созданием новых задач\n💪 Мотивацией и поддержкой\n📊 Изучением твоих паттернов\n\nО чем хочешь поговорить?`,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  useEffect(() => {
    const initializeChat = async () => {
      setIsLoadingHistory(true);
      await chatService.initialize();
      
      // Загружаем данные пользователя
      const userData = await AsyncStorage.getItem("user");
      let userId = null;
      
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Пользователь');
        // Используем стабильный идентификатор пользователя
        userId = user.id || user._id || user.email;
      }
      
      // Загружаем токен и задачи
      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        await loadTasks(storedToken);
      }
      
      // Загружаем историю чата только если есть стабильный ID пользователя
      if (userId) {
        const chatHistory = await loadChatHistory(userId);
        
        if (chatHistory.length > 0) {
          setMessages(chatHistory);
        } else {
          // Добавляем приветственное сообщение только если нет истории
          setTimeout(() => {
            addWelcomeMessage();
          }, 100);
        }
      } else {
        // Если нет ID пользователя, показываем приветственное сообщение
        setTimeout(() => {
          addWelcomeMessage();
        }, 100);
      }
      
      setIsLoadingHistory(false);
      
      // Анимация появления
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };

    initializeChat();
  }, [fadeAnim, chatService, loadTasks, loadChatHistory]);

  // Обновляем задачи при фокусе на экране
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (token) {
        loadTasks(token);
      }
    });

    return unsubscribe;
  }, [navigation, token, loadTasks]);

  // Сохраняем историю чата при изменении сообщений
  useEffect(() => {
    const saveHistory = async () => {
      if (messages.length > 0 && !isLoadingHistory) {
        try {
          const userData = await AsyncStorage.getItem("user");
          if (userData) {
            const user = JSON.parse(userData);
            const userId = user.id || user._id || user.email;
            if (userId) {
              await saveChatHistory(messages, userId);
            }
          }
        } catch (error) {
          console.error('Ошибка при сохранении истории:', error);
        }
      }
    };

    saveHistory();
  }, [messages, saveChatHistory, isLoadingHistory]);

  const addMessage = (text: string, isUser: boolean, hasTaskSuggestion: boolean = false) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
      hasTaskSuggestion,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Проверяем готовность сервиса
    if (!chatService.isReady()) {
      Alert.alert(
        'Настройка требуется',
        'Для работы AI помощника необходимо настроить API ключ OpenAI. Обратитесь к разработчику.',
        [{ text: 'Понятно' }]
      );
      return;
    }

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Добавляем сообщение пользователя
    addMessage(userMessage, true);

    // Обновляем задачи перед отправкой для актуальных данных
    if (token) {
      await loadTasks(token);
    }

    try {
      const response = await chatService.getChatResponse({
        userMessage,
        userContext: {
          tasks,
          userName,
          currentDate: new Date().toLocaleDateString('ru-RU'),
        },
      });

      // Добавляем ответ AI
      const hasTaskSuggestion = response.suggestedActions?.some(action => action.type === 'create_task') || false;
      addMessage(response.message, false, hasTaskSuggestion);

      // Обрабатываем предложенные действия
      if (response.suggestedActions) {
        handleSuggestedActions(response.suggestedActions);
      }

    } catch (error: any) {
      console.error('Chat Error:', error);
      
      // Показываем конкретное сообщение об ошибке
      const errorMessage = error.message || 'Извини, произошла ошибка. Проверь интернет соединение и попробуй еще раз. 😔';
      addMessage(errorMessage, false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedActions = (actions: any[]) => {
    actions.forEach(action => {
      if (action.type === 'create_task') {
        setTimeout(() => {
          Alert.alert(
            'Создать новую задачу? ✨',
            'AI предлагает создать задачу на основе нашего разговора. Хотите перейти к созданию?',
            [
              { text: 'Нет', style: 'cancel' },
              { 
                text: 'Да, создать!', 
                onPress: () => {
                  // После создания задачи, обновляем список при возврате
                  const unsubscribe = navigation.addListener('focus', () => {
                    if (token) {
                      loadTasks(token);
                    }
                    unsubscribe();
                  });
                  navigation.navigate('Task', { id: undefined });
                }
              },
            ]
          );
        }, 1000);
      }
    });
  };

  const sendQuickMessage = async (message: string) => {
    setInputText(message);
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  const handleAnalysisAction = async (type: string) => {
    // Проверяем готовность сервиса
    if (!chatService.isReady()) {
      Alert.alert(
        'Настройка требуется',
        'Для работы AI помощника необходимо настроить API ключ OpenAI. Обратитесь к разработчику.',
        [{ text: 'Понятно' }]
      );
      return;
    }

    setIsLoading(true);
    
    // Обновляем задачи перед анализом для актуальных данных
    if (token) {
      await loadTasks(token);
    }
    
    try {
      let response = '';
      
      switch (type) {
        case 'productivity':
          response = await chatService.analyzeProductivity(tasks);
          break;
        case 'daily_plan':
          response = await chatService.suggestDailyPlan(tasks);
          break;
        case 'motivation':
          response = await chatService.getMotivationalMessage(tasks);
          break;
        case 'patterns':
          response = await chatService.analyzeTaskPatterns(tasks);
          break;
        case 'weekly':
          response = await chatService.getWeeklyInsights(tasks);
          break;
        default:
          response = 'Функция пока не реализована';
      }
      
      addMessage(response, false);
    } catch (error: any) {
      console.error('Analysis Error:', error);
      
      // Показываем конкретное сообщение об ошибке
      const errorMessage = error.message || 'Произошла ошибка при анализе. Попробуйте еще раз. 😔';
      addMessage(errorMessage, false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const getTasksStats = () => {
    const completed = tasks.filter(t => t.status === 'выполнено').length;
    const inProgress = tasks.filter(t => t.status === 'в прогрессе').length;
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const todayTasks = tasks.filter(t => t.date === todayStr).length;
    
    return { total: tasks.length, completed, inProgress, todayTasks };
  };

  const quickActions = [
    { title: 'Как дела с задачами?', icon: 'checkmark-circle-outline', action: () => sendQuickMessage('Как дела с моими задачами?') },
    { title: 'Анализ продуктивности', icon: 'analytics-outline', action: () => handleAnalysisAction('productivity') },
    { title: 'Спланируй день', icon: 'calendar-outline', action: () => handleAnalysisAction('daily_plan') },
    { title: 'Дай мотивацию!', icon: 'flash-outline', action: () => handleAnalysisAction('motivation') },
    { title: 'Мои паттерны', icon: 'trending-up-outline', action: () => handleAnalysisAction('patterns') },
    { title: 'Недельный отчет', icon: 'bar-chart-outline', action: () => handleAnalysisAction('weekly') },
  ];

  const stats = getTasksStats();

  return (
    <LinearGradient
      colors={theme.isDark ? 
        [theme.colors.background, theme.colors.surface] : 
        ['#8BC34A', '#6B6F45']
      }
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <LinearGradient
              colors={theme.isDark ? 
                [theme.colors.surface, theme.colors.card] : 
                ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']
              }
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={24} color={theme.isDark ? theme.colors.text : "#FFF"} />
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <View style={styles.aiAvatar}>
                <Image source={DinoImage} style={styles.aiAvatarImage} />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>AI Помощник</Text>
                <Text style={styles.headerSubtitle}>
                  {stats.total} задач • {stats.completed} выполнено • {stats.todayTasks} на сегодня
                </Text>
              </View>
              
              {/* Кнопка очистки чата */}
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearChatHistory}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <LinearGradient
                  colors={theme.isDark ? 
                    [theme.colors.surface, theme.colors.card] : 
                    ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']
                  }
                  style={styles.clearButtonGradient}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.isDark ? theme.colors.text : "#FFF"} />
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Кнопка обновления задач */}
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={refreshTasks}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <LinearGradient
                  colors={theme.isDark ? 
                    [theme.colors.surface, theme.colors.card] : 
                    ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']
                  }
                  style={styles.refreshButtonGradient}
                >
                  <Ionicons name="refresh" size={20} color={theme.isDark ? theme.colors.text : "#FFF"} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Chat Container */}
        <View style={styles.chatWrapper}>
          <LinearGradient
            colors={theme.isDark ? 
              [theme.colors.surface, theme.colors.card] : 
              ['#FFFFFF', '#F8F9FA']
            }
            style={styles.chatContainer}
          >
            {isLoadingHistory ? (
              <View style={styles.loadingHistoryContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingHistoryText}>Загрузка истории чата...</Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.messagesContent}
              >
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageContainer,
                      message.isUser ? styles.userMessage : styles.aiMessage,
                    ]}
                  >
                    <LinearGradient
                      colors={message.isUser 
                        ? (theme.isDark ? [theme.colors.primary, theme.colors.secondary] : ['#8BC34A', '#6B6F45'])
                        : (theme.isDark ? [theme.colors.card, theme.colors.surface] : ['#FFFFFF', '#F8F9FA'])
                      }
                      style={styles.messageGradient}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          { color: message.isUser ? '#FFF' : theme.colors.text },
                        ]}
                      >
                        {message.text}
                      </Text>
                      
                      {message.hasTaskSuggestion && (
                        <TouchableOpacity
                          style={styles.taskSuggestionButton}
                          onPress={() => navigation.navigate('Task', { id: undefined })}
                        >
                          <Ionicons name="add-circle" size={16} color="#FFF" />
                          <Text style={styles.taskSuggestionText}>Создать задачу</Text>
                        </TouchableOpacity>
                      )}
                      
                      <Text
                        style={[
                          styles.timestamp,
                          { color: message.isUser ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary },
                        ]}
                      >
                        {message.timestamp.toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </LinearGradient>
                  </View>
                ))}

                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <LinearGradient
                      colors={theme.isDark ? 
                        [theme.colors.card, theme.colors.surface] : 
                        ['#FFFFFF', '#F8F9FA']
                      }
                      style={styles.loadingGradient}
                    >
                      <View style={styles.aiAvatar}>
                        <Image source={DinoImage} style={styles.aiAvatarImage} />
                      </View>
                      <View style={styles.loadingContent}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>AI думает...</Text>
                      </View>
                    </LinearGradient>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Quick Actions - всегда доступны */}
            {!isLoadingHistory && (
              <View style={styles.quickActionsSection}>
                <Text style={styles.quickActionsTitle}>Быстрые действия:</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickActionsScroll}
                >
                  {quickActions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickActionButton}
                      onPress={action.action}
                    >
                      <LinearGradient
                        colors={theme.isDark ? 
                          [`${theme.colors.primary}20`, `${theme.colors.primary}10`] : 
                          ['rgba(139, 195, 74, 0.1)', 'rgba(107, 111, 69, 0.1)']
                        }
                        style={styles.quickActionGradient}
                      >
                        <Ionicons name={action.icon as any} size={20} color={theme.colors.primary} />
                        <Text style={styles.quickActionText}>{action.title}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Input Container */}
            {!isLoadingHistory && (
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <LinearGradient
                    colors={theme.isDark ? 
                      [theme.colors.background, theme.colors.surface] : 
                      ['#F8F9FA', '#FFFFFF']
                    }
                    style={styles.inputGradient}
                  >
                    <TextInput
                      style={styles.textInput}
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder="Спроси что-нибудь о своих задачах..."
                      placeholderTextColor={theme.colors.textSecondary}
                      multiline
                      maxLength={500}
                      returnKeyType="send"
                      onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity
                      style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
                      onPress={sendMessage}
                      disabled={!inputText.trim() || isLoading}
                    >
                      <LinearGradient
                        colors={theme.isDark ? 
                          [theme.colors.primary, theme.colors.secondary] : 
                          ['#8BC34A', '#6B6F45']
                        }
                        style={styles.sendButtonGradient}
                      >
                        <Ionicons name="send" size={20} color="#FFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

// Функция создания стилей с поддержкой тем
const createThemedStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 16,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  aiAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  titleContainer: {
    flex: 1,
  },
  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    marginLeft: 8,
  },
  clearButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginLeft: 8,
  },
  refreshButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.isDark ? theme.colors.text : '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.isDark ? 
      theme.colors.textSecondary : 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  chatWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  chatContainer: {
    flex: 1,
  },
  loadingHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingHistoryText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 6,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  messageGradient: {
    padding: 14,
    borderRadius: 16,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  taskSuggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  taskSuggestionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignSelf: 'flex-start',
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: '85%',
  },
  loadingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  quickActionsScroll: {
    flexDirection: 'row',
  },
  quickActionButton: {
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIChatScreen;
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { register } from "../server/api";
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from "react-native-vector-icons/Ionicons";

// Импортируем автоматическую тему
import { useAutoTheme } from './useAutoTheme';
import { getTimeIcon, getTimeText } from './authThemeStyles';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  // Используем автоматическую тему
  const { theme, isDayTime, isAutoMode } = useAutoTheme();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [secureEntry, setSecureEntry] = useState(true);
  const [loading, setLoading] = useState(false);

  // Функция для получения градиента в зависимости от времени и темы
  const getBackgroundGradient = () => {
    if (theme.isDark) {
      return isDayTime 
        ? ['#1E3A8A', '#3B82F6', '#60A5FA'] // Дневные синие тона для темной темы
        : ['#0F172A', '#1E293B', '#334155']; // Ночные серые тона
    } else {
      return isDayTime 
        ? ['#8BC34A', '#6B6F45', '#4A5D23'] // Ваш оригинальный дневной градиент
        : ['#3F51B5', '#5C6BC0', '#7986CB']; // Ночные фиолетовые тона
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name || !surname) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все поля");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Ошибка", "Пароль должен содержать минимум 6 символов");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Ошибка", "Введите корректный email адрес");
      return;
    }

    setLoading(true);
    try {
      const res = await register(email, password, name, surname);
      
      if (res.error) {
        Alert.alert("Ошибка", res.error);
      } else if (res.emailSent) {
        Alert.alert(
          "Регистрация успешна!", 
          res.message,
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("EmailVerification", { email })
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Не удалось зарегистрироваться");
    } finally {
      setLoading(false);
    }
  };

  // Создаем стили с поддержкой автоматической темы
  const styles = createThemedStyles(theme, isDayTime);

  return (
    <LinearGradient
      colors={getBackgroundGradient()}
      style={styles.container}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Индикатор автоматической темы */}
          {isAutoMode && (
            <View style={styles.timeIndicator}>
              <Text style={styles.timeIndicatorIcon}>
                {getTimeIcon(isDayTime)}
              </Text>
              <Text style={styles.timeIndicatorText}>
                Авто • {getTimeText(isDayTime)}
              </Text>
            </View>
          )}

          {/* Декоративные элементы */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />
          
          <View style={styles.content}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {isDayTime ? 'Добро пожаловать!' : 'Присоединяйтесь к нам!'}
              </Text>
              <Text style={styles.subtitle}>Создайте свой аккаунт</Text>
              <View style={styles.titleUnderline} />
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { marginRight: 10 }]}>
                  <Text style={styles.label}>Имя</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ваше имя"
                      placeholderTextColor={theme.isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 111, 69, 0.6)'}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, { marginLeft: 10 }]}>
                  <Text style={styles.label}>Фамилия</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ваша фамилия"
                      placeholderTextColor={theme.isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 111, 69, 0.6)'}
                      value={surname}
                      onChangeText={setSurname}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@email.com"
                    placeholderTextColor={theme.isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 111, 69, 0.6)'}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Пароль</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Минимум 6 символов"
                    placeholderTextColor={theme.isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 111, 69, 0.6)'}
                    secureTextEntry={secureEntry}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    onPress={() => setSecureEntry(!secureEntry)}
                    style={styles.eyeIcon}
                    disabled={loading}
                  >
                    <Ionicons 
                      name={secureEntry ? "eye-off" : "eye"} 
                      size={20} 
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.button, loading && styles.disabledButton]} 
                onPress={handleRegister}
                disabled={loading}
              >
                <LinearGradient
                  colors={theme.isDark ? [theme.colors.surface, theme.colors.card] : ['#FFF', '#F8F8F8']}
                  style={styles.buttonGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 0, y: 1}}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Создание аккаунта..." : "Создать аккаунт"}
                  </Text>
                  {!loading && (
                    <View style={styles.buttonIcon}>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>Что вас ждет:</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Text style={styles.featureIconText}>🤖</Text>
                    </View>
                    <Text style={styles.featureText}>ИИ-помощник для создания задач</Text>
                  </View>
                  
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Text style={styles.featureIconText}>📱</Text>
                    </View>
                    <Text style={styles.featureText}>Синхронизация между устройствами</Text>
                  </View>
                  
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Text style={styles.featureIconText}>⚡</Text>
                    </View>
                    <Text style={styles.featureText}>Умные напоминания</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Text style={styles.featureIconText}>
                        {isDayTime ? '☀️' : '🌙'}
                      </Text>
                    </View>
                    <Text style={styles.featureText}>
                      Автоматическая {isDayTime ? 'дневная' : 'ночная'} тема
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.loginLink}
                onPress={() => navigation.navigate("Login")}
                disabled={loading}
              >
                <Text style={styles.loginText}>
                  Уже есть аккаунт? <Text style={styles.loginHighlight}>Войти</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </LinearGradient>
  );
};

// Создаем стили с поддержкой темы
const createThemedStyles = (theme: any, isDayTime: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  keyboardView: {
    flex: 1,
  },
  timeIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 
      'rgba(0, 0, 0, 0.3)' : 
      'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
  },
  timeIndicatorIcon: {
    fontSize: 16,
  },
  timeIndicatorText: {
    fontSize: 12,
    color: theme.isDark ? theme.colors.text : '#FFFFFF',
    fontWeight: '500',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -80,
    right: -80,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: 50,
    left: -40,
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
  content: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
    paddingVertical: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.isDark ? theme.colors.text : "#FFF",
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.isDark ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 8,
    fontWeight: '300',
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: theme.isDark ? theme.colors.primary : '#FFF',
    marginTop: 12,
    borderRadius: 2,
  },
  formContainer: {
    backgroundColor: theme.isDark ? 
      `${theme.colors.surface}95` : 
      'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 20,
  },
  label: {
    color: theme.colors.primary,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? theme.colors.card : '#F8F9FA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.isDark ? 
      `${theme.colors.primary}30` : 
      'rgba(107, 111, 69, 0.2)',
  },
  inputIcon: {
    marginLeft: 15,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 15,
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    borderRadius: 15,
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginRight: 8,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresContainer: {
    marginTop: 25,
    marginBottom: 15,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}20` : 
      'rgba(107, 111, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureIconText: {
    fontSize: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: theme.isDark ? 
      theme.colors.textSecondary : 
      'rgba(107, 111, 69, 0.8)',
    fontWeight: '500',
  },
  loginLink: {
    marginTop: 20,
    alignItems: "center",
  },
  loginText: {
    color: theme.isDark ? 
      theme.colors.textSecondary : 
      "rgba(107, 111, 69, 0.8)",
    fontSize: 14,
  },
  loginHighlight: {
    color: theme.colors.primary,
    fontWeight: "bold",
  },
});

export default RegisterScreen;
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { resendVerification } from "../server/api";
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from "react-native-vector-icons/Ionicons";

// Импортируем автоматическую тему
import { useAutoTheme } from './useAutoTheme';
import { getTimeIcon, getTimeText } from './authThemeStyles';

type Props = NativeStackScreenProps<RootStackParamList, "EmailVerification">;

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  // Используем автоматическую тему
  const { theme, isDayTime, isAutoMode } = useAutoTheme();
  
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { email } = route.params;

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (cooldown > 0) return;
    
    setLoading(true);
    try {
      const result = await resendVerification(email);
      if (result.emailSent) {
        Alert.alert(
          "Успех", 
          "Письмо отправлено повторно! Проверьте свою почту.",
          [{ text: "OK" }]
        );
        setCooldown(60); // 60 секунд кулдаун
      }
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Не удалось отправить письмо");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate("Login");
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

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={60} color={theme.colors.primary} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isDayTime ? 'Проверьте свою почту' : 'Письмо отправлено!'}
          </Text>
          <Text style={styles.subtitle}>
            Мы отправили письмо с подтверждением на:
          </Text>
          <Text style={styles.email}>{email}</Text>
          
          <Text style={styles.description}>
            Нажмите на ссылку в письме, чтобы подтвердить свой email адрес и завершить регистрацию.
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[
              styles.resendButton, 
              (loading || cooldown > 0) && styles.disabledButton
            ]} 
            onPress={handleResendEmail}
            disabled={loading || cooldown > 0}
          >
            <LinearGradient
              colors={theme.isDark ? [theme.colors.surface, theme.colors.card] : ['#FFF', '#F8F8F8']}
              style={styles.buttonGradient}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 1}}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color={theme.colors.primary} style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>
                    {cooldown > 0 
                      ? `Отправить повторно (${cooldown}с)` 
                      : "Отправить повторно"
                    }
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToLogin}
          >
            <Text style={styles.backButtonText}>
              Вернуться к входу
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <View style={styles.helpItem}>
            <Ionicons 
              name="information-circle" 
              size={20} 
              color={theme.isDark ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.8)"} 
            />
            <Text style={styles.helpText}>
              Не видите письмо? Проверьте папку "Спам"
            </Text>
          </View>
          
          <View style={styles.helpItem}>
            <Ionicons 
              name="time" 
              size={20} 
              color={theme.isDark ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.8)"} 
            />
            <Text style={styles.helpText}>
              Ссылка действительна 24 часа
            </Text>
          </View>

          <View style={styles.helpItem}>
            <Text style={styles.helpIcon}>
              {isDayTime ? '☀️' : '🌙'}
            </Text>
            <Text style={styles.helpText}>
              {isDayTime ? 
                'Дневная тема автоматически активна' : 
                'Ночная тема автоматически активна'
              }
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

// Создаем стили с поддержкой темы
const createThemedStyles = (theme: any, isDayTime: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  timeIndicator: {
    position: 'absolute',
    top: 50,
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
  content: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.isDark ? 
      `${theme.colors.surface}95` : 
      'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.isDark ? theme.colors.text : "#FFF",
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.isDark ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: theme.isDark ? theme.colors.text : "#FFF",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 20,
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}20` : 
      'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  description: {
    fontSize: 14,
    color: theme.isDark ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 30,
  },
  resendButton: {
    borderRadius: 15,
    marginBottom: 15,
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
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 15,
  },
  backButtonText: {
    color: theme.isDark ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "500",
  },
  helpContainer: {
    width: '100%',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  helpIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  helpText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: theme.isDark ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
});

export default EmailVerificationScreen;
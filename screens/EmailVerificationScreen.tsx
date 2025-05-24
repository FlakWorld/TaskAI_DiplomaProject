import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { resendVerification } from "../server/api";
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from "react-native-vector-icons/Ionicons";

type Props = NativeStackScreenProps<RootStackParamList, "EmailVerification">;

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { email } = route.params;

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

  return (
    <LinearGradient
      colors={['#8BC34A', '#6B6F45', '#4A5D23']}
      style={styles.container}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={60} color="#8BC34A" />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Проверьте свою почту</Text>
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
              colors={['#FFF', '#F8F8F8']}
              style={styles.buttonGradient}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 1}}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#6B6F45" />
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color="#6B6F45" style={styles.buttonIcon} />
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
            <Ionicons name="information-circle" size={20} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.helpText}>
              Не видите письмо? Проверьте папку "Спам"
            </Text>
          </View>
          
          <View style={styles.helpItem}>
            <Ionicons name="time" size={20} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.helpText}>
              Ссылка действительна 24 часа
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: "#FFF",
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: "#FFF",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  description: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
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
    shadowColor: '#6B6F45',
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
    color: "#6B6F45",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 15,
  },
  backButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
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
  helpText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
});

export default EmailVerificationScreen;
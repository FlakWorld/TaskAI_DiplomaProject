import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { register } from "../server/api";
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from "react-native-vector-icons/Ionicons";

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [secureEntry, setSecureEntry] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name || !surname) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все поля");
      return;
    }
    try {
      // Предполагается, что API /register принимает name и surname, если нет — надо добавить на сервере
      const res = await register(email, password, name, surname);
      if (res.error) {
        Alert.alert("Ошибка", res.error);
      } else {
        Alert.alert("Успех", "Аккаунт создан");
        navigation.navigate("Login");
      }
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось зарегистрироваться");
    }
  };

  return (
    <LinearGradient
      colors={['#8BC34A', '#6B6F45', '#4A5D23']}
      style={styles.container}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Декоративные элементы */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />
          
          <View style={styles.content}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Добро пожаловать!</Text>
              <Text style={styles.subtitle}>Создайте свой аккаунт</Text>
              <View style={styles.titleUnderline} />
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { marginRight: 10 }]}>
                  <Text style={styles.label}>Имя</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#6B6F45" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ваше имя"
                      placeholderTextColor="rgba(107, 111, 69, 0.6)"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, { marginLeft: 10 }]}>
                  <Text style={styles.label}>Фамилия</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#6B6F45" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ваша фамилия"
                      placeholderTextColor="rgba(107, 111, 69, 0.6)"
                      value={surname}
                      onChangeText={setSurname}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#6B6F45" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@email.com"
                    placeholderTextColor="rgba(107, 111, 69, 0.6)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Пароль</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6B6F45" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Минимум 6 символов"
                    placeholderTextColor="rgba(107, 111, 69, 0.6)"
                    secureTextEntry={secureEntry}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity 
                    onPress={() => setSecureEntry(!secureEntry)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={secureEntry ? "eye-off" : "eye"} 
                      size={20} 
                      color="#6B6F45" 
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
                  colors={['#FFF', '#F8F8F8']}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  keyboardView: {
    flex: 1,
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
    color: "#FFF",
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 8,
    fontWeight: '300',
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: '#FFF',
    marginTop: 12,
    borderRadius: 2,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    color: "#6B6F45",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(107, 111, 69, 0.2)',
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
    color: "#333",
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    borderRadius: 15,
    marginTop: 10,
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
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6B6F45",
    marginRight: 8,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6B6F45',
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
    color: '#6B6F45',
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
    backgroundColor: 'rgba(107, 111, 69, 0.1)',
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
    color: 'rgba(107, 111, 69, 0.8)',
    fontWeight: '500',
  },
  loginLink: {
    marginTop: 20,
    alignItems: "center",
  },
  loginText: {
    color: "rgba(107, 111, 69, 0.8)",
    fontSize: 14,
  },
  loginHighlight: {
    color: "#6B6F45",
    fontWeight: "bold",
  },
});

export default RegisterScreen;

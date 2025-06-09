import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  ScrollView
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login, microsoftAuth } from "../server/api";
import Ionicons from "react-native-vector-icons/Ionicons";
import { authorize, AuthConfiguration } from 'react-native-app-auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'react-native-linear-gradient';

// Импортируем автоматическую тему и локализацию
import { useAutoTheme } from './useAutoTheme';
import { getTimeIcon, getTimeText } from './authThemeStyles';
import { useLocalization } from './LocalizationContext';
import LanguageSwitcher from './LanguageSwitcher';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

type AuthResult = {
  accessToken: string;
  accessTokenExpirationDate: string;
  additionalParameters?: Record<string, unknown>;
  idToken?: string;
  refreshToken?: string;
  tokenType?: string;
  scopes?: string[];
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  // Используем автоматическую тему и локализацию
  const { theme, isDayTime, isAutoMode } = useAutoTheme();
  const { t } = useLocalization(); // Убрали loadUserLanguage
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '221855869276-6egb238f5i1ivimtrgme6s9nm9bdtad1.apps.googleusercontent.com'
    });
  }, []);

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

  const signInWithGoogle = async () => {
    try {
      setGoogleLoading(true);

      await GoogleSignin.signOut();

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      console.log('Google user info:', userInfo);

      const response = await fetch('http://192.168.1.11:5000/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: userInfo.idToken }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка сервера: ${errorText}`);
      }

      const data = await response.json();

      if (!data.token) throw new Error('Токен не получен с сервера');

      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      navigation.replace("Home", { refreshed: true });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes(statusCodes.SIGN_IN_CANCELLED)) {
          Alert.alert(t('common.cancel'), t('login.errors.googleCancelled'));
        } else if (error.message.includes(statusCodes.IN_PROGRESS)) {
          Alert.alert(t('login.errors.googleInProgress'), t('login.errors.googleInProgress'));
        } else if (error.message.includes(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) {
          Alert.alert(t('common.error'), t('login.errors.googlePlayServices'));
        } else {
          Alert.alert(t('common.error'), error.message);
        }
        console.error(error);
      } else {
        Alert.alert(t('common.error'), t('login.errors.unknownError'));
        console.error('Unknown error:', error);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const microsoftConfig: AuthConfiguration = {
    issuer: 'https://login.microsoftonline.com/common/v2.0',
    clientId: 'b33b9778-2f92-4e1d-9cba-92222a90408e',
    redirectUrl: Platform.OS === 'ios' 
      ? 'msauth.com.taskai://auth' 
      : 'msauth://com.taskai',
    scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
    additionalParameters: {
      prompt: 'select_account' as const,
    },
    serviceConfiguration: {
      authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    },
  };

  const handleMicrosoftLogin = async () => {
    try {
      setMicrosoftLoading(true);
      console.log('Initiating Microsoft login...');
      
      await AsyncStorage.removeItem('microsoft_auth_state');

      const result: AuthResult = await authorize(microsoftConfig);
      console.log('Microsoft auth result:', result);

      if (!result?.accessToken) {
        throw new Error('Failed to get access token');
      }

      console.log('Fetching user info from Microsoft Graph...');
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${result.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        throw new Error(`Microsoft Graph error: ${userInfoResponse.status} - ${errorText}`);
      }

      const userInfo = await userInfoResponse.json();
      console.log('Microsoft user info:', userInfo);

      const authResponse = await microsoftAuth(
        userInfo.displayName || 'Microsoft User',
        userInfo.mail || userInfo.userPrincipalName,
        userInfo.id
      );

      if (!authResponse?.token) {
        throw new Error('Authentication failed: no token received from server');
      }

      await AsyncStorage.setItem('token', authResponse.token);
      await AsyncStorage.setItem('user', JSON.stringify(authResponse.user));

      console.log('Microsoft authentication successful');
      navigation.replace('Home', { refreshed: true });
    } catch (error) {
      console.error('Microsoft authentication error:', error);
      let errorMessage = t('login.errors.microsoftCancelled');
      
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('User cancelled flow')) {
          errorMessage = t('login.errors.microsoftCancelled');
        } else if (error.message.includes('network error')) {
          errorMessage = t('login.errors.networkError');
        }
      }

      Alert.alert(
        'Microsoft Authentication Error',
        errorMessage,
        [{ text: t('common.ok'), onPress: () => console.log('Alert closed') }]
      );
    } finally {
      setMicrosoftLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('login.validation.fillAllFields'));
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(t('common.error'), t('login.validation.validEmail'));
      return;
    }

    setLoading(true);

    try {
      const res = await login(email.toLowerCase(), password);

      if (res.error) throw new Error(res.error);
      if (!res.token) throw new Error("No token received");
      if (!res.user) throw new Error("No user data received");

      await AsyncStorage.setItem("token", res.token);
      await AsyncStorage.setItem("user", JSON.stringify(res.user));

      navigation.replace("Home", { refreshed: true });
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "An error occurred during login";

      if (error instanceof Error) {
        if (error.message.includes("credentials")) {
          errorMessage = t('login.validation.invalidCredentials');
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert(t('login.errors.loginFailed'), errorMessage);
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
          {/* Кнопка переключения языка */}
          <LanguageSwitcher 
            theme={theme} 
            isDayTime={isDayTime}
            style={styles.languageSwitcher}
          />

          {/* Индикатор автоматической темы */}
          {isAutoMode && (
            <View style={styles.timeIndicator}>
              <Text style={styles.timeIndicatorIcon}>
                {getTimeIcon(isDayTime)}
              </Text>
              <Text style={styles.timeIndicatorText}>
                {t('autoTheme.auto')} • {getTimeText(isDayTime)}
              </Text>
            </View>
          )}

          {/* Декоративные элементы */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />

          <View style={styles.content}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('login.title')}</Text>
              <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.email')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.emailPlaceholder')}
                    placeholderTextColor={theme.isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 111, 69, 0.6)'}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading && !microsoftLoading && !googleLoading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.password')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor={theme.isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 111, 69, 0.6)'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureEntry}
                    editable={!loading && !microsoftLoading && !googleLoading}
                  />
                  <TouchableOpacity 
                    onPress={() => setSecureEntry(!secureEntry)}
                    style={styles.eyeIcon}
                    disabled={loading || microsoftLoading || googleLoading}
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
                style={[styles.button, (loading || microsoftLoading || googleLoading) && styles.disabledButton]} 
                onPress={handleLogin}
                disabled={loading || microsoftLoading || googleLoading}
              >
                <LinearGradient
                  colors={theme.isDark ? [theme.colors.surface, theme.colors.card] : ['#FFF', '#F8F8F8']}
                  style={styles.buttonGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 0, y: 1}}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Text style={styles.buttonText}>{t('login.loginButton')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('login.orDivider')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={[styles.socialButton, (loading || microsoftLoading || googleLoading) && styles.disabledButton]}
                onPress={handleMicrosoftLogin}
                disabled={loading || microsoftLoading || googleLoading}
              >
                <View style={styles.socialButtonContent}>
                  <View style={styles.socialIcon}>
                    <Text style={styles.socialIconText}>Ⓜ</Text>
                  </View>
                  {microsoftLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.socialButtonText}>{t('login.microsoftButton')}</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.socialButton, styles.googleButton, (loading || microsoftLoading || googleLoading) && styles.disabledButton]} 
                onPress={signInWithGoogle} 
                disabled={googleLoading || loading || microsoftLoading}
              >
                <View style={styles.socialButtonContent}>
                  <View style={[styles.socialIcon, styles.googleIcon]}>
                    <Text style={styles.socialIconText}>G</Text>
                  </View>
                  {googleLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.socialButtonText}>{t('login.googleButton')}</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.registerLink}
                onPress={() => navigation.navigate("Register")}
                disabled={loading || microsoftLoading || googleLoading}
              >
                <Text style={styles.registerText}>
                  {t('login.noAccount')} <Text style={styles.registerHighlight}>{t('login.signUp')}</Text>
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
  languageSwitcher: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    zIndex: 10,
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
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    right: -30,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 100,
    left: -20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
    paddingTop: 80,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
  formContainer: {
    backgroundColor: theme.isDark ? 
      `${theme.colors.surface}95` : 
      'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  inputContainer: {
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
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.isDark ? 
      `${theme.colors.border}60` : 
      'rgba(107, 111, 69, 0.3)',
  },
  dividerText: {
    marginHorizontal: 15,
    color: theme.isDark ? 
      theme.colors.textSecondary : 
      'rgba(107, 111, 69, 0.6)',
    fontSize: 14,
  },
  socialButton: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#4285F4',
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  socialIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  socialIconText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  socialButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 20,
    alignItems: "center",
  },
  registerText: {
    color: theme.isDark ? 
      theme.colors.textSecondary : 
      "rgba(107, 111, 69, 0.8)",
    fontSize: 14,
  },
  registerHighlight: {
    color: theme.colors.primary,
    fontWeight: "bold",
  },
});

export default LoginScreen;
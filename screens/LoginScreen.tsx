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
  ActivityIndicator
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login, microsoftAuth } from "../server/api";
import Ionicons from "react-native-vector-icons/Ionicons";
import { authorize, AuthConfiguration } from 'react-native-app-auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '221855869276-6egb238f5i1ivimtrgme6s9nm9bdtad1.apps.googleusercontent.com' // из Google Cloud Console, обязательно web client ID!
    });
  }, []);

  const signInWithGoogle = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      console.log('Google user info:', userInfo);

      // Отправляем idToken на сервер для регистрации/логина
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
      if (error instanceof Error) { // Проверяем, что error — это объект типа Error
        if (error.message.includes(statusCodes.SIGN_IN_CANCELLED)) {
          Alert.alert('Отмена', 'Вход через Google был отменён');
        } else if (error.message.includes(statusCodes.IN_PROGRESS)) {
          Alert.alert('В процессе', 'Авторизация уже выполняется');
        } else if (error.message.includes(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) {
          Alert.alert('Ошибка', 'Сервисы Google Play недоступны');
        } else {
          Alert.alert('Ошибка', error.message);
        }
        console.error(error);
      } else {
        Alert.alert('Ошибка', 'Произошла неизвестная ошибка');
        console.error('Unknown error:', error);
      }
    } finally {
      setGoogleLoading(false);
    }
  };


  const googleConfig: AuthConfiguration = {
    issuer: 'https://accounts.google.com',
    clientId: '221855869276-a3cm74t08419p5c2mvn2q2o6cm072dkh.apps.googleusercontent.com',  // замените на свой
    redirectUrl: Platform.OS === 'ios' 
      ? 'com.taskai:/oauthredirect'  // ваша схема + oauthredirect
      : 'com.taskai:/oauthredirect',
    scopes: ['openid', 'profile', 'email'],
    additionalParameters: {},
  };

  const microsoftConfig: AuthConfiguration = {
    issuer: 'https://login.microsoftonline.com/common/v2.0',
    clientId: 'b33b9778-2f92-4e1d-9cba-92222a90408e',
    redirectUrl: Platform.OS === 'ios' 
      ? 'msauth.com.taskai://auth' 
      : 'msauth://com.taskai',
    scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
    additionalParameters: {
      prompt: 'select_account' as const, // Явное приведение типа
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
      
      // Сбрасываем предыдущую сессию
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
      let errorMessage = 'Failed to authenticate with Microsoft';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('User cancelled flow')) {
          errorMessage = 'Authentication was cancelled';
        } else if (error.message.includes('network error')) {
          errorMessage = 'Network error occurred';
        }
      }

      Alert.alert(
        'Microsoft Authentication Error',
        errorMessage,
        [{ text: 'OK', onPress: () => console.log('Alert closed') }]
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
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
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
          errorMessage = "Invalid email or password";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate("Register")}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Please sign in to continue</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#A0A0A0"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading && !microsoftLoading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordInput}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter your password"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureEntry}
              editable={!loading && !microsoftLoading}
            />
            <TouchableOpacity 
              onPress={() => setSecureEntry(!secureEntry)}
              style={styles.eyeIcon}
              disabled={loading || microsoftLoading}
            >
              <Ionicons 
                name={secureEntry ? "eye-off" : "eye"} 
                size={20} 
                color="#5C573E" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, (loading || microsoftLoading) && styles.disabledButton]} 
          onPress={handleLogin}
          disabled={loading || microsoftLoading}
        >
          {loading ? (
            <ActivityIndicator color="#5C573E" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, (loading || microsoftLoading) && styles.disabledButton]}
          onPress={handleMicrosoftLogin}
          disabled={loading || microsoftLoading}
        >
          {microsoftLoading ? (
            <ActivityIndicator color="#5C573E" />
          ) : (
            <Text style={styles.buttonText}>Sign in with Microsoft</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={signInWithGoogle} disabled={googleLoading}>
            {googleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Войти через Google</Text>
            )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.registerLink}
          onPress={() => navigation.navigate("Register")}
          disabled={loading || microsoftLoading}
        >
          <Text style={styles.registerText}>
            Don't have an account? <Text style={styles.registerHighlight}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6B6F45",
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#E9D8A6",
    marginBottom: 30,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: "white",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#E9D8A6",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    color: "#333",
  },
  passwordInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9D8A6",
    borderRadius: 10,
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    backgroundColor: "#E9D8A6",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5C573E",
  },
  registerLink: {
    marginTop: 20,
    alignItems: "center",
  },
  registerText: {
    color: "white",
  },
  registerHighlight: {
    color: "#E9D8A6",
    fontWeight: "bold",
  },
});

export default LoginScreen;
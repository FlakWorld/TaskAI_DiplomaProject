import React, { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StartScreen from "./screens/StartScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import CreationTask from "./screens/CreationTask";
import TaskDetail from "./screens/TaskDetail";
import EditTaskForm from "./screens/EditTaskForm";
import ProfileScreen from "./screens/ProfileScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import EmailVerificationScreen from './screens/EmailVerificationScreen';
import { RootStackParamList } from "./types";
import linking from "./server/linking";
import PushNotification from "react-native-push-notification";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === "android" && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        console.log("POST_NOTIFICATIONS permission:", granted);
      }
    }
    requestPermissions();
    // Конфигурация уведомлений
    PushNotification.configure({
      onRegister: function (token: any) {
        console.log("TOKEN:", token);
      },
      onNotification: function (notification: any) {
        console.log("NOTIFICATION:", notification);
        // Важно вызвать finish, чтобы iOS понимала, что уведомление обработано
        notification.finish?.(PushNotification.FetchResult.NoData);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      // Для iOS - автоматически запросить разрешение
      requestPermissions: Platform.OS === "ios",
    });

    // Создание канала уведомлений для Android 8+
    PushNotification.createChannel(
      {
        channelId: "tasks-channel",
        channelName: "Напоминания о задачах", // Можно дать более понятное имя
        channelDescription: "Канал для уведомлений о ваших задачах",
        playSound: true,
        soundName: "default",
        importance: 4, // Высокий приоритет уведомлений
        vibrate: true,
      },
      (created: boolean) => console.log(`createChannel returned '${created}'`)
    );
  }, []);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Start" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Start" component={StartScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Task" component={CreationTask} />
        <Stack.Screen name="EditTask" component={TaskDetail} />
        <Stack.Screen name="EditTaskForm" component={EditTaskForm} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen}options={{ headerShown: false }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StartScreen from "./screens/StartScreen"; // Добавляем новый экран
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import CreationTask from "./screens/CreationTask";
import TaskDetail from "./screens/TaskDetail";
import EditTaskForm from "./screens/EditTaskForm";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Start" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Start" component={StartScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Task" component={CreationTask} />
        <Stack.Screen name="EditTask" component={TaskDetail} />
        <Stack.Screen name="EditTaskForm" component={EditTaskForm} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


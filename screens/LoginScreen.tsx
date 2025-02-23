import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login } from "../server/api";
import Ionicons from "react-native-vector-icons/Ionicons"; // Добавляем иконку

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const res = await login(email, password);
    if (res.error) {
      Alert.alert("Error", res.error);
    } else {
      await AsyncStorage.setItem("token", res.token);
      navigation.replace("Home");
    }
  };

  return (
    <View style={styles.container}>
      {/* Кнопка назад */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("Register")}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Login</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6B6F45",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
  },
  title: {
    fontSize: 28,
    color: "white",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#E9D8A6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#E9D8A6",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    color: "#5C573E",
  },
});

export default LoginScreen;

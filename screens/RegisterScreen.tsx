import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { register } from "../server/api";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    const res = await register(email, password);
    if (res.error) {
      Alert.alert("Error", res.error);
    } else {
      Alert.alert("Success", "Account created");
      navigation.navigate("Login");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#5C573E"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#5C573E"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      {/* Вернули текст с переходом на Login */}
      <Text style={styles.footerText}>
        Already have a profile?{" "}
        <Text style={styles.linkText} onPress={() => navigation.navigate("Login")}>
          Login
        </Text>
      </Text>
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
    color: "black",
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
    color: "black",
  },
  footerText: {
    color: "white",
    fontSize: 14,
    marginTop: 20,
  },
  linkText: {
    color: "#E9D8A6",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

export default RegisterScreen;

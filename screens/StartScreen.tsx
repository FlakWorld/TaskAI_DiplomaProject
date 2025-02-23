import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

type RootStackParamList = {
    Register: undefined;
};

type StartScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Register"
>;

const StartScreen = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>To do list</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Register")}
      >
        <Text style={styles.buttonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7D8151", // Цвет фона
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 100,
  },
  button: {
    backgroundColor: "#E8D48D",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    fontSize: 20,
    color: "#000",
    fontWeight: "bold",
  },
});

export default StartScreen;

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { API_URL } from "../server/api";

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Profile">;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [user, setUser] = useState<{
    avatar?: string | null;
    name?: string;
    surname?: string;
    email?: string;
  }>({});

  useFocusEffect(
    React.useCallback(() => {
      const fetchUserFromServer = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) {
            navigation.replace("Login");
            return;
          }

          const response = await fetch(`${API_URL}/user/profile`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error("Ошибка получения данных пользователя");
          }

          const data = await response.json();

          const userData = {
            avatar: data.avatarUrl || null,
            name: data.name || "",
            surname: data.surname || "",
            email: data.email || "",
          };

          setUser(userData);
          await AsyncStorage.setItem("user", JSON.stringify(userData));
        } catch (error) {
          console.error("Ошибка загрузки данных пользователя:", error);
          Alert.alert("Ошибка", "Не удалось загрузить данные профиля");
          await AsyncStorage.removeItem("token");
          navigation.replace("Login");
        }
      };

      fetchUserFromServer();
    }, [navigation])
  );

  const menuItems = [
    { label: "Уведомления", icon: "bell" },
    { label: "Избранное", icon: "heart" },
    { label: "Языки", icon: "globe" },
  ];

  const handleMenuPress = (label: string) => {
    Alert.alert(label, `Нажата кнопка "${label}"`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.profileContainer}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Icon name="user" size={40} color="#bbb" />
          </View>
        )}

        <View style={styles.profileInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Имя:</Text>
            <Text style={styles.value}>{user.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Фамилия:</Text>
            <Text style={styles.value}>{user.surname}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Почта:</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Icon name="edit-2" size={14} color="#6B6F45" />
            <Text style={styles.editText}>Редактировать профиль</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleMenuPress(item.label)}
          >
            <Icon
              name={item.icon}
              size={20}
              color="#6B6F45"
              style={styles.menuIcon}
            />
            <Text style={styles.menuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 30,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholder: {},
  profileInfo: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontWeight: "600",
    color: "#444",
    width: 80,
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    color: "#555",
  },
  editButton: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  editText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#6B6F45",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuIcon: {
    marginRight: 10,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6B6F45",
    paddingVertical: 15,
    borderRadius: 10,
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    marginLeft: 10,
  },
});

export default ProfileScreen;
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import * as ImagePicker from "react-native-image-picker";
import { API_URL } from "../server/api";
import { RootStackParamList } from "../types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";

const CLOUD_NAME = "dvuwiugro";
const UPLOAD_PRESET = "unsigned_preset";

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "EditProfile">;

const EditProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("user");
        const tokenValue = await AsyncStorage.getItem("token");
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setName(userData.name || "");
          setSurname(userData.surname || "");
          setAvatarUri(userData.avatar || null);
        }
        if (tokenValue) {
          setToken(tokenValue);
        }
      } catch (e) {
        console.error("Ошибка загрузки данных пользователя", e);
      }
    };

    loadUser();
  }, []);

  const uploadImageToCloudinary = async (uri: string): Promise<string | null> => {
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", {
        uri,
        type: "image/jpeg",
        name: "avatar.jpg",
      } as any);
      data.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
        method: "POST",
        body: data,
      });

      const json = await res.json();

      if (json.secure_url) {
        return json.secure_url;
      } else {
        Alert.alert("Ошибка загрузки", "Не удалось получить URL изображения");
        return null;
      }
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Ошибка загрузки изображения");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const chooseAvatar = () => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: "photo",
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.7,
      },
      async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert("Ошибка", response.errorMessage || "Ошибка выбора изображения");
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.uri) {
            const uploadedUrl = await uploadImageToCloudinary(asset.uri);
            if (uploadedUrl) {
              setAvatarUri(uploadedUrl);
            }
          }
        }
      }
    );
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните имя");
      return;
    }
    if (!token) {
      Alert.alert("Ошибка", "Пользователь не авторизован");
      return;
    }

    setLoading(true);

    try {
      const updatedData: any = {
        name: name.trim(),
        surname: surname.trim() || "",
        avatarUrl: avatarUri,
      };

      const response = await fetch(`${API_URL}/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка обновления профиля");
      }

      const result = await response.json();

      const newUserData = {
        ...result.user,
        avatar: result.user.avatarUrl || null,
      };
      await AsyncStorage.setItem("user", JSON.stringify(newUserData));

      Alert.alert("Успех", "Профиль успешно обновлён", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Ошибка обновления профиля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Кнопка "Назад" */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#6B6F45" />
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={chooseAvatar}
          disabled={uploading || loading}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Icon name="user" size={50} color="#bbb" />
              <Text style={{ color: "#bbb", marginTop: 5 }}>Выбрать аватар</Text>
            </View>
          )}
        </TouchableOpacity>

        {uploading && (
          <View style={{ marginBottom: 10, alignItems: "center" }}>
            <Text>Загрузка аватара...</Text>
            <ActivityIndicator size="small" color="#6B6F45" />
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Имя</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Введите имя"
            autoCapitalize="words"
            editable={!uploading && !loading}
          />

          <Text style={styles.label}>Фамилия</Text>
          <TextInput
            style={styles.input}
            value={surname}
            onChangeText={setSurname}
            placeholder="Введите фамилию"
            autoCapitalize="words"
            editable={!uploading && !loading}
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveProfile}
            disabled={loading || uploading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Сохранить</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
    flexGrow: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingTop: 35,  // добавлен отступ сверху, чтобы кнопка не прилегала к краю
  },
  backButtonText: {
    color: "#6B6F45",
    fontSize: 16,
    marginLeft: 8,
  },
  avatarContainer: {
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 70,
    backgroundColor: "#fafafa",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#6B6F45",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default EditProfileScreen;
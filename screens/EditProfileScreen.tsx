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
import { useTheme } from "./ThemeContext";
import { useLocalization } from "./LocalizationContext";

const CLOUD_NAME = "dvuwiugro";
const UPLOAD_PRESET = "unsigned_preset";

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "EditProfile">;

const EditProfileScreen = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const styles = createThemedStyles(theme);

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
        Alert.alert(t('errors.loadingError'), t('profile.avatarUploadError'));
        return null;
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('profile.avatarUploadError'));
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
          Alert.alert(t('common.error'), response.errorMessage || t('profile.imageSelectError'));
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
      Alert.alert(t('common.error'), t('profile.nameRequired'));
      return;
    }
    if (!token) {
      Alert.alert(t('common.error'), t('profile.authRequired'));
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
        throw new Error(errorData.error || t('profile.updateError'));
      }

      const result = await response.json();

      const newUserData = {
        ...result.user,
        avatar: result.user.avatarUrl || null,
      };
      await AsyncStorage.setItem("user", JSON.stringify(newUserData));

      Alert.alert(t('common.success'), t('profile.updateSuccess'), [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('profile.updateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Кнопка "Назад" */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
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
              <Icon name="user" size={50} color={theme.colors.textSecondary} />
              <Text style={styles.avatarPlaceholderText}>{t('profile.selectAvatar')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {uploading && (
          <View style={styles.uploadingContainer}>
            <Text style={styles.uploadingText}>{t('profile.uploadingAvatar')}</Text>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>{t('profile.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('profile.enterName')}
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="words"
            editable={!uploading && !loading}
          />

          <Text style={styles.label}>{t('profile.surname')}</Text>
          <TextInput
            style={styles.input}
            value={surname}
            onChangeText={setSurname}
            placeholder={t('profile.enterSurname')}
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="words"
            editable={!uploading && !loading}
          />

          <TouchableOpacity
            style={[
              styles.saveButton,
              (loading || uploading) && styles.saveButtonDisabled
            ]}
            onPress={saveProfile}
            disabled={loading || uploading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Функция создания стилей с поддержкой тем
const createThemedStyles = (theme: any) => StyleSheet.create({
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
    paddingTop: 35,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "500",
  },
  avatarContainer: {
    marginBottom: 30,
    borderWidth: 3,
    borderColor: theme.colors.border,
    padding: 10,
    borderRadius: 70,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  avatarPlaceholderText: {
    color: theme.colors.textSecondary,
    marginTop: 5,
    fontSize: 12,
    fontWeight: "500",
  },
  uploadingContainer: {
    marginBottom: 10,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  uploadingText: {
    color: theme.colors.text,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
    fontWeight: "600",
    marginLeft: 4,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: theme.isDark ? theme.colors.background : "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default EditProfileScreen;
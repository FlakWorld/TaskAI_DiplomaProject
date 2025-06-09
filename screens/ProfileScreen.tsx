import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Switch,
  Modal,
  FlatList,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { API_URL } from "../server/api";
import { useTheme } from "./ThemeContext";
import { useLocalization } from "./LocalizationContext";

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Profile">;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  // Используем обычную тему как было раньше
  const { theme, isDark, toggleTheme, updateUser } = useTheme();
  const { language, setLanguage, t, availableLanguages } = useLocalization();
  
  const [user, setUser] = useState<{
    id?: string;
    avatar?: string | null;
    name?: string;
    surname?: string;
    email?: string;
  }>({});
  
  // Добавляем отдельное состояние для пользователя из AsyncStorage
  const [cachedUser, setCachedUser] = useState<{
    id?: string;
    avatar?: string | null;
    name?: string;
    surname?: string;
    email?: string;
  } | null>(null);
  
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [isLanguageChanging, setIsLanguageChanging] = useState(false);

  // Загружаем пользователя из AsyncStorage при инициализации
  React.useEffect(() => {
    const loadCachedUser = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setCachedUser(parsedUser);
          console.log('📱 Загружен пользователь из кэша:', parsedUser.email);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки пользователя из кэша:', error);
      }
    };

    loadCachedUser();
  }, []);

  // Отладочная информация
  React.useEffect(() => {
    console.log('🐛 ProfileScreen DEBUG:');
    console.log('  - Cached user:', cachedUser?.email || 'не загружен');
    console.log('  - Local user:', user?.email || 'не загружен');
    console.log('  - Current language:', language);
  }, [cachedUser, user, language]);

  useFocusEffect(
    React.useCallback(() => {
      const fetchUserFromServer = async () => {
        try {
          // Сначала обновляем данные пользователя в контексте темы
          await updateUser();
          
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
            throw new Error(t('errors.loadingError'));
          }

          const data = await response.json();

          const userData = {
            id: data.id || data._id,
            avatar: data.avatarUrl || null,
            name: data.name || "",
            surname: data.surname || "",
            email: data.email || "",
          };

          setUser(userData);
          setCachedUser(userData); // Обновляем кэшированного пользователя
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          
          console.log('👤 Пользователь загружен:', userData.email);
        } catch (error) {
          console.error("Ошибка загрузки данных пользователя:", error);
          Alert.alert(t('common.error'), t('errors.loadingError'));
          await AsyncStorage.removeItem("token");
          navigation.replace("Login");
        }
      };

      fetchUserFromServer();
    }, [navigation, updateUser, t])
  );

  // Обработчик смены языка (доступен всем)
  const handleLanguageSelect = async (selectedLanguage: any) => {
    if (selectedLanguage.code === language) {
      setLanguageModalVisible(false);
      return;
    }

    try {
      setIsLanguageChanging(true);
      console.log(`🌍 Смена языка с ${language} на ${selectedLanguage.code}`);
      
      // Меняем язык приложения
      await setLanguage(selectedLanguage.code);
      
      setLanguageModalVisible(false);
      
      // Показываем подтверждение
      Alert.alert(
        t('common.success'), 
        `${t('profile.language')}: ${selectedLanguage.nativeName}`,
        [{ text: t('common.ok') }]
      );
      
      console.log(`✅ Язык успешно изменен на ${selectedLanguage.code}`);
    } catch (error) {
      console.error('❌ Ошибка смены языка:', error);
      Alert.alert(t('common.error'), t('profile.updateError'));
    } finally {
      setIsLanguageChanging(false);
    }
  };

  const getCurrentLanguageName = () => {
    const currentLang = availableLanguages.find(lang => lang.code === language);
    return currentLang ? currentLang.nativeName : '';
  };

  // Получаем данные текущего пользователя (приоритет - local user, fallback - cached user)
  const currentUser = user.email ? user : cachedUser;
  const isUserAuthorized = !!(currentUser && currentUser.email);

  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Отображение статуса авторизации */}
      {isUserAuthorized && (
        <View style={styles.userStatusContainer}>
          <View style={styles.userStatusBadge}>
            <Ionicons name="person-circle" size={16} color={theme.colors.success} />
            <Text style={styles.userStatusText}>
              {currentUser?.name || currentUser?.email}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.profileContainer}>
        {currentUser?.avatar ? (
          <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Icon name="user" size={40} color={theme.colors.textSecondary} />
          </View>
        )}

        <View style={styles.profileInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.name')}</Text>
            <Text style={styles.value}>{currentUser?.name || t('profile.enterName')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.surname')}</Text>
            <Text style={styles.value}>{currentUser?.surname || t('profile.enterSurname')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.email')}</Text>
            <Text style={styles.value}>{currentUser?.email || 'Не указан'}</Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Icon name="edit-2" size={14} color={theme.colors.primary} />
            <Text style={styles.editText}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {/* Переключатель темы - остается как было */}
        <View style={styles.themeContainer}>
          <View style={styles.themeInfo}>
            <MaterialIcons 
              name={isDark ? "dark-mode" : "light-mode"} 
              size={20} 
              color={theme.colors.primary} 
              style={styles.themeIcon} 
            />
            <Text style={styles.themeText}>
              {isDark ? t('profile.darkTheme') : t('profile.lightTheme')}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ 
              false: theme.colors.border, 
              true: theme.colors.primary + '40' 
            }}
            thumbColor={isDark ? theme.colors.primary : theme.colors.textSecondary}
            ios_backgroundColor={theme.colors.border}
          />
        </View>

        {/* Переключатель языка - доступен всем */}
        <TouchableOpacity
          style={styles.languageContainer}
          onPress={() => setLanguageModalVisible(true)}
        >
          <View style={styles.languageInfo}>
            <MaterialIcons 
              name="language" 
              size={20} 
              color={theme.colors.primary} 
              style={styles.languageIcon} 
            />
            <View style={styles.languageTextContainer}>
              <Text style={styles.languageText}>
                {t('profile.language')}
              </Text>
              <Text style={styles.currentLanguageText}>
                {getCurrentLanguageName()}
              </Text>
            </View>
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Модальное окно выбора языка с улучшенным дизайном */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.selectLanguage')}</Text>
              <TouchableOpacity
                onPress={() => setLanguageModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={availableLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    language === item.code && styles.selectedLanguageOption
                  ]}
                  onPress={() => handleLanguageSelect(item)}
                  disabled={isLanguageChanging}
                >
                  <View style={styles.languageOptionContent}>
                    <Text style={[
                      styles.languageOptionText,
                      language === item.code && styles.selectedLanguageOptionText
                    ]}>
                      {item.nativeName}
                    </Text>
                    <Text style={[
                      styles.languageOptionSubtext,
                      language === item.code && styles.selectedLanguageOptionSubtext
                    ]}>
                      {item.name}
                    </Text>
                  </View>
                  {isLanguageChanging && language === item.code ? (
                    <View style={styles.languageChangingIndicator}>
                      <Ionicons name="sync" size={16} color={theme.colors.primary} />
                    </View>
                  ) : language === item.code ? (
                    <Ionicons 
                      name="checkmark" 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
  },
  userStatusContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  userStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? `${theme.colors.success}20` : 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.isDark ? `${theme.colors.success}40` : 'rgba(76, 175, 80, 0.3)',
    gap: 6,
  },
  userStatusText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '500',
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 30,
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 10,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
    backgroundColor: theme.colors.border,
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
    color: theme.colors.textSecondary,
    width: 80,
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text,
  },
  editButton: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  editText: {
    marginLeft: 5,
    fontSize: 14,
    color: theme.colors.primary,
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  themeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  themeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  themeIcon: {
    marginRight: 10,
  },
  themeText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: "500",
  },
  languageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  languageContainerDisabled: {
    opacity: 0.6,
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  languageIcon: {
    marginRight: 10,
  },
  languageTextContainer: {
    flexDirection: "column",
  },
  languageText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: "500",
  },
  languageTextDisabled: {
    color: theme.colors.textSecondary,
  },
  currentLanguageText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  currentLanguageTextDisabled: {
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  authWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? `${theme.colors.warning}20` : 'rgba(255, 152, 0, 0.1)',
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.isDark ? `${theme.colors.warning}40` : 'rgba(255, 152, 0, 0.3)',
    gap: 8,
  },
  authWarningText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.warning,
    fontWeight: '500',
  },
  menuIcon: {
    marginRight: 10,
  },
  menuText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  
  // Стили для модального окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    width: '80%',
    maxHeight: '60%',
    paddingVertical: 20,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 5,
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.isDark ? `${theme.colors.primary}15` : 'rgba(139, 195, 74, 0.1)',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  modalUserText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedLanguageOption: {
    backgroundColor: theme.colors.primary + '15',
  },
  languageOptionContent: {
    flex: 1,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  selectedLanguageOptionText: {
    color: theme.colors.primary,
  },
  languageOptionSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedLanguageOptionSubtext: {
    color: theme.colors.primary + '80',
  },
  languageChangingIndicator: {
    padding: 2,
  },
});

export default ProfileScreen;
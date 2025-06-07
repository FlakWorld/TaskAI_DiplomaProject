import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'react-native-linear-gradient';

// Импортируем автоматическую тему
import { useAutoTheme } from './useAutoTheme';
import { getTimeIcon, getTimeText } from './authThemeStyles';

type RootStackParamList = {
    Login: undefined;
};

type StartScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

const { width, height } = Dimensions.get('window');

const StartScreen = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();
  
  // Используем автоматическую тему
  const { theme, isDayTime, isAutoMode } = useAutoTheme();
  
  const [scaleValue, setScaleValue] = React.useState(new Animated.Value(1));

  // Функция для получения градиента в зависимости от времени и темы
  const getBackgroundGradient = () => {
    if (theme.isDark) {
      return isDayTime 
        ? ['#1E3A8A', '#3B82F6', '#60A5FA'] // Дневные синие тона для темной темы
        : ['#0F172A', '#1E293B', '#334155']; // Ночные серые тона
    } else {
      return isDayTime 
        ? ['#8BC34A', '#6B6F45', '#4A5D23'] // Ваш оригинальный дневной градиент
        : ['#3F51B5', '#5C6BC0', '#7986CB']; // Ночные фиолетовые тона
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Создаем стили с поддержкой автоматической темы
  const styles = createThemedStyles(theme, isDayTime);

  return (
    <LinearGradient
      colors={getBackgroundGradient()}
      style={styles.container}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
    >
      {/* Индикатор автоматической темы */}
      {isAutoMode && (
        <View style={styles.timeIndicator}>
          <Text style={styles.timeIndicatorIcon}>
            {getTimeIcon(isDayTime)}
          </Text>
          <Text style={styles.timeIndicatorText}>
            Авто • {getTimeText(isDayTime)}
          </Text>
        </View>
      )}

      {/* Декоративные элементы */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />
      
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>TaskAI</Text>
          <Text style={styles.subtitle}>
            {isDayTime ? 
              'Умный помощник для ваших задач' : 
              'Планируйте эффективно даже ночью'
            }
          </Text>
          <View style={styles.titleUnderline} />
        </View>

        <View style={styles.featureContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>🤖</Text>
            </View>
            <Text style={styles.featureText}>ИИ-предложения</Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>⚡</Text>
            </View>
            <Text style={styles.featureText}>Быстрое создание</Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>📊</Text>
            </View>
            <Text style={styles.featureText}>Статистика</Text>
          </View>
        </View>

        {/* Дополнительная информация об автоматической теме */}
        <View style={styles.autoThemeInfo}>
          <View style={styles.autoThemeIcon}>
            <Text style={styles.autoThemeIconText}>
              {isDayTime ? '☀️' : '🌙'}
            </Text>
          </View>
          <Text style={styles.autoThemeText}>
            {isDayTime ? 
              'Дневная тема автоматически активна (06:00-18:00)' : 
              'Ночная тема автоматически активна (18:00-06:00)'
            }
          </Text>
        </View>

        <Animated.View style={[styles.buttonContainer, { transform: [{ scale: scaleValue }] }]}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Login")}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={theme.isDark ? [theme.colors.surface, theme.colors.card] : ['#FFF', '#F8F8F8']}
              style={styles.buttonGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
            >
              <Text style={styles.buttonText}>Начать работу</Text>
              <View style={styles.buttonArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

// Создаем стили с поддержкой темы
const createThemedStyles = (theme: any, isDayTime: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  timeIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 
      'rgba(0, 0, 0, 0.3)' : 
      'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
  },
  timeIndicatorIcon: {
    fontSize: 16,
  },
  timeIndicatorText: {
    fontSize: 12,
    color: theme.isDark ? theme.colors.text : '#FFFFFF',
    fontWeight: '500',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 100,
    left: -30,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: height * 0.3,
    right: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    color: theme.isDark ? theme.colors.text : '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: theme.isDark ? theme.colors.textSecondary : 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '300',
  },
  titleUnderline: {
    width: 80,
    height: 4,
    backgroundColor: theme.isDark ? theme.colors.primary : '#FFF',
    marginTop: 15,
    borderRadius: 2,
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureText: {
    color: theme.isDark ? theme.colors.text : '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  autoThemeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 
      'rgba(255, 255, 255, 0.1)' : 
      'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 40,
    maxWidth: '90%',
  },
  autoThemeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  autoThemeIconText: {
    fontSize: 18,
  },
  autoThemeText: {
    flex: 1,
    color: theme.isDark ? theme.colors.text : '#FFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginRight: 10,
  },
  buttonArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: theme.isDark ? theme.colors.background : '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StartScreen;
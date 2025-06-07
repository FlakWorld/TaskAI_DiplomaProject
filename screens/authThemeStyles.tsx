import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * Создает стили для экранов авторизации с поддержкой автоматической темы
 */
export const createAuthThemeStyles = (theme: any, isDayTime: boolean) => StyleSheet.create({
  // Основной контейнер
  container: {
    flex: 1,
  },
  
  // Фоновый градиент
  backgroundGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Анимированный фон (для красивого перехода)
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: isDayTime ? 1 : 0.8,
  },

  // Карточка с формой
  authCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { 
      width: 0, 
      height: theme.isDark ? 8 : 12 
    },
    shadowOpacity: theme.isDark ? 0.3 : 0.15,
    shadowRadius: theme.isDark ? 16 : 20,
    elevation: theme.isDark ? 12 : 8,
  },

  authCardGradient: {
    padding: 30,
    paddingVertical: 40,
  },

  // Логотип и заголовок
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: theme.isDark ? 2 : 3,
    borderColor: theme.isDark ? 
      `${theme.colors.primary}40` : 
      'rgba(255, 255, 255, 0.3)',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Поля ввода
  inputContainer: {
    marginBottom: 20,
  },

  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },

  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    borderWidth: 1,
    borderColor: theme.isDark ? 
      `${theme.colors.primary}30` : 
      'rgba(107, 111, 69, 0.2)',
  },

  inputIcon: {
    marginRight: 12,
    opacity: 0.8,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 20,
  },

  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },

  // Кнопки
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },

  button: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  buttonIcon: {
    marginLeft: 4,
  },

  // Вторичная кнопка
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.isDark ? 
      `${theme.colors.primary}40` : 
      'rgba(107, 111, 69, 0.3)',
    backgroundColor: 'transparent',
    marginTop: 12,
  },

  secondaryButtonContent: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // Ссылки и дополнительный текст
  linkContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  linkText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },

  link: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Индикатор времени (опционально)
  timeIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
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
  },

  timeIndicatorIcon: {
    fontSize: 16,
  },

  timeIndicatorText: {
    fontSize: 12,
    color: theme.isDark ? theme.colors.text : '#FFFFFF',
    fontWeight: '500',
  },

  // Ошибки и сообщения
  errorContainer: {
    backgroundColor: theme.isDark ? 
      `${theme.colors.error}20` : 
      'rgba(244, 67, 54, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },

  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 18,
  },

  successContainer: {
    backgroundColor: theme.isDark ? 
      `${theme.colors.success}20` : 
      'rgba(76, 175, 80, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },

  successText: {
    color: theme.colors.success,
    fontSize: 14,
    lineHeight: 18,
  },

  // Загрузка
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: theme.isDark ? theme.colors.text : '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },

  // Плавные переходы для анимации
  fadeContainer: {
    flex: 1,
  },

  // Дополнительные элементы UI
  divider: {
    height: 1,
    backgroundColor: theme.isDark ? 
      `${theme.colors.border}60` : 
      'rgba(224, 224, 224, 0.6)',
    marginVertical: 20,
  },

  orContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },

  orText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 1,
  },

  // Специальные стили для StartScreen
  startWelcomeText: {
    fontSize: 20,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 28,
  },

  startFeatureList: {
    marginTop: 20,
    gap: 12,
  },

  startFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}15` : 
      'rgba(139, 195, 74, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },

  startFeatureIcon: {
    fontSize: 20,
  },

  startFeatureText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },

  // Специальные стили для EmailVerificationScreen
  verificationCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 30,
    gap: 8,
  },

  verificationCodeInput: {
    width: 50,
    height: 60,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.isDark ? 
      `${theme.colors.primary}30` : 
      'rgba(107, 111, 69, 0.3)',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },

  verificationCodeInputActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.isDark ? 
      `${theme.colors.primary}20` : 
      'rgba(139, 195, 74, 0.1)',
  },

  verificationResendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  verificationResendTimer: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },

  verificationResendButton: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

// Цвета для градиентов в зависимости от времени суток
export const getBackgroundGradient = (isDayTime: boolean, isDarkTheme: boolean) => {
  if (isDarkTheme) {
    return isDayTime 
      ? ['#1E3A8A', '#3B82F6', '#60A5FA'] // Дневные синие тона для темной темы
      : ['#0F172A', '#1E293B', '#334155']; // Ночные серые тона
  } else {
    return isDayTime 
      ? ['#8BC34A', '#CDDC39', '#FFF9C4'] // Дневные зеленые тона
      : ['#3F51B5', '#5C6BC0', '#7986CB']; // Ночные фиолетовые тона
  }
};

// Функция для получения иконки времени
export const getTimeIcon = (isDayTime: boolean) => {
  return isDayTime ? '☀️' : '🌙';
};

// Функция для получения текста времени
export const getTimeText = (isDayTime: boolean) => {
  return isDayTime ? 'День' : 'Ночь';
};
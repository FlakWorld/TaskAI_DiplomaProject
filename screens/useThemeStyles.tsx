import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, Theme } from './ThemeContext';

/**
 * Хук для создания стилей с поддержкой темы
 * @param createStyles функция, которая принимает тему и возвращает объект стилей
 * @returns объект стилей с поддержкой текущей темы
 */
export const useThemeStyles = <T extends StyleSheet.NamedStyles<T>>(
  createStyles: (theme: Theme) => T
): T => {
  const { theme } = useTheme();
  
  return useMemo(() => {
    return StyleSheet.create(createStyles(theme));
  }, [theme, createStyles]);
};

/**
 * Предустановленные стили для общих компонентов
 */
export const createCommonStyles = (theme: Theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  surface: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 15,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  buttonText: {
    color: theme.isDark ? theme.colors.background : '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  text: {
    color: theme.colors.text,
    fontSize: 16,
  },
  textSecondary: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  textSmall: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  heading: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  subheading: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: theme.colors.text,
  },
  fab: {
    position: 'absolute' as const,
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

/**
 * Хук для использования общих стилей
 */
export const useCommonStyles = () => {
  return useThemeStyles(createCommonStyles);
};
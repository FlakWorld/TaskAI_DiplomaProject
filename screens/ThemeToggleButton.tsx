import React from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from './ThemeContext';

interface ThemeToggleButtonProps {
  size?: number;
  style?: any;
  showBackground?: boolean;
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ 
  size = 24, 
  style,
  showBackground = true 
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  const styles = createStyles(theme, size, showBackground);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons
          name={isDark ? 'light-mode' : 'dark-mode'}
          size={size}
          color={theme.colors.primary}
        />
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: any, size: number, showBackground: boolean) => StyleSheet.create({
  container: {
    padding: showBackground ? 8 : 0,
    borderRadius: showBackground ? (size + 16) / 2 : 0,
    backgroundColor: showBackground ? theme.colors.surface : 'transparent',
    shadowColor: showBackground ? theme.colors.text : 'transparent',
    shadowOffset: showBackground ? {
      width: 0,
      height: 2,
    } : { width: 0, height: 0 },
    shadowOpacity: showBackground ? 0.1 : 0,
    shadowRadius: showBackground ? 3 : 0,
    elevation: showBackground ? 3 : 0,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ThemeToggleButton;
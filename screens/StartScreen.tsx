import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'react-native-linear-gradient';

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
  const [scaleValue, setScaleValue] = React.useState(new Animated.Value(1));

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

  return (
    <LinearGradient
      colors={['#8BC34A', '#6B6F45', '#4A5D23']}
      style={styles.container}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
    >
      {/* Декоративные элементы */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />
      
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>TaskAI</Text>
          <Text style={styles.subtitle}>Умный помощник для ваших задач</Text>
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

        <Animated.View style={[styles.buttonContainer, { transform: [{ scale: scaleValue }] }]}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Login")}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FFF', '#F8F8F8']}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '300',
  },
  titleUnderline: {
    width: 80,
    height: 4,
    backgroundColor: '#FFF',
    marginTop: 15,
    borderRadius: 2,
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 60,
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
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
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
    color: '#6B6F45',
    fontWeight: 'bold',
    marginRight: 10,
  },
  buttonArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6B6F45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


export default StartScreen;

// mobile/app/index.jsx
// iAlert - Cinematic Intro
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  // Animación de las puertas
  const doorProgress = useRef(new Animated.Value(0)).current;

  // Logo
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.65)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;

  // Cámara / transición final
  const cameraScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const runIntro = async () => {
      // Pequeña pausa inicial para dar sensación cinematográfica
      await wait(350);

      // 1. Las puertas comienzan a abrirse
      Animated.parallel([
        Animated.timing(doorProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),

        // 2. El logo comienza a aparecer
        Animated.sequence([
          Animated.delay(550),
          Animated.parallel([
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 650,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
              toValue: 1,
              friction: 7,
              tension: 45,
              useNativeDriver: true,
            }),
            Animated.timing(logoGlow, {
              toValue: 1,
              duration: 900,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();

      // 3. Dejamos respirar el logo
      await wait(2200);

      // 4. La "cámara" entra hacia el logo
      Animated.parallel([
        Animated.timing(cameraScale, {
          toValue: 7,
          duration: 1050,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 850,
          delay: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // 5. Entramos a la aplicación
      await wait(1050);

      router.replace('/(tabs)');
    };

    runIntro();
  }, []);

  const leftDoorX = doorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width * 0.92],
  });

  const rightDoorX = doorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.92],
  });

  const glowOpacity = logoGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: screenOpacity,
          transform: [{ scale: cameraScale }],
        },
      ]}
    >
      <StatusBar hidden />

      {/* ESPACIO / FONDO */}
      <View style={styles.space} />

      {/* Estrellas */}
      <View style={styles.stars}>
        {STARS.map((star, index) => (
          <View
            key={index}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
      </View>

      {/* Luz central detrás de las puertas */}
      <View style={styles.centerLight} />

      {/* LOGO */}
      <View style={styles.logoScene}>
        {/* Glow */}
        <Animated.View
          style={[
            styles.logoGlow,
            {
              opacity: glowOpacity,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text style={styles.logoText}>
            i<Text style={styles.logoAlert}>Alert</Text>
          </Text>

          <View style={styles.logoLine} />

          <Text style={styles.tagline}>
            SISTEMA INTELIGENTE DE ALERTAS
          </Text>
        </Animated.View>
      </View>

      {/* PUERTA IZQUIERDA */}
      <Animated.View
        style={[
          styles.door,
          styles.leftDoor,
          {
            transform: [{ translateX: leftDoorX }],
          },
        ]}
      >
        <View style={styles.doorInner} />
        <View style={styles.doorLineVertical} />
        <View style={styles.doorLineHorizontal} />
      </Animated.View>

      {/* PUERTA DERECHA */}
      <Animated.View
        style={[
          styles.door,
          styles.rightDoor,
          {
            transform: [{ translateX: rightDoorX }],
          },
        ]}
      >
        <View style={styles.doorInner} />
        <View style={styles.doorLineVertical} />
        <View style={styles.doorLineHorizontal} />
      </Animated.View>

      {/* Borde luminoso inferior */}
      <View style={styles.bottomLight} />

      {/* Texto pequeño de presentación */}
      <Animated.Text
        style={[
          styles.loadingText,
          {
            opacity: logoOpacity,
          },
        ]}
      >
        PREPARANDO SISTEMA...
      </Animated.Text>
    </Animated.View>
  );
}

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/*
 * Estrellas estáticas para darle profundidad al fondo.
 * No dependemos de imágenes externas.
 */
const STARS = [
  { x: '8%', y: '12%', size: 2, opacity: 0.7 },
  { x: '18%', y: '25%', size: 1, opacity: 0.5 },
  { x: '29%', y: '9%', size: 2, opacity: 0.8 },
  { x: '42%', y: '18%', size: 1, opacity: 0.6 },
  { x: '55%', y: '8%', size: 2, opacity: 0.7 },
  { x: '68%', y: '20%', size: 1, opacity: 0.5 },
  { x: '82%', y: '11%', size: 2, opacity: 0.8 },
  { x: '92%', y: '28%', size: 1, opacity: 0.6 },

  { x: '12%', y: '42%', size: 1, opacity: 0.5 },
  { x: '23%', y: '55%', size: 2, opacity: 0.7 },
  { x: '34%', y: '38%', size: 1, opacity: 0.8 },
  { x: '72%', y: '44%', size: 2, opacity: 0.6 },
  { x: '87%', y: '53%', size: 1, opacity: 0.8 },

  { x: '6%', y: '72%', size: 2, opacity: 0.6 },
  { x: '19%', y: '84%', size: 1, opacity: 0.7 },
  { x: '37%', y: '76%', size: 2, opacity: 0.5 },
  { x: '63%', y: '82%', size: 1, opacity: 0.7 },
  { x: '79%', y: '74%', size: 2, opacity: 0.6 },
  { x: '94%', y: '88%', size: 1, opacity: 0.8 },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020611',
    overflow: 'hidden',
  },

  space: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020611',
  },

  stars: {
    ...StyleSheet.absoluteFillObject,
  },

  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 50,
  },

  centerLight: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width,
    backgroundColor: 'rgba(0, 190, 255, 0.08)',
    alignSelf: 'center',
    top: height * 0.18,
  },

  logoScene: {
    position: 'absolute',
    width: width,
    height: height,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.35,
    borderRadius: width,
    backgroundColor: 'rgba(0, 220, 255, 0.16)',
    shadowColor: '#00D9FF',
    shadowOpacity: 0.9,
    shadowRadius: 45,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },

  logoContainer: {
    alignItems: 'center',
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: Math.min(width * 0.18, 82),
    fontWeight: '800',
    letterSpacing: -3,
    textShadowColor: '#00D9FF',
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 18,
  },

  logoAlert: {
    color: '#00D9FF',
  },

  logoLine: {
    width: width * 0.38,
    height: 2,
    backgroundColor: '#00D9FF',
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#00D9FF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },

  tagline: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2.5,
  },

  door: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: width * 0.56,
    backgroundColor: '#07101E',
    borderColor: '#14283D',
    overflow: 'hidden',
  },

  leftDoor: {
    left: 0,
    borderRightWidth: 2,
  },

  rightDoor: {
    right: 0,
    borderLeftWidth: 2,
  },

  doorInner: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    width: '75%',
    borderColor: 'rgba(0, 217, 255, 0.18)',
    borderWidth: 1,
  },

  doorLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
  },

  doorLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(0, 217, 255, 0.10)',
  },

  bottomLight: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00D9FF',
    shadowColor: '#00D9FF',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },

  loadingText: {
    position: 'absolute',
    bottom: 45,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '500',
  },
});
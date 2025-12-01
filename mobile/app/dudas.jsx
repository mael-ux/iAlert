// mobile/app/nasa.jsx (renamed or pasted into your FAQ file)
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  ScrollView // Added ScrollView
} from 'react-native';
import { useTheme } from './ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import SafeAreaWrapper from './components/safeAreaWrapper'; // Import Added
import CustomHeader from './components/customHeader';       // Import Added

// Activar animaciones en Android para LayoutAnimation
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Componente Individual de Acordeón ---
const AccordionItem = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();

  // Función para manejar el despliegue/cierre
  const toggleExpand = () => {
    // Aplica la animación nativa de layout
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[
      styles.accordionContainer, 
      { borderColor: theme.border || '#E0E0E0' } // Use theme border if available
    ]}>
      {/* 1. Botón de Pregunta */}
      <TouchableOpacity
        style={[styles.questionButton, { backgroundColor: theme.card || theme.surface }]} // Changed to theme.card for consistency
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Text style={[styles.questionText, { color: theme.text }]}>{question}</Text>
        {/* Ícono de flecha que rota */}
        <MaterialIcons 
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
          size={24} 
          color={theme.text} 
        />
      </TouchableOpacity>

      {/* 2. Respuesta que se muestra condicionalmente */}
      {expanded && (
        <View style={[styles.answerView, { backgroundColor: theme.background || '#f9f9f9', borderColor: theme.border || '#E0E0E0' }]}>
          <Text style={[styles.answerText, { color: theme.textLight || theme.text }]}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

// --- Componente Principal de la Pantalla ---
export default function AlertsScreen() {
  const { theme } = useTheme();

  // Datos de las Preguntas Frecuentes (FAQ)
  const faqData = [
    {
      id: 1,
      question: " ¿Qué tipo de desastres naturales notifica iAlert?",
      answer: "iAlert envía alertas de terremotos, huracanes, tormentas, inundaciones, incendios forestales y otros eventos de riesgo emitidos por autoridades oficiales.",
    },
    {
      id: 2,
      question: "¿Necesito estar conectado a internet para recibir alertas?",
      answer: "Sí, se requiere conexión a internet o datos móviles para recibir notificaciones en tiempo real.",
    },
    {
      id: 3,
      question: "¿La app funciona en cualquier país?",
      answer: "Actualmente iAlert funciona en los países compatibles con nuestras fuentes oficiales de datos. Seguimos ampliando cobertura.",
    },
    {
      id: 4,
      question: "¿La app puede funcionar sin GPS?",
      answer: "Sí, pero las alertas no estarán personalizadas a tu ubicación exacta.",
    },
    {
      id: 5,
      question: "¿Qué hago si la app no me envía notificaciones?",
      answer: "Revisa permisos de notificación, conexión a internet y asegúrate de que tu ubicación esté activada.",
    },
    {
      id: 6,
      question: "¿Por qué a veces las alertas llegan con retraso?",
      answer: "Algunas alertas se publican después de que organismos oficiales verifican la información para evitar errores.",
    },
    {
      id: 7,
      question: "¿Qué significa la clasificación de riesgo en las notificaciones?",
      answer: "Las alertas pueden ser: Informativas, Preventivas o de Emergencia — dependiendo del nivel de peligro.",
    },
    {
      id: 8,
      question: "¿Qué hago si recibo una alerta falsa?",
      answer: "Revisa la información dentro de la alerta. Si crees que es incorrecta, puedes reportarla en la sección “Soporte”.",
    },
  ];

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Added Custom Header */}
      <CustomHeader title="Preguntas Frecuentes" backTo="/(tabs)/user" />
      
      {/* Wrapped in ScrollView so you can see all items */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mapeo de los datos para crear los componentes de acordeón */}
        {faqData.map(item => (
          <AccordionItem 
            key={item.id} 
            question={item.question} 
            answer={item.answer} 
          />
        ))}
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Removed paddingTop: 50 because CustomHeader and SafeAreaWrapper handle this now
  },
  scrollContent: {
    padding: 20, // Padding moved here for the scroll view
    paddingBottom: 40,
  },
  // Removed 'title' style because CustomHeader handles the title now
  
  // --- Estilos del Acordeón ---
  accordionContainer: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12, // Increased radius for modern look
    overflow: 'hidden',
    borderWidth: 1,
  },
  questionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  answerView: {
    padding: 16,
    borderTopWidth: 1,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import SafeAreaWrapper from "../components/safeAreaWrapper";
import { COLORS } from "../../constants/colors";
import { AI_API_URL } from "../../constants/api";

export default function ChatBot() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "👋 Hola, selecciona un continente para comenzar:" },
  ]);

  const [region, setRegion] = useState("");
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState("");

  const scrollRef = useRef();

  const [showContinents, setShowContinents] = useState(true);
  const [showCountries, setShowCountries] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const continentes = ["Asia", "Europe", "Africa", "America", "Oceania"];

  // ------------------------------------------
  // 1️⃣ Select Continent
  // ------------------------------------------
  const elegirContinente = async (cont) => {
    setRegion(cont);
    setMessages((m) => [...m, { from: "user", text: cont }]);
    setMessages((m) => [...m, { from: "bot", text: "Cargando países... 🔄" }]);
    setShowContinents(false);
    setIsLoading(true);

    try {
      const response = await fetch(`${AI_API_URL}/api/countries/${cont}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      setCountries(data.countries);
      setShowCountries(true);

      setMessages((m) => [
        ...m,
        { from: "bot", text: "Perfecto 👍 Ahora elige un país:" },
      ]);
    } catch (err) {
      console.error("Error fetching countries:", err);
      setMessages((m) => [
        ...m,
        { 
          from: "bot", 
          text: "⚠️ Error cargando países. Verifica tu conexión a internet." 
        },
      ]);
      // Reset to allow retry
      setShowContinents(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------------------------------
  // 2️⃣ Select Country
  // ------------------------------------------
  const elegirPais = async (p) => {
    setCountry(p);
    setMessages((m) => [...m, { from: "user", text: p }]);
    setShowCountries(false);
    setMessages((m) => [
      ...m,
      { from: "bot", text: "Procesando predicción... ⏳" },
    ]);
    setIsLoading(true);

    // Call AI prediction endpoint
    try {
      const response = await fetch(`${AI_API_URL}/api/predict-disaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, country: p }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.predictions) {
        setMessages((m) => [
          ...m,
          { from: "bot", text: "❌ Error obteniendo predicción." },
        ]);
      } else {
        // Format predictions nicely
        let texto = `📊 *Predicción para ${p}, ${region}:*\n\n`;

        // Sort predictions by probability (highest first)
        const sortedPredictions = Object.entries(data.predictions)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5); // Show top 5 only

        sortedPredictions.forEach(([desastre, prob]) => {
          const percentage = (prob * 100).toFixed(2);
          const emoji = prob > 0.3 ? "🔴" : prob > 0.1 ? "🟡" : "🟢";
          texto += `${emoji} ${desastre}: ${percentage}%\n`;
        });

        setMessages((m) => [...m, { from: "bot", text: texto }]);
      }
    } catch (e) {
      console.error("Prediction error:", e);
      setMessages((m) => [
        ...m,
        { 
          from: "bot", 
          text: "⚠️ No se pudo conectar con el servicio de IA. Verifica tu conexión." 
        },
      ]);
    } finally {
      setIsLoading(false);
    }

    // Reset for new query
    setRegion("");
    setCountry("");
    setCountries([]);
    setShowContinents(true);

    setMessages((m) => [
      ...m,
      { from: "bot", text: "🌎 ¿Quieres otra predicción? Selecciona un continente:" },
    ]);
  };

  return (
    <SafeAreaWrapper style={styles.container}>
      <ScrollView ref={scrollRef} style={styles.chat}>
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              msg.from === "user" ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={msg.from === "user" ? styles.userText : styles.botText}
            >
              {msg.text}
            </Text>
          </View>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}

        {/* Continent buttons */}
        {showContinents && !isLoading && (
          <View style={styles.btnContainer}>
            {continentes.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={styles.contBtn}
                onPress={() => elegirContinente(c)}
              >
                <Text style={styles.contBtnText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Country buttons */}
        {showCountries && !isLoading && (
          <View style={styles.btnContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.countryScrollContainer}
            >
              {countries.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.countryBtn}
                  onPress={() => elegirPais(p)}
                >
                  <Text style={styles.countryBtnText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// ----------------------------------------------------------
// APP-THEMED WHATSAPP-STYLE DESIGN
// ----------------------------------------------------------
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background  // Use app background
  },

  chat: { 
    flex: 1, 
    padding: 10 
  },

  bubble: {
    marginVertical: 6,
    padding: 12,
    maxWidth: "75%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  botBubble: {
    backgroundColor: COLORS.card,  // Use app card color
    alignSelf: "flex-start",
    borderBottomLeftRadius: 0,
  },

  userBubble: {
    backgroundColor: COLORS.primary + '20',  // Primary color with transparency
    alignSelf: "flex-end",
    borderBottomRightRadius: 0,
  },

  botText: { 
    color: COLORS.text,  // Use app text color
    fontSize: 15,
    lineHeight: 20,
  },
  
  userText: { 
    color: COLORS.text,  // Use app text color
    fontSize: 15 
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },

  btnContainer: {
    marginVertical: 15,
    paddingHorizontal: 5,
  },

  contBtn: {
    backgroundColor: COLORS.primary,  // Use app primary color (red)
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginVertical: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  contBtnText: {
    color: COLORS.white,  // Use white for contrast
    fontWeight: "bold",
    fontSize: 15,
  },

  countryScrollContainer: {
    paddingVertical: 5,
  },

  countryBtn: {
    backgroundColor: COLORS.primary,  // Use app primary color (red)
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  countryBtnText: {
    color: COLORS.white,  // Use white for contrast
    fontWeight: "bold",
    fontSize: 14,
  },
});
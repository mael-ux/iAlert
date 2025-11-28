import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

export default function ChatBot() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "👋 Hola, selecciona un continente para comenzar:" },
  ]);

  const [region, setRegion] = useState("");
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState("");
  const [input, setInput] = useState("");
  const scrollRef = useRef();

  const [showContinents, setShowContinents] = useState(true);
  const [showCountries, setShowCountries] = useState(false);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const continentes = ["Asia", "Europe", "Africa", "America", "Oceania"];

  // ------------------------------------------
  // 1️⃣ Seleccionar continente
  // ------------------------------------------
  const elegirContinente = async (cont) => {
    setRegion(cont);

    setMessages((m) => [...m, { from: "user", text: cont }]);
    setMessages((m) => [...m, { from: "bot", text: "Cargando países... 🔄" }]);

    setShowContinents(false);

    try {
      const response = await fetch(
        `http://10.0.2.2:8001/api/countries/${cont}`
      );
      const data = await response.json();

      setCountries(data.countries);
      setShowCountries(true);

      setMessages((m) => [
        ...m,
        { from: "bot", text: "Perfecto 👍 Ahora elige un país:" },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { from: "bot", text: "⚠️ Error cargando países." },
      ]);
    }
  };

  // ------------------------------------------
  // 2️⃣ Seleccionar país
  // ------------------------------------------
  const elegirPais = async (p) => {
    setCountry(p);

    setMessages((m) => [...m, { from: "user", text: p }]);

    setShowCountries(false);

    setMessages((m) => [
      ...m,
      { from: "bot", text: "Procesando predicción... ⏳" },
    ]);

    // Llamar IA
    try {
      const response = await fetch(
        "http://10.0.2.2:8001/api/predict-disaster",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ region, country: p }),
        }
      );

      const data = await response.json();

      if (!data.predictions) {
        setMessages((m) => [
          ...m,
          { from: "bot", text: "❌ Error obteniendo predicción." },
        ]);
      } else {
        let texto = `📊 *Predicción para ${p}, ${region}:*\n\n`;

        Object.entries(data.predictions).forEach(([desastre, prob]) => {
          texto += `• ${desastre}: ${(prob * 100).toFixed(2)}%\n`;
        });

        setMessages((m) => [...m, { from: "bot", text: texto }]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { from: "bot", text: "⚠️ No se pudo conectar con la IA." },
      ]);
    }

    // Reset para nueva consulta
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
    <View style={styles.container}>
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

        {/* Continentes */}
        {showContinents && (
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

        {/* Países */}
        {showCountries && (
          <View style={styles.btnContainer}>
            {countries.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={styles.countryBtn}
                onPress={() => elegirPais(p)}
              >
                <Text style={styles.countryBtnText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ----------------------------------------------------------
// ESTILOS TIPO WHATSAPP MEJORADOS
// ----------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ECE5DD" },

  chat: { flex: 1, padding: 10 },

  bubble: {
    marginVertical: 6,
    padding: 12,
    maxWidth: "75%",
    borderRadius: 16,
  },

  botBubble: {
    backgroundColor: "#ffffff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 0,
  },

  userBubble: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
    borderBottomRightRadius: 0,
  },

  botText: { color: "#000", fontSize: 15 },
  userText: { color: "#000", fontSize: 15 },

  btnContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 15,
    justifyContent: "center",
  },

  contBtn: {
    backgroundColor: "#34B7F1",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 5,
  },

  contBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  countryBtn: {
    backgroundColor: "#25D366",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 5,
  },

  countryBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

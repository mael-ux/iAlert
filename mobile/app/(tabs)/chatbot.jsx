// mobile/app/(tabs)/chatbot.jsx
// Conversational GenAI chat screen over POST /api/chat.
// Replaces the legacy stepwise continent -> country -> predict flow.
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SafeAreaWrapper from "../components/safeAreaWrapper";
import { AI_API_URL } from "../../constants/api";
import {
  USE_NEW_CHAT,
  CHAT_ENDPOINT_PATH,
  CHAT_SESSION_KEY,
} from "../../constants/chatConfig";
import { useTheme } from "../ThemeContext"; // Import theme context

const WELCOME_TEXT =
  "👋 Hi! Ask me about weather or disaster risk anywhere in the world.";

export default function ChatBot() {
  const { theme } = useTheme(); // Use the theme hook

  const [messages, setMessages] = useState([{ from: "bot", text: WELCOME_TEXT }]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failedMessage, setFailedMessage] = useState(null);

  const scrollRef = useRef();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Restore the persisted session so follow-ups keep server context
  // across app restarts. An unknown/expired id is adopted fresh by the
  // server (no error); we persist whatever id comes back.
  useEffect(() => {
    AsyncStorage.getItem(CHAT_SESSION_KEY)
      .then((stored) => {
        if (stored) {
          setSessionId(stored);
        }
      })
      .catch(() => {
        // Storage unavailable: fall back to in-memory session only.
      });
  }, []);

  const persistSession = async (id) => {
    setSessionId(id);
    try {
      await AsyncStorage.setItem(CHAT_SESSION_KEY, id);
    } catch {
      // Storage unavailable: keep the in-memory session only.
    }
  };

  const sendMessage = async (text) => {
    const message = (text ?? input).trim();
    if (!message || isLoading) {
      return;
    }

    setInput("");
    setFailedMessage(null);
    setMessages((m) => [...m, { from: "user", text: message }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${AI_API_URL}${CHAT_ENDPOINT_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Adopt the server's session id (fresh on first turn or whenever
      // the server rotated it) and persist it for follow-ups.
      if (data.session_id && data.session_id !== sessionId) {
        await persistSession(data.session_id);
      }

      setMessages((m) => [
        ...m,
        { from: "bot", text: data.response ?? "⚠️ Empty response from AI service." },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setFailedMessage(message);
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: "⚠️ Couldn't reach the AI service. Check your connection and try again.",
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const retryFailed = () => {
    if (failedMessage) {
      // Drop the error bubble, then resend the failed message.
      setMessages((m) => m.filter((msg) => !msg.error));
      sendMessage(failedMessage);
    }
  };

  if (!USE_NEW_CHAT) {
    return (
      <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.disabledContainer}>
          <Text style={[styles.disabledText, { color: theme.text }]}>
            💬 The new chat experience is under maintenance. Please check back soon.
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView ref={scrollRef} style={styles.chat}>
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              msg.from === "user"
                ? [styles.userBubble, { backgroundColor: theme.primary + '20' }] // Transparent Primary
                : [styles.botBubble, { backgroundColor: theme.card }],           // Theme Card Color
            ]}
          >
            <Text
              style={[
                msg.from === "user" ? styles.userText : styles.botText,
                { color: theme.text } // Dynamic Text Color
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}

        {/* Retry button after an API/network error */}
        {failedMessage && !isLoading && (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
            onPress={retryFailed}
          >
            <Text style={[styles.retryBtnText, { color: theme.white }]}>↻ Retry</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.primary, backgroundColor: theme.card },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about weather or disaster risk…"
          placeholderTextColor={theme.text + "80"}
          multiline
          editable={!isLoading}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: theme.primary, opacity: !input.trim() || isLoading ? 0.5 : 1 },
          ]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || isLoading}
        >
          <Text style={[styles.sendBtnText, { color: theme.white }]}>➤</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaWrapper>
  );
}

// ----------------------------------------------------------
// APP-THEMED WHATSAPP-STYLE DESIGN (reuses legacy bubbles)
// ----------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  chat: {
    flex: 1,
    padding: 10,
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
    alignSelf: "flex-start",
    borderBottomLeftRadius: 0,
  },

  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 0,
  },

  botText: {
    fontSize: 15,
    lineHeight: 20,
  },

  userText: {
    fontSize: 15,
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },

  retryBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginVertical: 8,
  },

  retryBtnText: {
    fontWeight: "bold",
    fontSize: 14,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },

  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  sendBtnText: {
    fontSize: 18,
    fontWeight: "bold",
  },

  disabledContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  disabledText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});

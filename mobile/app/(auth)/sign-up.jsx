import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { authStyles } from "../../assets/styles/auth.styles";
import { Image } from "expo-image";
import { COLORS } from "../../constants/colors";
import * as WebBrowser from "expo-web-browser";

import { Ionicons } from "@expo/vector-icons";
import VerifyEmail from "./verify-email";

import { useTheme } from "../ThemeContext"; // Import Theme Context
import SafeAreaWrapper from "../components/safeAreaWrapper"; // Import SafeAreaWrapper

WebBrowser.maybeCompleteAuthSession();

const SignUpScreen = () => {
  const router = useRouter();
  const { theme } = useTheme(); // Use Theme Hook
  const { isLoaded, signUp } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  // --- OAuth Setup ---
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const onSocialSignUp = async (provider) => {
    if (!isLoaded) return;

    try {
      const startAuth = provider === 'google' ? startGoogleOAuth : startAppleOAuth;
      const { createdSessionId, signUp, setActive } = await startAuth();

      if (createdSessionId) {
        setActive({ session: createdSessionId });
        router.replace("/(tabs)");
      } else {
        console.log("OAuth flow started, but no session created. User may need to verify email.");
      }
    } catch (err) {
      console.error("OAuth error", JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.message || "Failed to sign up with social account");
    }
  };
  // --- End of OAuth Setup ---

  const handleSignUp = async () => {
    // This is the validation you asked about. It works!
    if (!firstName || !lastName || !email || !password) {
      return Alert.alert("Error", "Please fill in all fields");
    }
    if (password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");

    if (!isLoaded) return;

    setLoading(true);

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);

    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Failed to create account");
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification)
    return <VerifyEmail email={email} onBack={() => setPendingVerification(false)} />;

  return (
    <SafeAreaWrapper style={[authStyles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        style={authStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false} 
        >

          <Text style={[authStyles.title, { color: theme.text }]}>Create Account</Text>

          <View style={authStyles.formContainer}>
            <View style={authStyles.inputContainer}>
              <TextInput
                style={[
                  authStyles.textInput, 
                  { 
                    backgroundColor: theme.card, 
                    color: theme.text, 
                    borderColor: theme.border 
                  }
                ]}
                placeholder="First name"
                placeholderTextColor={theme.textLight}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            
            <View style={authStyles.inputContainer}>
              <TextInput
                style={[
                  authStyles.textInput, 
                  { 
                    backgroundColor: theme.card, 
                    color: theme.text, 
                    borderColor: theme.border 
                  }
                ]}
                placeholder="Last name"
                placeholderTextColor={theme.textLight}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>

            <View style={authStyles.inputContainer}>
              <TextInput
                style={[
                  authStyles.textInput, 
                  { 
                    backgroundColor: theme.card, 
                    color: theme.text, 
                    borderColor: theme.border 
                  }
                ]}
                placeholder="Enter email"
                placeholderTextColor={theme.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={authStyles.inputContainer}>
              <TextInput
                style={[
                  authStyles.textInput, 
                  { 
                    backgroundColor: theme.card, 
                    color: theme.text, 
                    borderColor: theme.border 
                  }
                ]}
                placeholder="Enter password"
                placeholderTextColor={theme.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={authStyles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={theme.textLight}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                authStyles.authButton, 
                { backgroundColor: theme.primary },
                loading && authStyles.buttonDisabled
              ]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[authStyles.buttonText, { color: theme.white }]}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={authStyles.dividerContainer}>
            <View style={[authStyles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[authStyles.dividerText, { color: theme.textLight }]}>OR</Text>
            <View style={[authStyles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <View style={authStyles.socialContainer}>
            <TouchableOpacity
              style={[authStyles.socialButton, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => onSocialSignUp('google')}
            >
              <Image 
                source={require("../../assets/images/google.png")}
                style={authStyles.socialIcon}
              />
              <Text style={[authStyles.socialButtonText, { color: theme.text }]}>
                Sign up with Google
              </Text>
            </TouchableOpacity>
            
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[authStyles.socialButton, { backgroundColor: '#000' }]}
                onPress={() => onSocialSignUp('apple')}
              >
                <Image
                  source={require("../../assets/images/Apple-Logo.png")}
                  style={authStyles.socialIcon}
                  tintColor="#fff"
                />
                <Text style={[authStyles.socialButtonText, { color: '#fff' }]}>
                  Sign up with Apple
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={authStyles.linkContainer} onPress={() => router.back()}>
            <Text style={[authStyles.linkText, { color: theme.text }]}>
              Already have an account? <Text style={[authStyles.link, { color: theme.primary }]}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};
export default SignUpScreen;
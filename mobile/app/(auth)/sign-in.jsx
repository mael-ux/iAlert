import { useSignIn, useOAuth } from "@clerk/clerk-expo"; // <-- Import useOAuth
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform, // <-- Import Platform
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser"; // <-- Import WebBrowser

import { authStyles } from "../../assets/styles/auth.styles";
import { COLORS } from "../../constants/colors";

// This is required for Apple Sign In to work on iOS
WebBrowser.maybeCompleteAuthSession();

const SignInScreen = () => {
  const router = useRouter();

  const { signIn, setActive, isLoaded } = useSignIn();

  // --- OAuth Setup ---
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const onSocialSignIn = async (provider) => {
    if (!isLoaded) return;

    try {
      const startAuth = provider === 'google' ? startGoogleOAuth : startAppleOAuth;
      // Note: For sign-in, we just need the session.
      const { createdSessionId, setActive } = await startAuth();

      if (createdSessionId) {
        // If successful, sign the user in
        setActive({ session: createdSessionId });
        router.replace("/"); // Navigate to your main app (POTD screen)
      } else {
        // This can happen if the user needs to complete profile info
        console.log("OAuth flow started, but no session created.");
      }
    } catch (err) {
      console.error("OAuth error", JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.message || "Failed to sign in with social account");
    }
  };
  // --- End of OAuth Setup ---

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isLoaded) return;

    setLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        Alert.alert("Error", "Sign in failed. Please try again.");
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Sign in failed");
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          scrollEnabled={false}
          contentContainerStyle={authStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={authStyles.imageContainer}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          <Text style={authStyles.title}>Welcome Back</Text>

          {/* --- THIS BLOCK MOVED UP --- */}
          <View style={authStyles.formContainer}>
            {/* Email Input */}
            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter email"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* PASSWORD INPUT */}
            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textLight}
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
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
  onPress={() => router.push("/(auth)/forgot-password")}
  style={{ alignSelf: 'flex-end', marginBottom: 15 }}
>
  <Text style={{ color: COLORS.primary, fontSize: 14 }}>
    Forgot Password?
  </Text>
</TouchableOpacity>
            
            <TouchableOpacity
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={authStyles.buttonText}>{loading ? "Signing In..." : "Sign In"}</Text>
            </TouchableOpacity>
          </View>

          {/* --- DIVIDER MOVED DOWN --- */}
          <View style={authStyles.dividerContainer}>
            <View style={authStyles.dividerLine} />
            <Text style={authStyles.dividerText}>OR</Text>
            <View style={authStyles.dividerLine} />
          </View>

          {/* --- SOCIAL BUTTONS MOVED DOWN --- */}
          <View style={authStyles.socialContainer}>
            <TouchableOpacity
              style={[authStyles.socialButton, { backgroundColor: COLORS.white }]}
              onPress={() => onSocialSignIn('google')}
            >
              <Image 
                source={require("../../assets/images/google.png")} 
                style={authStyles.socialIcon}
              />
              <Text style={[authStyles.socialButtonText, { color: '#000' }]}>
                Sign in with Google
              </Text>
            </TouchableOpacity>
            
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[authStyles.socialButton, { backgroundColor: '#000' }]} 
                onPress={() => onSocialSignIn('apple')}
              >
                <Image
                  source={require("../../assets/images/Apple-Logo.png")} 
                  style={authStyles.socialIcon}
                  tintColor="#fff" 
                />
                <Text style={[authStyles.socialButtonText, { color: '#fff' }]}>
                  Sign in with Apple
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* --- SIGN UP LINK STAYS AT THE BOTTOM --- */}
          <TouchableOpacity
            style={authStyles.linkContainer}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text style={authStyles.linkText}>
              Don&apos;t have an account? <Text style={authStyles.link}>Sign up</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
export default SignInScreen;
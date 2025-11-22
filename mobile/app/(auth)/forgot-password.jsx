// app/(auth)/forgot-password.jsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { authStyles } from '../../assets/styles/auth.styles';
import { Image } from 'expo-image';
import { COLORS } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPassword() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: email, 2: code + new password
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    if (!isLoaded) return;
    
    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setStep(2);
      Alert.alert('Success', 'Reset code sent to your email!');
    } catch (err) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to send reset code');
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!isLoaded) return;

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        Alert.alert('Success', 'Password reset successfully!');
        router.replace('/');
      }
    } catch (err) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to reset password');
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={authStyles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* Image Container */}
          <View style={authStyles.imageContainer}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          <Text style={authStyles.title}>
            {step === 1 ? 'Reset Password' : 'Enter New Password'}
          </Text>
          
          {step === 1 ? (
            <>
              <Text style={authStyles.subtitle}>
                Enter your email address and we'll send you a reset code
              </Text>
              
              <View style={authStyles.formContainer}>
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

                <TouchableOpacity
                  style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
                  onPress={handleSendCode}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={authStyles.buttonText}>
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={authStyles.subtitle}>
                Enter the code sent to {email}
              </Text>
              
              <View style={authStyles.formContainer}>
                <View style={authStyles.inputContainer}>
                  <TextInput
                    style={authStyles.textInput}
                    placeholder="Verification code"
                    placeholderTextColor={COLORS.textLight}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={authStyles.inputContainer}>
                  <TextInput
                    style={authStyles.textInput}
                    placeholder="New password"
                    placeholderTextColor={COLORS.textLight}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={authStyles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.textLight}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={authStyles.buttonText}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          
          <TouchableOpacity 
            style={authStyles.linkContainer} 
            onPress={() => router.back()}
          >
            <Text style={authStyles.linkText}>
              <Text style={authStyles.link}>Back to Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MKSLogo } from "@/components/MKSLogo";
import { SetupBanner } from "@/components/SetupBanner";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, isFirebaseReady } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, displayName.trim());
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg =
        e?.code === "auth/invalid-credential" || e?.code === "auth/wrong-password"
          ? "Invalid email or password."
          : e?.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : e?.code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : e?.message ?? "Something went wrong. Please try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[colors.navyDark, colors.navyBlue, colors.navyMid]}
      style={StyleSheet.absoluteFill}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoArea}>
            <MKSLogo size="large" light />
            <Text style={styles.tagline}>Document Management System</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {!isFirebaseReady && <SetupBanner />}

            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
              {mode === "login"
                ? "Sign in to access your documents"
                : "Register to get started"}
            </Text>

            {mode === "register" && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Full Name</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Feather name="user" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Your full name"
                    placeholderTextColor={colors.mutedForeground}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Feather name="mail" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { borderColor: colors.border }]}>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.divText, { color: colors.mutedForeground }]}>OR</Text>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              style={[styles.toggleBtn, { borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, { color: colors.primary }]}>
                {mode === "login" ? "Create a new account" : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>MKS Education Service © 2025</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 0,
  },
  logoArea: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  tagline: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 4,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: -8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divLine: {
    flex: 1,
    height: 1,
  },
  divText: {
    fontSize: 12,
    fontWeight: "600",
  },
  toggleBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    fontSize: 11,
    marginTop: 24,
  },
});

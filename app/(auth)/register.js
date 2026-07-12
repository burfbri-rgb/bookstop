import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as authApi from "../../api/auth";
import { Btn, Input, Card } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

function Success() {
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.successContainer}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
      </Animated.View>
      <Animated.Text style={[s.successTitle, { opacity: fade }]}>Account Created!</Animated.Text>
      <Animated.Text style={[s.successText, { opacity: fade }]}>Redirecting to login...</Animated.Text>
    </View>
  );
}

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.replace("/(auth)/login"), 1500);
    return () => clearTimeout(t);
  }, [done]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  if (done) return <Success />;

  const handle = async () => {
    if (!email || !password) { Alert.alert("Error", "Fill in all fields"); return; }
    if (password !== confirm) { Alert.alert("Error", "Passwords do not match"); return; }
    setBusy(true);
    try {
      await authApi.register(email, password);
      setDone(true);
    } catch (e) { Alert.alert("Registration failed", e.body || e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }] }}>
        <Card style={s.card}>
          <Text style={s.logo}>Bookstop</Text>
          <Text style={s.subtitle}>Create your account</Text>
          <Input placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ marginBottom: spacing.sm }} />
          <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ marginBottom: spacing.sm }} />
          <Input placeholder="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry style={{ marginBottom: spacing.md }} />
          <Btn title="Register" onPress={handle} busy={busy} />
        </Card>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: "center", padding: spacing.lg },
  card: { padding: spacing.lg, ...shadows.md },
  logo: { fontSize: 32, fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.lg },
  successContainer: { flex: 1, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  successTitle: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  successText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm },
});

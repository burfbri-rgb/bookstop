import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Btn, Input, Card } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handle = async () => {
    if (!email || !password) { Alert.alert("Error", "Fill in all fields"); return; }
    setBusy(true);
    try { await login(email, password); }
    catch (e) { Alert.alert("Login failed", e.body || e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }] }}>
        <Card style={s.card}>
          <Text style={s.logo}>Bookstop</Text>
          <Text style={s.subtitle}>Sign in to your account</Text>
          <Input placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ marginBottom: spacing.sm }} />
          <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ marginBottom: spacing.md }} />
          <Btn title="Sign In" onPress={handle} busy={busy} style={{ marginBottom: spacing.sm }} />
          <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={{ padding: spacing.sm }}>
            <Text style={s.link}>Don't have an account? Register</Text>
          </TouchableOpacity>
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
  link: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});

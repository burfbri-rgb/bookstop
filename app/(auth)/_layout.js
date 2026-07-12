import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function AuthLayout() {
  const { token } = useAuth();
  if (token) return <Redirect href="/(app)/dashboard" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { colors, spacing } from "../../context/Theme";

export default function AppLayout() {
  const { token } = useAuth();
  const { activeStore } = useStore();
  if (!token) return <Redirect href="/(auth)/login" />;
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.text,
      tabBarActiveTintColor: colors.primaryDark,
      tabBarInactiveTintColor: colors.textLight,
      tabBarStyle: {
        backgroundColor: "rgba(255,255,255,0.92)",
        borderTopColor: colors.border,
      },
      headerTitleStyle: { fontWeight: "700" },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: ({ size, color }) => <Ionicons name="grid" size={size} color={color} /> }} />
      <Tabs.Screen name="inventory" options={{ title: "Inventory", tabBarIcon: ({ size, color }) => <Ionicons name="cube" size={size} color={color} /> }} />
      <Tabs.Screen name="sale" options={{ title: "Sale", tabBarIcon: ({ size, color }) => <Ionicons name="cart" size={size} color={color} /> }} />
      <Tabs.Screen name="price-check" options={{ title: "Price Check", tabBarIcon: ({ size, color }) => <Ionicons name="scan" size={size} color={color} /> }} />
      <Tabs.Screen name="stores" options={{ title: "Settings", tabBarIcon: ({ size, color }) => <Ionicons name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}

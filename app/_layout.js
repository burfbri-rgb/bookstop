import { Slot, Redirect } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { StoreProvider } from "../context/StoreContext";
import { OfflineProvider } from "../context/OfflineContext";
import { ActivityIndicator, View } from "react-native";

function Root() {
  const { token, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" color="#FFD700" /></View>;
  return <Slot />;
}

export default function Layout() {
  return (
    <OfflineProvider>
      <AuthProvider>
        <StoreProvider>
          <Root />
        </StoreProvider>
      </AuthProvider>
    </OfflineProvider>
  );
}

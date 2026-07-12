import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { getItem, setItem, removeItem } from "./storage";
import * as authApi from "../api/auth";
import * as notificationsApi from "../api/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true }),
});

async function registerPushToken() {
  if (Platform.OS === "web") return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const token = await Notifications.getExpoPushTokenAsync();
  try { await notificationsApi.registerPushToken(token.data); } catch (e) { console.error(e); }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await getItem("token");
      const o = await getItem("owner_id");
      if (t && o) { setToken(t); setOwnerId(o); }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    await setItem("token", res.token);
    await setItem("owner_id", res.owner_id.toString());
    await removeItem("active_store");
    setToken(res.token);
    setOwnerId(res.owner_id);
    registerPushToken();
  }, []);

  const register = useCallback(async (email, password) => {
    const res = await authApi.register(email, password);
    await setItem("token", res.token);
    await setItem("owner_id", res.owner_id.toString());
    await removeItem("active_store");
    setToken(res.token);
    setOwnerId(res.owner_id);
    registerPushToken();
  }, []);

  const logout = useCallback(async () => {
    await removeItem("token");
    await removeItem("owner_id");
    await removeItem("active_store");
    setToken(null);
    setOwnerId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, ownerId, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

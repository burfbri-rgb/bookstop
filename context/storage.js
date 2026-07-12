import { Platform } from "react-native";

const web = Platform.OS === "web";

export async function getItem(key) {
  if (web) return localStorage.getItem(key);
  const { getItemAsync } = await import("expo-secure-store");
  return getItemAsync(key);
}

export async function setItem(key, value) {
  if (web) return localStorage.setItem(key, value);
  const { setItemAsync } = await import("expo-secure-store");
  return setItemAsync(key, value);
}

export async function removeItem(key) {
  if (web) return localStorage.removeItem(key);
  const { deleteItemAsync } = await import("expo-secure-store");
  return deleteItemAsync(key);
}

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import * as SQLite from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";
import { api } from "../api/client";

const OfflineContext = createContext(null);

let db;
async function openDb() {
  if (!db) db = await SQLite.openDatabaseAsync("bookstop_offline.db");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS inventory (
      item_id TEXT PRIMARY KEY,
      store_id TEXT,
      barcode_isbn TEXT,
      price REAL,
      stock_count INTEGER,
      clean_image_url TEXT
    );
    CREATE TABLE IF NOT EXISTS pending_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      endpoint TEXT,
      body TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((s) => setIsOnline(s.isConnected ?? true));
    const unsubApp = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") processQueue();
      appState.current = next;
    });
    return () => { unsubNet(); unsubApp(); };
  }, []);

  const cacheInventory = useCallback(async (items) => {
    const d = await openDb();
    await d.execAsync("DELETE FROM inventory");
    for (const item of items) {
      await d.runAsync(
        "INSERT INTO inventory (item_id, store_id, barcode_isbn, price, stock_count, clean_image_url) VALUES (?, ?, ?, ?, ?, ?)",
        item.item_id, item.store_id, item.barcode_isbn, item.price, item.stock_count, item.clean_image_url
      );
    }
  }, []);

  const getCachedInventory = useCallback(async (storeId) => {
    const d = await openDb();
    return await d.getAllAsync("SELECT * FROM inventory WHERE store_id = ?", storeId);
  }, []);

  const queueMutation = useCallback(async (endpoint, method, body) => {
    const d = await openDb();
    await d.runAsync(
      "INSERT INTO pending_sync (action, endpoint, body) VALUES (?, ?, ?)",
      method, endpoint, JSON.stringify(body)
    );
  }, []);

  const processQueue = useCallback(async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;
    const d = await openDb();
    const queue = await d.getAllAsync("SELECT * FROM pending_sync ORDER BY id ASC");
    if (queue.length === 0) return;
    for (const item of queue) {
      try {
        const body = JSON.parse(item.body);
        await api(item.endpoint, { method: item.action, body });
      } catch (e) {
        console.error("Sync failed for", item.id, e);
      }
    }
    await d.execAsync("DELETE FROM pending_sync");
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, cacheInventory, getCachedInventory, queueMutation, processQueue }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be inside OfflineProvider");
  return ctx;
}

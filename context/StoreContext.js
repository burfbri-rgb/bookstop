import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getItem, setItem, removeItem } from "./storage";

const KEY = "active_store";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [activeStore, setActiveStoreState] = useState(null);

  useEffect(() => {
    (async () => {
      const raw = await getItem(KEY);
      if (raw) setActiveStoreState(JSON.parse(raw));
    })();
  }, []);

  const setActiveStore = useCallback(async (store) => {
    setActiveStoreState(store);
    if (store) {
      await setItem(KEY, JSON.stringify(store));
    } else {
      await removeItem(KEY);
    }
  }, []);

  return (
    <StoreContext.Provider value={{ activeStore, setActiveStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}

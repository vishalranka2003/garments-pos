import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CONFIG_STORE_ID } from "../config";
import * as pos from "../api/pos";

type StoreContextValue = {
  storeId: string | null;
  storeName: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (__DEV__) {
        console.warn("[store] Bootstrapping: GET /stores …");
      }
      const stores = await pos.listStores();
      if (CONFIG_STORE_ID) {
        const found = stores.find((s) => s.id === CONFIG_STORE_ID);
        if (found) {
          setStoreId(found.id);
          setStoreName(found.name);
          return;
        }
        setError(
          `EXPO_PUBLIC_STORE_ID not found in your stores. Got ${stores.length} store(s).`
        );
        if (stores.length > 0) {
          setStoreId(stores[0].id);
          setStoreName(stores[0].name);
        }
        return;
      }
      if (stores.length > 0) {
        setStoreId(stores[0].id);
        setStoreName(stores[0].name);
        return;
      }
      const created = await pos.createStore("Main Shop");
      setStoreId(created.id);
      setStoreName(created.name);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (__DEV__) {
        console.warn("[store] Bootstrap failed:", msg);
      }
      setError(msg);
      setStoreId(null);
      setStoreName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const value = useMemo(
    () => ({
      storeId,
      storeName,
      loading,
      error,
      refresh: bootstrap,
    }),
    [storeId, storeName, loading, error, bootstrap]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return ctx;
}

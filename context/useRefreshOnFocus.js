import { useEffect } from "react";
import { usePathname } from "expo-router";

export function useRefreshOnFocus(load) {
  const pathname = usePathname();
  useEffect(() => { load(); }, [pathname]);
}

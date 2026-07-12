import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../context/StoreContext";
import { useOffline } from "../../context/OfflineContext";
import { useRefreshOnFocus } from "../../context/useRefreshOnFocus";
import * as inventoryApi from "../../api/inventory";
import * as statsApi from "../../api/stats";
import { Badge, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

function Skeleton() {
  return (
    <View style={{ padding: spacing.md }}>
      {[1,2,3].map(i => (
        <View key={i} style={[s.skelRow, { opacity: 1 - i * 0.15 }]}>
          <View style={s.skelBlock} />
          <View style={s.skelBlock} />
        </View>
      ))}
    </View>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { activeStore } = useStore();
  const { cacheInventory, getCachedInventory } = useOffline();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeStore) { setLoading(false); return; }
    try {
      const [itemsData, statsData] = await Promise.all([
        inventoryApi.listInventory(activeStore.store_id),
        statsApi.getStats(activeStore.store_id),
      ]);
      setItems(itemsData);
      setStats(statsData);
      cacheInventory(itemsData);
    }
    catch (e) {
      console.error(e);
      const cached = await getCachedInventory(activeStore.store_id);
      if (cached.length > 0) setItems(cached);
    }
    finally { setLoading(false); }
  }, [activeStore, cacheInventory, getCachedInventory]);

  useRefreshOnFocus(load);

  if (!activeStore) {
    return <EmptyState icon="storefront" title="No Store Selected" subtitle="Go to Settings to create or select a store." />;
  }

  const lowStock = items.filter(i => i.stock_count <= 2);
  const totalItems = items.reduce((s, i) => s + i.stock_count, 0);

  if (loading && items.length === 0) return <Skeleton />;

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={s.storeName}>{activeStore.store_name}</Text>

      <View style={s.row}>
        <View style={s.statCard}>
          <Ionicons name="cube" size={28} color={colors.primaryDark} />
          <Text style={s.cardNum}>{items.length}</Text>
          <Text style={s.cardLabel}>Products</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="layers" size={28} color={colors.primaryDark} />
          <Text style={s.cardNum}>{totalItems}</Text>
          <Text style={s.cardLabel}>Total Stock</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="cash" size={28} color={colors.primaryDark} />
          <Text style={s.cardNum}>${(stats?.daily_revenue ?? 0).toFixed(2)}</Text>
          <Text style={s.cardLabel}>Today's Revenue</Text>
        </View>
      </View>

      {lowStock.length > 0 && (
        <View style={s.alertCard}>
          <Ionicons name="warning" size={20} color={colors.warning} />
          <Text style={s.alertText}>{lowStock.length} item(s) low on stock</Text>
        </View>
      )}

      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push("/(app)/add-item")} activeOpacity={0.7}>
          <Ionicons name="camera" size={24} color={colors.primaryDark} />
          <Text style={s.quickLabel}>Add Item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push("/(app)/sale")} activeOpacity={0.7}>
          <Ionicons name="cart" size={24} color={colors.primaryDark} />
          <Text style={s.quickLabel}>New Sale</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  storeName: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: radius.lg, padding: spacing.md, alignItems: "center", ...shadows.sm },
  cardNum: { fontSize: 28, fontWeight: "800", color: colors.text, marginTop: spacing.sm },
  cardLabel: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  alertCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.warning },
  alertText: { fontSize: 14, color: colors.warning, marginLeft: spacing.sm, fontWeight: "500" },
  quickRow: { flexDirection: "row", gap: spacing.sm },
  quickBtn: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", ...shadows.sm },
  quickLabel: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, fontWeight: "500" },
  skelRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  skelBlock: { flex: 1, height: 100, backgroundColor: colors.border, borderRadius: radius.lg },
});

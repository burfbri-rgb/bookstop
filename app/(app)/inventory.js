import { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../context/StoreContext";
import { useOffline } from "../../context/OfflineContext";
import { useRefreshOnFocus } from "../../context/useRefreshOnFocus";
import * as inventoryApi from "../../api/inventory";
import { Badge, Btn, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function Inventory() {
  const router = useRouter();
  const { activeStore } = useStore();
  const { cacheInventory, getCachedInventory } = useOffline();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!activeStore) { setLoading(false); return; }
    try {
      const data = await inventoryApi.listInventory(activeStore.store_id);
      setItems(data);
      cacheInventory(data);
    } catch (e) {
      console.error(e);
      const cached = await getCachedInventory(activeStore.store_id);
      if (cached.length > 0) setItems(cached);
    }
    finally { setLoading(false); }
  }, [activeStore, cacheInventory, getCachedInventory]);

  useRefreshOnFocus(load);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i =>
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.barcode_isbn && i.barcode_isbn.toLowerCase().includes(q)) ||
      i.item_id?.toLowerCase().includes(q)
    );
  }, [items, query]);

  if (!activeStore) {
    return <EmptyState icon="storefront" title="No Store Selected" subtitle="Go to Settings to select a store." />;
  }

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <TextInput
          style={s.search}
          placeholder="Search by title, barcode..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <Btn title="" icon="camera" onPress={() => router.push("/(app)/add-item")} style={{ width: 48, height: 48, marginLeft: spacing.sm }} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: spacing.xxl }} size="large" color={colors.primaryDark} /> : (
        <FlatList data={filtered} keyExtractor={i => i.item_id?.toString() || i.clean_image_url}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.itemCard} onPress={() => router.push(`/(app)/item-detail/${item.item_id}`)} activeOpacity={0.7}>
              <View style={[s.thumb, !item.clean_image_url && { backgroundColor: colors.bgSecondary }]}>
                <Ionicons name={item.clean_image_url ? "image" : "cube"} size={24} color={colors.textLight} />
              </View>
              <View style={s.info}>
                {item.title ? <Text style={s.title} numberOfLines={1}>{item.title}</Text> : null}
                <Text style={s.price}>${parseFloat(item.price).toFixed(2)}</Text>
                {item.barcode_isbn && <Text style={s.barcode}>{item.barcode_isbn}</Text>}
              </View>
              <Badge label={String(item.stock_count)} variant={item.stock_count <= 2 ? "danger" : "success"} icon="cube" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={s.empty}>{query ? "No matches found." : 'No items yet. Tap the camera to add one.'}</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  topRow: { flexDirection: "row", marginBottom: spacing.md, alignItems: "center" },
  search: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm, ...shadows.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.border, justifyContent: "center", alignItems: "center" },
  info: { flex: 1, marginLeft: spacing.sm },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  price: { fontSize: 17, fontWeight: "700", color: colors.text },
  barcode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: spacing.xxl },
});

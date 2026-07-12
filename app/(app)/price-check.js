import { useState, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, FlatList } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useStore } from "../../context/StoreContext";
import { useRefreshOnFocus } from "../../context/useRefreshOnFocus";
import * as inventoryApi from "../../api/inventory";
import { Badge, Btn, Card, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function PriceCheck() {
  const { activeStore } = useStore();
  const [permission, request] = useCameraPermissions();
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const zoom = useRef(new Animated.Value(0.8)).current;

  const load = useCallback(async () => {
    if (!activeStore) return;
    try {
      const data = await inventoryApi.listInventory(activeStore.store_id);
      setItems(data);
    } catch {}
  }, [activeStore]);

  useRefreshOnFocus(load);

  if (!activeStore) return <EmptyState icon="storefront" title="No Store Selected" subtitle="Select a store first." />;

  if (!permission?.granted) {
    return (
      <View style={s.center}>
        <Ionicons name="camera" size={64} color={colors.textSecondary} />
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginTop: spacing.md, marginBottom: spacing.md }}>Camera Permission Required</Text>
        <Btn title="Grant Access" onPress={request} />
      </View>
    );
  }

  const handleBarcode = async ({ data }) => {
    if (found || busy) return;
    setBusy(true);
    try {
      const item = await inventoryApi.lookupBarcode(activeStore.store_id, data);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setFound(item);
      Animated.spring(zoom, { toValue: 1, useNativeDriver: true }).start();
    } catch (e) {
      if (e.status === 404) {
        Alert.alert("Not Found", "No item with this barcode in your store.");
      } else {
        Alert.alert("Error", e.body || e.message);
      }
    }
    finally { setBusy(false); }
  };

  const filtered = query.trim()
    ? items.filter(i => i.title && i.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  if (found) {
    return (
      <View style={s.center}>
        <Animated.View style={{ alignItems: "center", transform: [{ scale: zoom }] }}>
          <Card style={{ alignItems: "center", padding: spacing.xl, width: "100%" }}>
            <Ionicons name="pricetag" size={48} color={colors.primaryDark} />
            {found.title ? <Text style={s.foundTitle}>{found.title}</Text> : null}
            <Text style={s.price}>${parseFloat(found.price).toFixed(2)}</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg }}>
              <Badge label={`${found.stock_count} in stock`} icon="cube" variant={found.stock_count <= 2 ? "danger" : "success"} />
              {found.barcode_isbn && <Badge label={found.barcode_isbn} icon="barcode" />}
            </View>
          </Card>
        </Animated.View>
        <Btn title="Scan Another" icon="scan" onPress={() => { setFound(null); zoom.setValue(0.8); }} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      <View style={s.searchBar}>
        <Ionicons name="search" size={20} color={colors.textLight} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by title..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {query.trim() && filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={i => i.item_id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.resultCard} onPress={() => { setFound(item); setQuery(""); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <View style={s.resultInfo}>
                {item.title ? <Text style={s.resultTitle} numberOfLines={1}>{item.title}</Text> : null}
                <Text style={s.resultPrice}>${parseFloat(item.price).toFixed(2)}</Text>
              </View>
              <Badge label={`${item.stock_count} in stock`} icon="cube" variant={item.stock_count <= 2 ? "danger" : "success"} />
            </TouchableOpacity>
          )}
        />
      ) : query.trim() && filtered.length === 0 ? (
        <Text style={s.empty}>No items match "{query}"</Text>
      ) : null}

      <CameraView style={s.camera} facing="back" onBarcodeScanned={handleBarcode} />
      <View style={s.overlay}>
        <Text style={s.hint}>Point camera at barcode</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: spacing.lg },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, margin: spacing.md, marginBottom: 0, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.sm },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 15, color: colors.text },
  resultCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  resultInfo: { flex: 1, marginRight: spacing.sm },
  resultTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  resultPrice: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.lg },
  camera: { flex: 1 },
  overlay: { position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center" },
  hint: { color: colors.white, fontSize: 16, fontWeight: "500" },
  foundTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.sm, textAlign: "center" },
  price: { fontSize: 48, fontWeight: "800", color: colors.text, marginTop: spacing.sm },
});

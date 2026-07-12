import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useStore } from "../../context/StoreContext";
import * as inventoryApi from "../../api/inventory";
import { Badge, Btn, Card, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function PriceCheck() {
  const { activeStore } = useStore();
  const [permission, request] = useCameraPermissions();
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const zoom = useRef(new Animated.Value(0.8)).current;

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
      const items = await inventoryApi.listInventory(activeStore.store_id);
      const match = Array.isArray(items) ? items.find(i => i.barcode_isbn === data) : null;
      if (!match) { Alert.alert("Not Found", `No item with barcode ${data}`); setBusy(false); return; }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setFound(match);
      Animated.spring(zoom, { toValue: 1, useNativeDriver: true }).start();
    } catch (e) { Alert.alert("Error", e.body || e.message); }
    finally { setBusy(false); }
  };

  if (found) {
    return (
      <View style={s.center}>
        <Animated.View style={{ alignItems: "center", transform: [{ scale: zoom }] }}>
          <Card style={{ alignItems: "center", padding: spacing.xl, width: "100%" }}>
            <Ionicons name="pricetag" size={48} color={colors.primaryDark} />
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
  camera: { flex: 1 },
  overlay: { position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center" },
  hint: { color: colors.white, fontSize: 16, fontWeight: "500" },
  price: { fontSize: 48, fontWeight: "800", color: colors.text, marginTop: spacing.sm },
});

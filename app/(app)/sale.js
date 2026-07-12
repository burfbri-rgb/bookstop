import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useStore } from "../../context/StoreContext";
import { useOffline } from "../../context/OfflineContext";
import * as inventoryApi from "../../api/inventory";
import * as transactionsApi from "../../api/transactions";
import { Badge, Btn, Card, Input, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function Sale() {
  const { activeStore } = useStore();
  const { isOnline, queueMutation, getCachedInventory, cacheInventory } = useOffline();
  const [permission, request] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [scannedItem, setScannedItem] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [step, setStep] = useState("scan");
  const [selling, setSelling] = useState(false);
  const [manualId, setManualId] = useState("");

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

  const fetchItems = async () => {
    if (isOnline) {
      const items = await inventoryApi.listInventory(activeStore.store_id);
      cacheInventory(items);
      return items;
    }
    return getCachedInventory(activeStore.store_id);
  };

  const handleBarcode = async ({ data }) => {
    if (scannedItem) return;
    try {
      const items = await fetchItems();
      const found = Array.isArray(items) ? items.find(i => i.barcode_isbn === data) : null;
      if (!found) { Alert.alert("Not Found", `No item with barcode ${data}`); return; }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setScannedItem(found);
    } catch (e) { Alert.alert("Error", e.body || e.message); }
  };

  const takeReceipt = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync();
      setReceipt(pic.uri);
    } catch (e) { Alert.alert("Error", "Failed to capture receipt"); }
  };

  const processSale = async () => {
    setSelling(true);
    try {
      if (isOnline) {
        await transactionsApi.sale(activeStore.store_id, scannedItem.item_id, receipt);
        Alert.alert("Sale Complete", "Transaction recorded successfully.");
      } else {
        await queueMutation("POST", "/api/transactions/sale", { store_id: activeStore.store_id, item_id: scannedItem.item_id });
        const cached = await getCachedInventory(activeStore.store_id);
        const updated = cached.map(i => i.item_id === scannedItem.item_id ? { ...i, stock_count: i.stock_count - 1 } : i);
        await cacheInventory(updated);
        Alert.alert("Sale Queued", "Transaction will sync when back online.");
      }
      setScannedItem(null);
      setReceipt(null);
    } catch (e) { Alert.alert("Sale failed", e.body || e.message); }
    finally { setSelling(false); }
  };

  const reset = () => {
    setScannedItem(null);
    setReceipt(null);
    setStep("scan");
  };

  // AR-like overlay: show item info on top of live camera
  if (scannedItem && !receipt) {
    return (
      <View style={s.flex}>
        <CameraView ref={cameraRef} style={s.camera} facing="back" />
        <View style={s.arOverlay}>
          <View style={s.arCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Ionicons name="checkmark-circle" size={28} color={colors.success} />
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Item Detected</Text>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginVertical: spacing.sm }}>
              <Badge label={`$${parseFloat(scannedItem.price).toFixed(2)}`} icon="pricetag" />
              <Badge label={`Stock: ${scannedItem.stock_count}`} icon="cube" variant={scannedItem.stock_count <= 2 ? "danger" : "success"} />
            </View>
            {scannedItem.barcode_isbn && <Badge label={scannedItem.barcode_isbn} icon="barcode" />}
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Btn title="Capture Receipt" icon="camera" onPress={takeReceipt} style={{ flex: 1 }} />
            <Btn title="Sell Now" icon="cash" onPress={processSale} busy={selling} style={{ flex: 1 }} />
          </View>
          <Btn title="Cancel" variant="ghost" onPress={reset} style={{ marginTop: spacing.xs }} />
        </View>
      </View>
    );
  }

  if (receipt) {
    return (
      <View style={s.center}>
        <Card style={{ alignItems: "center", width: "100%", padding: spacing.lg }}>
          <Ionicons name="receipt" size={64} color={colors.primaryDark} />
          <Text style={s.confirmTitle}>Receipt Captured</Text>
          {receipt && <Image source={{ uri: receipt }} style={s.receiptPreview} />}
        </Card>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, width: "100%" }}>
          <Btn title="Complete Sale" onPress={processSale} busy={selling} style={{ flex: 1 }} />
          <Btn title="Retake" variant="ghost" onPress={() => setReceipt(null)} />
        </View>
      </View>
    );
  }

  if (step === "manual") {
    return (
      <View style={s.center}>
        <Text style={s.confirmTitle}>Enter Item ID</Text>
        <Input placeholder="Paste item UUID" value={manualId} onChangeText={setManualId} style={{ width: "100%", marginBottom: spacing.lg }} />
        <Btn title="Continue" onPress={() => {
          if (!manualId) return;
          setScannedItem({ item_id: manualId });
        }} style={{ width: "100%" }} />
        <Btn title="Back to Scanner" variant="ghost" onPress={() => { setStep("scan"); setManualId(""); }} />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      <CameraView ref={cameraRef} style={s.camera} facing="back" onBarcodeScanned={scannedItem ? undefined : handleBarcode} />
      <View style={s.overlay}>
        <Text style={s.hint}>Point camera at barcode</Text>
        <Btn title="Enter Manually" variant="ghost" onPress={() => setStep("manual")} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flexGrow: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: spacing.lg },
  camera: { flex: 1 },
  overlay: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  hint: { color: colors.white, fontSize: 16, fontWeight: "500", marginBottom: spacing.sm },
  confirmTitle: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  receiptPreview: { width: 200, height: 200, borderRadius: radius.lg, marginTop: spacing.md },
  arOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: spacing.md, paddingBottom: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  arCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    ...shadows.md,
  },
});

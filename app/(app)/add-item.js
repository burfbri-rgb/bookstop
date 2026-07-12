import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../context/StoreContext";
import * as inventoryApi from "../../api/inventory";
import * as visionApi from "../../api/vision";
import { Btn, Input, Card, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function AddItem() {
  const router = useRouter();
  const { activeStore } = useStore();
  const [permission, request] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [step, setStep] = useState("camera");
  const [photo, setPhoto] = useState(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [barcode, setBarcode] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setProcessing(true);
    try {
      const pic = await cameraRef.current.takePictureAsync();
      setPhoto(pic.uri);
      try {
        const result = await visionApi.lookupImage(pic.uri);
        if (result.title) setTitle(result.title);
        if (result.isbn) setBarcode(result.isbn);
        setStep("form");
        return;
      } catch {
        setStep("barcode");
      }
    } catch (e) { Alert.alert("Error", "Failed to capture photo"); }
    finally { setProcessing(false); }
  };

  const handleBarcode = ({ data }) => {
    setBarcode(data);
    setStep("form");
  };

  const save = async () => {
    if (!price || !stock) { Alert.alert("Error", "Price and stock are required"); return; }
    setSaving(true);
    try {
      const img = photo ? await inventoryApi.processImage(photo) : null;
      await inventoryApi.createInventory(activeStore.store_id, price, parseInt(stock), barcode || undefined, img?.clean_image_url);
      router.back();
    } catch (e) { Alert.alert("Error", e.body || e.message); }
    finally { setSaving(false); }
  };

  if (step === "camera") {
    return (
      <View style={s.flex}>
        <Stack.Screen options={{ title: "Take Photo", headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
        ) }} />
        <CameraView ref={cameraRef} style={s.camera} facing="back" />
        <View style={s.cameraOverlay}>
          <TouchableOpacity style={s.captureBtn} onPress={takePhoto} disabled={processing}>
            {processing ? <ActivityIndicator size="large" color={colors.white} /> : <View style={s.captureInner} />}
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <Btn title="Skip Camera" variant="ghost" onPress={() => { setPhoto(null); setStep("barcode"); }} />
          </View>
        </View>
      </View>
    );
  }

  if (step === "barcode") {
    return (
      <View style={s.flex}>
        <Stack.Screen options={{ title: "Scan Barcode", headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
        ) }} />
        <CameraView ref={cameraRef} style={s.camera} facing="back" onBarcodeScanned={handleBarcode} />
        <View style={s.cameraOverlay}>
          <Text style={s.hint}>Point camera at back cover barcode</Text>
          <Btn title="Enter Manually" variant="ghost" onPress={() => setStep("form")} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.formContainer}>
      <Stack.Screen options={{ title: "Item Details", headerLeft: () => (
        <TouchableOpacity onPress={() => Alert.alert("Cancel", "Discard this item?", [
          { text: "Keep Editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => router.back() },
        ])}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
      ) }} />
      {photo && (
        <Card style={{ padding: spacing.xs, marginBottom: spacing.md }}>
          <Image source={{ uri: photo }} style={s.preview} />
        </Card>
      )}
      {title ? <Text style={s.titleText}>{title}</Text> : null}
      <Input placeholder="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ marginBottom: spacing.sm }} />
      <Input placeholder="Stock Count" value={stock} onChangeText={setStock} keyboardType="number-pad" style={{ marginBottom: spacing.sm }} />
      <Input placeholder="Barcode / ISBN" value={barcode} onChangeText={setBarcode} style={{ marginBottom: spacing.md }} />
      <Btn title="Save Item" onPress={save} busy={saving} icon="checkmark" />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: spacing.lg },
  camera: { flex: 1 },
  cameraOverlay: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
  hint: { color: colors.white, fontSize: 16, fontWeight: "500", marginBottom: spacing.sm },
  formContainer: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.md },
  preview: { width: "100%", height: 200, borderRadius: radius.md },
  titleText: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: spacing.sm, textAlign: "center" },
});

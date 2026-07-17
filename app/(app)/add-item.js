import { useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../context/StoreContext";
import * as inventoryApi from "../../api/inventory";
import { Btn, Input, Card, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

const INITIAL = { step: "camera", photo: null, price: "", stock: "1", title: "" };

export default function AddItem() {
  const router = useRouter();
  const { activeStore } = useStore();
  const [permission, request] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [step, setStep] = useState(INITIAL.step);
  const [photo, setPhoto] = useState(INITIAL.photo);
  const [price, setPrice] = useState(INITIAL.price);
  const [stock, setStock] = useState(INITIAL.stock);
  const [title, setTitle] = useState(INITIAL.title);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  useFocusEffect(useCallback(() => {
    setStep(INITIAL.step);
    setPhoto(INITIAL.photo);
    setPrice(INITIAL.price);
    setStock(INITIAL.stock);
    setTitle(INITIAL.title);
  }, []));

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
      setStep("form");
    } catch { Alert.alert("Error", "Failed to capture photo"); }
    finally { setProcessing(false); }
  };

  const save = async () => {
    if (!price || !stock) { Alert.alert("Error", "Price and stock are required"); return; }
    setSaving(true);
    try {
      const img = photo ? await inventoryApi.processImage(photo) : null;
      await inventoryApi.createInventory(activeStore.store_id, price, parseInt(stock), undefined, img?.clean_image_url, title || undefined);
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
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, alignItems: "center" }}>
            <Btn title="Skip Photo" variant="ghost" onPress={() => { setPhoto(null); setStep("form"); }} />
            <Btn title="Cancel" variant="ghost" onPress={() => Alert.alert("Cancel", "Discard this item?", [
              { text: "Keep", style: "cancel" },
              { text: "Discard", style: "destructive", onPress: () => router.back() },
            ])} />
          </View>
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
      <Input placeholder="Title" value={title} onChangeText={setTitle} style={{ marginBottom: spacing.sm }} />
      <Input placeholder="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ marginBottom: spacing.sm }} />
      <Input placeholder="Stock Count" value={stock} onChangeText={setStock} keyboardType="number-pad" style={{ marginBottom: spacing.sm }} />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Btn title="Cancel" variant="ghost" onPress={() => Alert.alert("Cancel", "Discard this item?", [
          { text: "Keep Editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => router.back() },
        ])} style={{ flex: 1 }} />
        <Btn title="Save Item" onPress={save} busy={saving} icon="checkmark" style={{ flex: 2 }} />
      </View>
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
  formContainer: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.md },
  preview: { width: "100%", height: 200, borderRadius: radius.md },
});

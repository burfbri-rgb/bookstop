import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useStore } from "../../../context/StoreContext";
import * as inventoryApi from "../../../api/inventory";
import { Badge, Btn, Card, Input } from "../../../context/UI";
import { colors, spacing, radius, shadows } from "../../../context/Theme";

export default function ItemDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { activeStore } = useStore();
  const [item, setItem] = useState(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryApi.listInventory(activeStore?.store_id);
        const found = Array.isArray(res) ? res.find(i => i.item_id === id) : null;
        if (found) {
          setItem(found);
          setTitle(found.title || "");
          setPrice(found.price?.toString() || "");
          setStock(found.stock_count?.toString() || "");
          setBarcode(found.barcode_isbn || "");
        }
      } catch (e) { Alert.alert("Error", e.message); }
      finally { setLoading(false); }
    })();
  }, [id, activeStore]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primaryDark} /></View>;
  if (!item) return <View style={s.center}><Text style={{ color: colors.textSecondary }}>Item not found</Text></View>;

  const save = async () => {
    setSaving(true);
    try {
      await inventoryApi.updateInventory(id, {
        price: parseFloat(price),
        stock_count: parseInt(stock),
        barcode_isbn: barcode || undefined,
        title: title || undefined,
      });
      router.back();
    } catch (e) { Alert.alert("Error", e.body || e.message); }
    finally { setSaving(false); }
  };

  const remove = () => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await inventoryApi.deleteInventory(id); router.back(); }
        catch (e) { Alert.alert("Error", e.body || e.message); }
      }},
    ]);
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Stack.Screen options={{ title: "Edit Item" }} />
      {item.clean_image_url && (
        <Card style={{ padding: spacing.xs, marginBottom: spacing.md, alignItems: "center" }}>
          <View style={s.imgPlaceholder}>
            <ActivityIndicator size="small" color={colors.textLight} />
          </View>
        </Card>
      )}
      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
        <Badge label={parseFloat(item.price).toFixed(2)} icon="pricetag" />
        <Badge label={`Stock: ${item.stock_count}`} icon="cube" variant={item.stock_count <= 2 ? "danger" : "success"} />
        {item.barcode_isbn && <Badge label={item.barcode_isbn} icon="barcode" />}
      </View>
      <Input placeholder="Title" value={title} onChangeText={setTitle} style={{ marginBottom: spacing.sm }} />
      <Input placeholder="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ marginBottom: spacing.sm }} />
      <Input placeholder="Stock Count" value={stock} onChangeText={setStock} keyboardType="number-pad" style={{ marginBottom: spacing.sm }} />
      <Input placeholder="Barcode / ISBN" value={barcode} onChangeText={setBarcode} style={{ marginBottom: spacing.md }} />
      <Btn title="Save Changes" onPress={save} busy={saving} icon="checkmark" />
      <Btn title="Delete Item" variant="danger" icon="trash" onPress={remove} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  imgPlaceholder: { height: 180, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
});

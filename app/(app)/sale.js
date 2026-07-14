import { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useStore } from "../../context/StoreContext";
import { useOffline } from "../../context/OfflineContext";
import { useRefreshOnFocus } from "../../context/useRefreshOnFocus";
import * as inventoryApi from "../../api/inventory";
import * as transactionsApi from "../../api/transactions";
import { Badge, Btn, Card, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function Sale() {
  const { activeStore } = useStore();
  const { isOnline, queueMutation, getCachedInventory, cacheInventory } = useOffline();
  const [permission, request] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [selling, setSelling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);

  const load = useCallback(async () => {
    if (!activeStore) return;
    try {
      const data = await inventoryApi.listInventory(activeStore.store_id);
      setItems(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); }
  }, [activeStore]);

  useRefreshOnFocus(load);
  useEffect(() => { if (activeStore && loading) load(); }, [activeStore]);

  if (!activeStore) return <EmptyState icon="storefront" title="No Store Selected" subtitle="Select a store first." />;

  const searchTerm = query.trim().toLowerCase();
  const filtered = searchTerm
    ? items.filter(i => i.title && i.title.toLowerCase().includes(searchTerm))
    : items;

  const inCart = (itemId) => cart.find(c => c.item_id === itemId);

  const addToCart = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.item_id);
      if (existing) {
        if (existing.quantity >= item.stock_count) return prev;
        return prev.map(c => c.item_id === item.item_id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item_id: item.item_id, title: item.title, price: item.price, quantity: 1, stock_count: item.stock_count }];
    });
  };

  const changeQty = (itemId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.item_id !== itemId) return c;
      const next = c.quantity + delta;
      if (next <= 0) return null;
      if (next > c.stock_count) return c;
      return { ...c, quantity: next };
    }).filter(Boolean));
  };

  const removeFromCart = (itemId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCart(prev => prev.filter(c => c.item_id !== itemId));
  };

  const total = cart.reduce((sum, c) => sum + parseFloat(c.price) * c.quantity, 0);

  const takeReceipt = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync();
      setReceipt(pic.uri);
      setShowCamera(false);
    } catch { Alert.alert("Error", "Failed to capture receipt"); }
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    setSelling(true);
    try {
      const payload = cart.map(c => ({ item_id: c.item_id, quantity: c.quantity }));
      if (isOnline) {
        await transactionsApi.batchSale(activeStore.store_id, payload, receipt);
        Alert.alert("Sale Complete", `${cart.length} item(s) sold successfully.`);
      } else {
        for (const c of cart) {
          for (let i = 0; i < c.quantity; i++) {
            await queueMutation("POST", "/api/transactions/sale", { store_id: activeStore.store_id, item_id: c.item_id });
          }
        }
        const cached = await getCachedInventory(activeStore.store_id);
        const updated = cached.map(stored => {
          const sold = cart.find(c => c.item_id === stored.item_id);
          return sold ? { ...stored, stock_count: stored.stock_count - sold.quantity } : stored;
        });
        await cacheInventory(updated);
        Alert.alert("Sale Queued", "Will sync when back online.");
      }
      setCart([]);
      setReceipt(null);
    } catch (e) { Alert.alert("Sale Failed", e.body || e.message); }
    finally { setSelling(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" /><Text style={{ marginTop: spacing.sm, color: colors.textSecondary }}>Loading inventory...</Text></View>;

  if (items.length === 0) return <EmptyState icon="cube" title="No Items" subtitle="Add items to inventory first." />;

  if (showCamera) {
    if (!permission?.granted) return (
      <View style={s.center}>
        <Ionicons name="camera" size={64} color={colors.textSecondary} />
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginTop: spacing.md, marginBottom: spacing.md }}>Camera Permission Required</Text>
        <Btn title="Grant Access" onPress={request} />
        <Btn title="Cancel" variant="ghost" onPress={() => setShowCamera(false)} style={{ marginTop: spacing.sm }} />
      </View>
    );
    return (
      <View style={s.flex}>
        <CameraView ref={cameraRef} style={s.camera} facing="back" />
        <View style={s.cameraOverlay}>
          <TouchableOpacity style={s.captureBtn} onPress={takeReceipt}>
            <View style={s.captureInner} />
          </TouchableOpacity>
          <Btn title="Cancel" variant="ghost" onPress={() => setShowCamera(false)} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={s.flex} contentContainerStyle={s.container}>
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

      {filtered.length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{query.trim() ? "Results" : "All Items"}</Text>
          {filtered.map(item => {
            const inC = inCart(item.item_id);
            const outOfStock = item.stock_count <= 0;
            return (
              <TouchableOpacity
                key={item.item_id}
                style={[s.row, outOfStock && s.rowDisabled]}
                onPress={() => !outOfStock && addToCart(item)}
                disabled={outOfStock}
              >
                <View style={s.rowInfo}>
                  <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.rowPrice}>${parseFloat(item.price).toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Badge label={`${item.stock_count}`} icon="cube" variant={item.stock_count <= 2 ? "danger" : "success"} />
                  {inC ? (
                    <Badge label={`${inC.quantity} in cart`} icon="cart" />
                  ) : outOfStock ? null : (
                    <TouchableOpacity style={s.addBtn} onPress={() => addToCart(item)}>
                      <Ionicons name="add" size={20} color={colors.white} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : query.trim() && filtered.length === 0 ? (
        <Text style={s.emptyText}>No items match "{query}"</Text>
      ) : null}

      {!query.trim() && cart.length === 0 && items.length > 0 ? (
        <Text style={s.emptyText}>Tap an item above to add it to the sale.</Text>
      ) : null}

      {cart.length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Cart ({cart.length} item{cart.length > 1 ? "s" : ""})</Text>
          {cart.map(c => {
            const lineTotal = parseFloat(c.price) * c.quantity;
            return (
              <Card key={c.item_id} style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, padding: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cartTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={s.cartPrice}>${lineTotal.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(c.item_id, -1)}>
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={s.qtyText}>{c.quantity}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(c.item_id, 1)}>
                    <Ionicons name="add" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.removeBtn} onPress={() => removeFromCart(c.item_id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
          <Card style={{ padding: spacing.md, marginBottom: spacing.md }}>
            <Text style={s.totalText}>Total: ${total.toFixed(2)}</Text>
          </Card>
        </View>
      ) : (
        <Text style={s.emptyText}>Add items above to start a sale.</Text>
      )}

      <View style={s.actions}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Btn
            title={receipt ? "Receipt ✓" : "Capture Receipt"}
            icon="camera"
            variant={receipt ? "secondary" : "ghost"}
            onPress={async () => {
              if (!permission?.granted) {
                const result = await request();
                if (!result?.granted) return;
              }
              setShowCamera(true);
            }}
            style={{ flex: 1 }}
          />
          <Btn
            title={`Sell All ${cart.length}`}
            icon="cash"
            onPress={completeSale}
            busy={selling}
            disabled={cart.length === 0}
            style={{ flex: 1 }}
          />
        </View>
        {receipt && (
          <Image source={{ uri: receipt }} style={s.receiptThumb} />
        )}
        {!permission?.granted && (
          <Btn title="Grant Camera Access" variant="ghost" onPress={request} style={{ marginTop: spacing.sm }} />
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: spacing.lg },
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  camera: { flex: 1 },
  cameraOverlay: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, ...shadows.sm },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 15, color: colors.text },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm, ...shadows.sm },
  rowDisabled: { opacity: 0.4 },
  rowInfo: { flex: 1, marginRight: spacing.sm },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowPrice: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },
  emptyText: { textAlign: "center", color: colors.textSecondary, paddingVertical: spacing.lg },
  cartTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  cartPrice: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  qtyText: { fontSize: 15, fontWeight: "700", color: colors.text, minWidth: 20, textAlign: "center" },
  removeBtn: { marginLeft: spacing.xs, padding: 4 },
  totalText: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center" },
  actions: { gap: spacing.sm },
  receiptThumb: { width: 80, height: 80, borderRadius: radius.md, alignSelf: "center", marginTop: spacing.sm },
});

import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { useRefreshOnFocus } from "../../context/useRefreshOnFocus";
import * as storesApi from "../../api/stores";
import { Badge, Btn, Card, Input, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function Stores() {
  const router = useRouter();
  const { logout } = useAuth();
  const { activeStore, setActiveStore } = useStore();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [renameId, setRenameId] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const load = useCallback(async () => {
    try { setStores(await storesApi.listStores()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useRefreshOnFocus(load);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const s = await storesApi.createStore(name.trim());
      setStores(prev => [...prev, s]);
      setModal(false);
      setName("");
    } catch (e) { Alert.alert("Error", e.body || e.message); }
    finally { setCreating(false); }
  };

  const doRename = async () => {
    if (!renameName.trim() || !renameId) return;
    setRenaming(true);
    try {
      const updated = await storesApi.renameStore(renameId, renameName.trim());
      setStores(prev => prev.map(s => s.store_id === renameId ? updated : s));
      if (activeStore?.store_id === renameId) setActiveStore(updated);
      setRenameModal(false);
      setRenameId(null);
      setRenameName("");
    } catch (e) { Alert.alert("Error", e.body || e.message); }
    finally { setRenaming(false); }
  };

  return (
    <View style={s.container}>
      {loading ? <ActivityIndicator style={{ marginTop: spacing.xxl }} size="large" color={colors.primaryDark} /> : (
        <FlatList data={stores} keyExtractor={s => s.store_id?.toString() || s.store_name}
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.storeCard, activeStore?.store_id === item.store_id && s.activeCard]}
              onPress={() => setActiveStore(item)}
              onLongPress={() => { setRenameId(item.store_id); setRenameName(item.store_name); setRenameModal(true); }}
              activeOpacity={0.7}>
              <Ionicons name="storefront" size={22} color={activeStore?.store_id === item.store_id ? colors.primaryDark : colors.textSecondary} />
              <Text style={[s.storeName, activeStore?.store_id === item.store_id && s.activeName]}>{item.store_name}</Text>
              {activeStore?.store_id === item.store_id && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={s.empty}>No stores yet. Create one below.</Text>}
        />
      )}

      <Btn title="New Store" icon="add" onPress={() => setModal(true)} style={{ marginTop: spacing.sm }} />
      <Btn title="Export CSV" icon="download" variant="ghost" onPress={() => router.push("/(app)/export")} style={{ marginTop: spacing.xs }} />
      <Btn title="Logout" icon="log-out" variant="danger" onPress={logout} style={{ marginTop: spacing.xs }} />

      <Modal visible={modal} transparent animationType="fade">
        <View style={s.overlay}>
          <Card style={{ padding: spacing.lg, marginHorizontal: spacing.md }}>
            <Text style={s.modalTitle}>New Store</Text>
            <Input placeholder="Store name" value={name} onChangeText={setName} autoFocus style={{ marginBottom: spacing.md }} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Btn title="Cancel" variant="ghost" onPress={() => { setModal(false); setName(""); }} style={{ flex: 1 }} />
              <Btn title="Create" onPress={create} busy={creating} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>

      <Modal visible={renameModal} transparent animationType="fade">
        <View style={s.overlay}>
          <Card style={{ padding: spacing.lg, marginHorizontal: spacing.md }}>
            <Text style={s.modalTitle}>Rename Store</Text>
            <Input placeholder="New name" value={renameName} onChangeText={setRenameName} autoFocus style={{ marginBottom: spacing.md }} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Btn title="Cancel" variant="ghost" onPress={() => { setRenameModal(false); setRenameId(null); }} style={{ flex: 1 }} />
              <Btn title="Save" onPress={doRename} busy={renaming} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  storeCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgSecondary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  activeCard: { borderWidth: 2, borderColor: colors.primaryDark, ...shadows.sm },
  storeName: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.text, marginLeft: spacing.sm },
  activeName: { fontWeight: "700", color: colors.text },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: spacing.xxl },
  overlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: spacing.md },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
});

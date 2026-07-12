import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useStore } from "../../context/StoreContext";
import * as transactionsApi from "../../api/transactions";
import { Btn, Card, EmptyState } from "../../context/UI";
import { colors, spacing, radius, shadows } from "../../context/Theme";

export default function Export() {
  const { activeStore } = useStore();
  const [busy, setBusy] = useState(false);

  if (!activeStore) return <EmptyState icon="storefront" title="No Store Selected" subtitle="Select a store first." />;

  const download = async () => {
    setBusy(true);
    try {
      const csv = await transactionsApi.exportCsv(activeStore.store_id);
      const path = `${FileSystem.cacheDirectory}bookstop_export_${activeStore.store_id}.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      await Sharing.shareAsync(path, { mimeType: "text/csv" });
    } catch (e) { Alert.alert("Export failed", e.body || e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={s.container}>
      <Card style={{ alignItems: "center", padding: spacing.xl }}>
        <View style={s.iconWrap}>
          <Text style={s.iconText}>CSV</Text>
        </View>
        <Text style={s.title}>Export Transactions</Text>
        <Text style={s.subtitle}>{activeStore.store_name}</Text>
        <Text style={s.desc}>Download all transactions as a CSV file for accounting purposes.</Text>
        <Btn title={busy ? "Exporting..." : "Download CSV"} icon="download" onPress={download} busy={busy} style={{ marginTop: spacing.lg, width: "100%" }} />
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.lg },
  iconWrap: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.primaryLight, justifyContent: "center", alignItems: "center" },
  iconText: { fontSize: 18, fontWeight: "800", color: colors.primaryDark },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  desc: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: spacing.md, lineHeight: 20 },
});

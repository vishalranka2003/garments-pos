import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as pos from "../api/pos";
import type { InventoryItemOut } from "../api/types";
import { colors } from "../theme/colors";

export function InventoryScreen({
  storeId,
  onAdd,
  onShowBarcodes,
}: {
  storeId: string;
  onAdd: () => void;
  onShowBarcodes: (productId: string) => void;
}) {
  const [items, setItems] = useState<InventoryItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await pos.listInventory(storeId);
      setItems(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
      }
    >
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.subtitle}>Live stock view</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {loading && items.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      ) : null}
      <View style={styles.card}>
        {items.length === 0 && !loading ? (
          <Text style={styles.line}>No variants yet. Add a product.</Text>
        ) : (
          items.map((row) => (
            <View key={row.variant_id} style={styles.inventoryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineBold}>{row.product_name}</Text>
                <Text style={styles.lineSmall}>
                  {row.color} · {row.size} · SKU {row.sku}
                </Text>
                <Text style={styles.lineSmall}>
                  Stock {row.stock_quantity} · ₹{row.price.toFixed(2)}
                </Text>
              </View>
              <Pressable
                onPress={() => onShowBarcodes(row.product_id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="View barcodes"
                style={styles.barcodeBtn}
              >
                <MaterialIcons name="qr-code" size={22} color={colors.primary} />
              </Pressable>
            </View>
          ))
        )}
      </View>
      <Pressable style={styles.primaryButton} onPress={onAdd}>
        <MaterialIcons name="add" size={20} color="#fff" />
        <Text style={styles.primaryButtonText}>Add Product</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingBottom: 24 },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 8 },
  err: { color: colors.error },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  inventoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  barcodeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(33, 150, 243, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(33, 150, 243, 0.22)",
  },
  line: { fontSize: 15, color: colors.text },
  lineBold: { fontSize: 15, fontWeight: "800", color: colors.text },
  lineSmall: { fontSize: 12, color: colors.muted },
  primaryButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

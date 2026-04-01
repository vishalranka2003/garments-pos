import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as pos from "../api/pos";
import type { DashboardSummaryOut } from "../api/types";
import { colors } from "../theme/colors";

export function DashboardScreen({ storeId }: { storeId: string }) {
  const [data, setData] = useState<DashboardSummaryOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const summary = await pos.getDashboardSummary(storeId);
      setData(summary);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Today at a glance</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today Sales</Text>
        <Text style={styles.cardValue}>
          {data != null ? `₹ ${data.today_sales.toFixed(2)}` : "—"}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.card, styles.half]}>
          <Text style={styles.cardLabel}>Orders</Text>
          <Text style={styles.cardValue}>{data?.total_orders_today ?? "—"}</Text>
        </View>
        <View style={[styles.card, styles.half]}>
          <Text style={styles.cardLabel}>Top sellers</Text>
          <Text style={styles.smallMuted}>
            {data?.top_selling_products?.length
              ? data.top_selling_products
                  .slice(0, 3)
                  .map((p) => `${p.product_name} (${p.total_quantity_sold})`)
                  .join("\n")
              : "No sales yet"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingBottom: 24 },
  center: { padding: 40, alignItems: "center" },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 8 },
  err: { color: colors.error, marginBottom: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardLabel: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  cardValue: { fontSize: 26, color: colors.text, fontWeight: "800" },
  smallMuted: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
});

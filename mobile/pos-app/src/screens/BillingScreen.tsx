import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as pos from "../api/pos";
import type { InventoryItemOut, OrderOut, PaymentMethod } from "../api/types";
import { colors } from "../theme/colors";
import { ScanOverlayScreen } from "./ScanOverlayScreen";

type CartLine = { item: InventoryItemOut; qty: number };

export function BillingScreen({
  storeId,
  onSuccess,
}: {
  storeId: string;
  onSuccess: (order: OrderOut) => void;
}) {
  const [inventory, setInventory] = useState<InventoryItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [discount, setDiscount] = useState("0");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await pos.listInventory(storeId);
      setInventory(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const addToCart = (item: InventoryItemOut) => {
    if (item.stock_quantity < 1) return;
    setCart((prev) => {
      const cur = prev[item.variant_id];
      const nextQty = (cur?.qty ?? 0) + 1;
      if (nextQty > item.stock_quantity) return prev;
      return {
        ...prev,
        [item.variant_id]: { item, qty: nextQty },
      };
    });
  };

  const addToCartBySkuOrBarcode = async (value: string): Promise<boolean> => {
    // Fast path: match already-loaded inventory by SKU.
    const local = inventory.find((x) => x.sku === value);
    if (local) {
      addToCart(local);
      return true;
    }
    try {
      const item = await pos.getVariantBySku(storeId, value);
      addToCart(item);
      return true;
    } catch {
      return false;
    }
  };

  const decFromCart = (variantId: string) => {
    setCart((prev) => {
      const cur = prev[variantId];
      if (!cur || cur.qty <= 1) {
        const { [variantId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [variantId]: { ...cur, qty: cur.qty - 1 } };
    });
  };

  const subtotal = useMemo(() => {
    return Object.values(cart).reduce((sum, line) => sum + line.item.price * line.qty, 0);
  }, [cart]);

  const discountNum = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - discountNum);

  const placeOrder = async () => {
    const lines = Object.values(cart);
    if (lines.length === 0) {
      setError("Add at least one item to cart");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await pos.createOrder({
        store_id: storeId,
        items: lines.map((l) => ({
          product_variant_id: l.item.variant_id,
          quantity: l.qty,
        })),
        discount: discountNum.toFixed(2),
        payment_method: payment,
      });
      setCart({});
      setDiscount("0");
      await load();
      onSuccess(order);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Billing</Text>
      <Text style={styles.subtitle}>Scan barcodes or tap items to add to cart</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Pressable style={styles.scanButton} onPress={() => setShowScanner(true)}>
        <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
        <Text style={styles.scanButtonText}>Scan</Text>
      </Pressable>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : null}

      <Text style={styles.section}>Catalog</Text>
      <View style={styles.card}>
        {inventory.length === 0 && !loading ? (
          <Text style={styles.line}>No inventory. Add products first.</Text>
        ) : (
          inventory.map((row) => (
            <Pressable
              key={row.variant_id}
              style={styles.catalogRow}
              onPress={() => addToCart(row)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.lineBold}>{row.product_name}</Text>
                <Text style={styles.lineSmall}>
                  {row.size} · {row.color} · {row.sku} · stock {row.stock_quantity}
                </Text>
              </View>
              <Text style={styles.price}>₹{row.price.toFixed(2)}</Text>
              <MaterialIcons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          ))
        )}
      </View>

      <Text style={styles.section}>Cart</Text>
      <View style={styles.card}>
        {Object.keys(cart).length === 0 ? (
          <Text style={styles.line}>Cart is empty</Text>
        ) : (
          Object.values(cart).map((line) => (
            <View key={line.item.variant_id} style={styles.cartRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineBold}>{line.item.product_name}</Text>
                <Text style={styles.lineSmall}>
                  {line.item.size} / {line.item.color} × {line.qty}
                </Text>
              </View>
              <Text style={styles.price}>₹{(line.item.price * line.qty).toFixed(2)}</Text>
              <Pressable onPress={() => decFromCart(line.item.variant_id)} hitSlop={8}>
                <MaterialIcons name="remove-circle-outline" size={26} color={colors.muted} />
              </Pressable>
            </View>
          ))
        )}
        <Text style={styles.totalLine}>Subtotal: ₹{subtotal.toFixed(2)}</Text>
        <View style={styles.discountRow}>
          <Text style={styles.inputLabel}>Discount</Text>
          <TextInput
            style={styles.discountInput}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
        <Text style={styles.total}>Total: ₹{total.toFixed(2)}</Text>

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payment</Text>
        <View style={styles.payRow}>
          {(["cash", "upi", "card"] as PaymentMethod[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.payChip, payment === p && styles.payChipActive]}
              onPress={() => setPayment(p)}
            >
              <Text style={[styles.payChipText, payment === p && styles.payChipTextActive]}>
                {p.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
        onPress={placeOrder}
        disabled={submitting}
      >
        <MaterialIcons name="receipt-long" size={20} color="#fff" />
        <Text style={styles.primaryButtonText}>
          {submitting ? "Placing…" : "Place Order"}
        </Text>
      </Pressable>

      {showScanner ? (
        <View style={styles.scannerOverlay}>
          <ScanOverlayScreen
            onClose={() => setShowScanner(false)}
            onScanned={async (value) => {
              const ok = await addToCartBySkuOrBarcode(value);
              if (ok) {
                // Keep scanning continuously; user can close when done.
              }
              return ok;
            }}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 24 },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: colors.muted },
  err: { color: colors.error },
  scanButton: {
    marginTop: 6,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  scanButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  section: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  catalogRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  line: { fontSize: 15, color: colors.text },
  lineBold: { fontSize: 15, fontWeight: "700", color: colors.text },
  lineSmall: { fontSize: 12, color: colors.muted },
  price: { fontSize: 15, fontWeight: "700", color: colors.primaryDark },
  totalLine: { marginTop: 8, fontSize: 14, color: colors.muted },
  total: { fontSize: 18, fontWeight: "700", color: colors.primaryDark },
  inputLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    color: colors.muted,
  },
  discountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 16,
  },
  payRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  payChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  payChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payChipText: { fontWeight: "700", fontSize: 12, color: colors.muted },
  payChipTextActive: { color: "#fff" },
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
  scannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

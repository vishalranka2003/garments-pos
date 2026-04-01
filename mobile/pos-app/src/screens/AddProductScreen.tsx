import { useMemo, useState } from "react";
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
import { colors } from "../theme/colors";

function generateSku12(): string {
  // 12-digit numeric base for EAN-13. Barcode check digit is computed server-side.
  const now = Date.now().toString();
  const rnd = Math.floor(Math.random() * 1e6)
    .toString()
    .padStart(6, "0");
  const raw = `${now}${rnd}`;
  return raw.slice(-12);
}

export function AddProductScreen({
  storeId,
  onSaved,
}: {
  storeId: string;
  onSaved: (createdProductId?: string) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState("Black");
  const [stock, setStock] = useState("10");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M", "L"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizes = useMemo(() => ["S", "M", "L", "XL"], []);
  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const save = async () => {
    setError(null);
    if (!name.trim() || !category.trim()) {
      setError("Name and category are required");
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Valid price required");
      return;
    }
    const stockNum = Math.max(0, Math.floor(Number(stock) || 0));
    if (selectedSizes.length === 0) {
      setError("Select at least one size");
      return;
    }
    const baseSku = generateSku12();
    setSaving(true);
    try {
      const created = await pos.createProduct({
        store_id: storeId,
        name: name.trim(),
        category: category.trim(),
        variants: selectedSizes.map((size, idx) => ({
          size,
          color: color.trim() || "Default",
          sku: (Number(baseSku) + idx).toString().padStart(12, "0"),
          price: priceNum.toFixed(2),
          stock_quantity: stockNum,
        })),
      });
      onSaved(created.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>New Product</Text>
      <Text style={styles.subtitle}>Synced to your backend</Text>
      <Text style={styles.hint}>
        SKU is auto-generated as a 12-digit number (EAN-13 barcode check digit is generated automatically).
      </Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Text style={styles.inputLabel}>Product Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Summer Cotton Dress"
        value={name}
        onChangeText={setName}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.inputLabel}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="Dresses"
            value={category}
            onChangeText={setCategory}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.inputLabel}>Price (all sizes)</Text>
          <TextInput
            style={styles.input}
            placeholder="499"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Text style={styles.inputLabel}>Color (all selected sizes)</Text>
      <TextInput style={styles.input} value={color} onChangeText={setColor} />

      <Text style={styles.inputLabel}>Stock per variant</Text>
      <TextInput
        style={styles.input}
        value={stock}
        onChangeText={setStock}
        keyboardType="number-pad"
      />

      <View style={styles.variantCard}>
        <Text style={styles.sectionTitle}>Sizes</Text>
        <View style={styles.sizeRow}>
          {sizes.map((size) => {
            const selected = selectedSizes.includes(size);
            return (
              <Pressable
                key={size}
                onPress={() => toggleSize(size)}
                style={[styles.sizeChip, selected && styles.sizeChipActive]}
              >
                <Text style={[styles.sizeChipText, selected && styles.sizeChipTextActive]}>
                  {size}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={[styles.primaryButton, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons name="save" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Save Product</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingBottom: 24 },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  err: { color: colors.error },
  inputLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 15,
    color: colors.text,
  },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  variantCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  sizeRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  sizeChip: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sizeChipText: { fontSize: 16, fontWeight: "700", color: colors.text },
  sizeChipTextActive: { color: "#fff" },
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

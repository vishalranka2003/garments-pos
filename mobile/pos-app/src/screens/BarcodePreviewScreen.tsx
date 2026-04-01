import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Barcode from "react-native-barcode-svg";
import * as pos from "../api/pos";
import type { ProductOut } from "../api/types";
import { colors } from "../theme/colors";

function Ean13Svg({ value }: { value: string }) {
  return (
    <View style={styles.barcodeCard}>
      <Barcode
        value={value}
        format="EAN13"
        singleBarWidth={2}
        maxWidth={260}
        height={72}
        lineColor="#000000"
        backgroundColor="#FFFFFF"
      />
      <Text style={styles.barcodeDigits}>{value}</Text>
    </View>
  );
}

export function BarcodePreviewScreen({
  storeId,
  productId,
  onBack,
}: {
  storeId: string;
  productId: string;
  onBack: () => void;
}) {
  const [product, setProduct] = useState<ProductOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      try {
        const list = await pos.listProducts(storeId);
        const found = list.find((p) => p.id === productId) ?? null;
        if (mounted) {
          setProduct(found);
          if (!found) setError("Product not found. Try refreshing inventory.");
        }
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storeId, productId]);

  const variants = useMemo(() => product?.variants ?? [], [product?.variants]);

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Barcodes</Text>
        <Pressable
          onPress={() => {
            const msg =
              product && variants.length
                ? `${product.name}\n\n${variants
                    .map((v) => `${v.size}/${v.color}: ${v.barcode_value}`)
                    .join("\n")}`
                : "No barcodes";
            void Share.share({ message: msg });
          }}
          hitSlop={10}
        >
          <MaterialIcons name="share" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}
      {product ? (
        <>
          <Text style={styles.subtitle}>{product.name}</Text>
          {variants.map((v) => (
            <View key={v.id} style={styles.variantBlock}>
              <Text style={styles.variantTitle}>
                {v.size} · {v.color}
              </Text>
              <Ean13Svg value={v.barcode_value} />
              <Text style={styles.meta}>SKU(base): {v.sku}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 22, fontWeight: "900", color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted },
  err: { color: colors.error },
  variantBlock: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  variantTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  barcodeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  barcodeDigits: { fontSize: 14, fontWeight: "800", color: "#111", letterSpacing: 1 },
  barcodeHint: { fontSize: 11, color: "#444", textAlign: "center", lineHeight: 16 },
});


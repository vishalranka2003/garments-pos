import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { OrderOut } from "../api/types";
import { colors } from "../theme/colors";

export function OrderSuccessScreen({
  order,
  onBack,
}: {
  order: OrderOut | null;
  onBack: () => void;
}) {
  return (
    <View style={[styles.wrap, styles.centerContent]}>
      <View style={styles.successIcon}>
        <MaterialIcons name="check" size={34} color="#fff" />
      </View>
      <Text style={styles.title}>Order Successful</Text>
      <Text style={styles.subtitle}>Inventory updated</Text>
      {order ? (
        <View style={styles.card}>
          <Text style={styles.line}>Total: ₹{Number(order.final_amount).toFixed(2)}</Text>
          <Text style={styles.small}>
            {order.items.length} line(s) · {order.payment_method}
          </Text>
        </View>
      ) : null}
      <Pressable style={styles.primaryButton} onPress={onBack}>
        <MaterialIcons name="arrow-back" size={20} color="#fff" />
        <Text style={styles.primaryButtonText}>Back to Billing</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  centerContent: { flex: 1, justifyContent: "center", minHeight: 400 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    alignSelf: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "stretch",
  },
  line: { fontSize: 20, fontWeight: "800", color: colors.primaryDark },
  small: { marginTop: 6, fontSize: 13, color: colors.muted },
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

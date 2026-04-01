import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_BASE_URL } from "./config";
import type { OrderOut } from "./api/types";
import { useStore } from "./context/StoreContext";
import { AddProductScreen } from "./screens/AddProductScreen";
import { BarcodePreviewScreen } from "./screens/BarcodePreviewScreen";
import { BillingScreen } from "./screens/BillingScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { OrderSuccessScreen } from "./screens/OrderSuccessScreen";
import { colors } from "./theme/colors";

type TabKey = "billing" | "inventory" | "dashboard";

function TopBar({
  subtitle,
  onSignOut,
}: {
  subtitle?: string | null;
  onSignOut?: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <MaterialIcons name="menu" size={22} color={colors.primary} />
        <View>
          <Text style={styles.brand}>The Curator POS</Text>
          {subtitle ? <Text style={styles.storeSub}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.topBarRight}>
        {onSignOut ? (
          <Pressable onPress={onSignOut} hitSlop={12} accessibilityRole="button" accessibilityLabel="Sign out">
            <MaterialIcons name="logout" size={22} color={colors.muted} />
          </Pressable>
        ) : null}
        <MaterialIcons name="qr-code-scanner" size={22} color={colors.muted} />
      </View>
    </View>
  );
}

/** Main POS UI. When using Clerk, pass `onSignOut` from `useClerk().signOut`. */
export function AppShell({ onSignOut }: { onSignOut?: () => void }) {
  const { storeId, storeName, loading, error, refresh } = useStore();
  const [tab, setTab] = useState<TabKey>("billing");
  const [screen, setScreen] = useState<
    "main" | "add-product" | "barcode-preview" | "order-success"
  >("main");
  const [lastOrder, setLastOrder] = useState<OrderOut | null>(null);
  const [barcodeProductId, setBarcodeProductId] = useState<string | null>(null);

  let content: ReactNode = null;

  if (loading) {
    content = (
      <View style={styles.bootstrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.bootstrapText}>Connecting to API…</Text>
        <Text style={styles.bootstrapHint}>{API_BASE_URL}</Text>
      </View>
    );
  } else if (error && !storeId) {
    content = (
      <View style={styles.bootstrap}>
        <Text style={styles.errTitle}>Could not load store</Text>
        <Text style={styles.errBody}>{error}</Text>
        <Text style={styles.bootstrapHint}>Check EXPO_PUBLIC_API_URL and backend.</Text>
        <Pressable style={styles.retryBtn} onPress={() => refresh()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (storeId) {
    if (screen === "add-product") {
      content = (
        <AddProductScreen
          storeId={storeId}
          onSaved={(createdProductId) => {
            if (createdProductId) {
              setBarcodeProductId(createdProductId);
              setScreen("barcode-preview");
              return;
            }
            setScreen("main");
          }}
        />
      );
    } else if (screen === "barcode-preview") {
      content =
        barcodeProductId != null ? (
          <BarcodePreviewScreen
            storeId={storeId}
            productId={barcodeProductId}
            onBack={() => {
              setBarcodeProductId(null);
              setScreen("main");
            }}
          />
        ) : (
          <Text style={styles.bootstrapText}>No product selected.</Text>
        );
    } else if (screen === "order-success") {
      content = (
        <OrderSuccessScreen order={lastOrder} onBack={() => setScreen("main")} />
      );
    } else if (tab === "billing") {
      content = (
        <BillingScreen
          storeId={storeId}
          onSuccess={(order) => {
            setLastOrder(order);
            setScreen("order-success");
          }}
        />
      );
    } else if (tab === "inventory") {
      content = (
        <InventoryScreen
          storeId={storeId}
          onAdd={() => setScreen("add-product")}
          onShowBarcodes={(productId) => {
            setBarcodeProductId(productId);
            setScreen("barcode-preview");
          }}
        />
      );
    } else {
      content = <DashboardScreen storeId={storeId} />;
    }
  }

  const showNav = screen === "main" && storeId && !loading;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <TopBar subtitle={storeName ? storeName : null} onSignOut={onSignOut} />
      {error && storeId ? (
        <Pressable onPress={() => refresh()} style={styles.warnBanner}>
          <Text style={styles.warnText} numberOfLines={2}>
            API note: {error} (tap to retry)
          </Text>
        </Pressable>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
      {showNav && (
        <View style={styles.bottomNav}>
          <NavItem
            label="Billing"
            icon="receipt-long"
            active={tab === "billing"}
            onPress={() => setTab("billing")}
          />
          <NavItem
            label="Inventory"
            icon="inventory-2"
            active={tab === "inventory"}
            onPress={() => setTab("inventory")}
          />
          <NavItem
            label="Dashboard"
            icon="analytics"
            active={tab === "dashboard"}
            onPress={() => setTab("dashboard")}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.navItem, active && styles.navItemActive]}>
      <MaterialIcons name={icon} size={22} color={active ? "#fff" : colors.muted} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  brand: { fontSize: 22, fontWeight: "800", color: colors.primary, letterSpacing: -0.4 },
  storeSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  content: { padding: 20, paddingBottom: 120 },
  bootstrap: { paddingVertical: 48, alignItems: "center", gap: 12 },
  bootstrapText: { fontSize: 16, color: colors.text, fontWeight: "600" },
  bootstrapHint: { fontSize: 12, color: colors.muted, textAlign: "center" },
  errTitle: { fontSize: 18, fontWeight: "800", color: colors.error },
  errBody: { fontSize: 14, color: colors.text, textAlign: "center", paddingHorizontal: 16 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  warnBanner: {
    backgroundColor: "rgba(186, 26, 26, 0.12)",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  warnText: { fontSize: 12, color: colors.error },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 16,
  },
  navItemActive: { backgroundColor: colors.primary },
  navText: { marginTop: 4, fontSize: 11, fontWeight: "700", color: colors.muted },
  navTextActive: { color: "#fff" },
});

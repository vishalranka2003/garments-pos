import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export function ScanOverlayScreen({
  onClose,
  onScanned,
}: {
  onClose: () => void;
  onScanned: (value: string) => Promise<boolean> | boolean;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const lastValueRef = useRef<string | null>(null);
  const lastAtRef = useRef<number>(0);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const canScan = useMemo(() => {
    return Boolean(permission?.granted) && !busy;
  }, [permission?.granted, busy]);

  const tryHandle = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;

    const now = Date.now();
    if (lastValueRef.current === value && now - lastAtRef.current < 1500) {
      return;
    }
    lastValueRef.current = value;
    lastAtRef.current = now;

    setBusy(true);
    setMessage(null);
    try {
      const ok = await onScanned(value);
      if (!ok) {
        setMessage("No matching item found for this barcode/SKU.");
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Scan</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.sub}>Loading camera permissions…</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Scan</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <MaterialIcons name="camera-alt" size={40} color={colors.muted} />
          <Text style={styles.sub}>Camera permission is required to scan barcodes.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
            <Text style={styles.primaryBtnText}>Allow Camera</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={(evt) => {
          if (!canScan) return;
          void tryHandle(evt.data);
        }}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "code128", "qr", "ean8", "upc_a", "upc_e"],
        }}
      />
      <View style={styles.scrim} />

      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10}>
          <MaterialIcons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={[styles.title, { color: "#fff" }]}>Scan</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>
          Point the camera at the barcode. Continuous scanning is on.
        </Text>
        {message ? <Text style={styles.err}>{message}</Text> : null}

        <View style={styles.manualRow}>
          <TextInput
            value={manual}
            onChangeText={setManual}
            placeholder="Enter SKU / barcode"
            placeholderTextColor="rgba(255,255,255,0.7)"
            style={styles.manualInput}
            editable={!busy}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.manualBtn, busy && { opacity: 0.6 }]}
            onPress={() => void tryHandle(manual)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialIcons name="search" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#000" },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
  primaryBtn: { marginTop: 6, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, gap: 10 },
  hint: { color: "#fff", fontSize: 13, fontWeight: "600" },
  err: { color: "#ffd6d6", fontSize: 13 },
  manualRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  manualInput: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    color: "#fff",
    fontSize: 16,
  },
  manualBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});


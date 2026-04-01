import { ClerkProvider, useAuth, useClerk } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppShell } from "../AppShell";
import { CLERK_PUBLISHABLE_KEY } from "../config";
import { StoreProvider } from "../context/StoreContext";
import { SignInScreen } from "../screens/SignInScreen";
import { colors } from "../theme/colors";
import { ClerkTokenBridge } from "./ClerkTokenBridge";

function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    if (__DEV__) {
      console.warn("[clerk] Waiting for Clerk (isLoaded=false) — check network and EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
    }
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingHint}>Starting Clerk…</Text>
        <Text style={styles.loadingSub}>If this never finishes, check the publishable key and device network.</Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  return <SignedInApp />;
}

function SignedInApp() {
  const { signOut } = useClerk();
  return (
    <>
      <ClerkTokenBridge />
      <StoreProvider>
        <AppShell onSignOut={() => void signOut()} />
      </StoreProvider>
    </>
  );
}

/** App root: Clerk when publishable key is set; otherwise API-only (e.g. backend AUTH_BYPASS). */
export function ClerkApp() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    );
  }

  const cache = tokenCache ?? undefined;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      {...(cache ? { tokenCache: cache } : {})}
    >
      <AuthGate />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  loadingHint: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  loadingSub: {
    marginTop: 8,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
});

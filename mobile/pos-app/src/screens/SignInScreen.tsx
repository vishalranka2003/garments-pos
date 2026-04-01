import { isClerkAPIResponseError, useSignIn, useSignUp, useSSO } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../theme/colors";

/** Email-code sign-up only (no SMS — avoids Clerk phone/SMS charges). */
type SignUpStep = "form" | "email_code";

function readSignUpMeta(signUp: object): {
  missingFields?: string[];
  unverifiedFields?: string[];
} {
  const o = signUp as { missingFields?: string[]; unverifiedFields?: string[] };
  return { missingFields: o.missingFields, unverifiedFields: o.unverifiedFields };
}

/**
 * Sign-in: OAuth + email/password. Sign-up: email verification only (no phone — disable phone in Clerk).
 */
export function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [signUpStep, setSignUpStep] = useState<SignUpStep>("form");
  const [code, setCode] = useState("");

  const redirectUrl = Linking.createURL("/");

  const resetSignUpFlow = () => {
    setSignUpStep("form");
    setCode("");
  };

  const runSso = async (strategy: "oauth_google" | "oauth_apple") => {
    setBusy(true);
    setMessage(null);
    try {
      const { createdSessionId, setActive, signIn: si, signUp: su } = await startSSOFlow({
        strategy,
        redirectUrl,
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        return;
      }
      if (si?.status === "complete" && setActive && si.createdSessionId) {
        await setActive({ session: si.createdSessionId });
        return;
      }
      if (su?.status === "complete" && setActive && su.createdSessionId) {
        await setActive({ session: su.createdSessionId });
        return;
      }
      setMessage("Sign-in did not complete. Check Clerk OAuth settings and redirect URLs.");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const formatClerkError = (e: unknown): string => {
    if (isClerkAPIResponseError(e)) {
      return e.errors.map((x) => x.longMessage || x.message).join("\n") || e.message;
    }
    return e instanceof Error ? e.message : String(e);
  };

  const onEmailSignIn = async () => {
    if (!signInLoaded || !signIn || !setActiveSignIn) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (res.status === "complete" && res.createdSessionId) {
        await setActiveSignIn({ session: res.createdSessionId });
        return;
      }
      setMessage(`Could not finish sign-in (status: ${res.status}).`);
    } catch (e: unknown) {
      setMessage(formatClerkError(e));
    } finally {
      setBusy(false);
    }
  };

  const startSignUp = async () => {
    if (!signUpLoaded || !signUp) return;
    setBusy(true);
    setMessage(null);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setSignUpStep("email_code");
      setCode("");
      setMessage("Enter the verification code sent to your email.");
    } catch (err: unknown) {
      setMessage(formatClerkError(err));
    } finally {
      setBusy(false);
    }
  };

  const tryCompleteMissingRequirements = async (): Promise<boolean> => {
    if (!signUp) return false;
    const { missingFields, unverifiedFields } = readSignUpMeta(signUp);

    if (
      unverifiedFields?.includes("phone_number") ||
      missingFields?.includes("phone_number")
    ) {
      setMessage(
        "Clerk still expects a phone number / SMS. In Dashboard → User & authentication, turn off phone as a sign-up identifier (SMS costs money). Then try again."
      );
      return true;
    }

    if (missingFields?.includes("legal_accepted")) {
      try {
        await signUp.update({ legalAccepted: true });
      } catch {
        /* fall through */
      }
    }

    if (missingFields?.length) {
      setMessage(
        `Clerk still needs: ${missingFields.join(", ")}. Simplify requirements in Dashboard → User & authentication, or we can add more fields to this screen.`
      );
      return true;
    }

    return false;
  };

  const onSignUpContinue = async () => {
    if (!signUpLoaded || !signUp || !setActiveSignUp) return;

    if (signUpStep === "form") {
      await startSignUp();
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      if (signUpStep === "email_code") {
        const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
        if (res.status === "complete" && res.createdSessionId) {
          await setActiveSignUp({ session: res.createdSessionId });
          return;
        }
        if (res.status === "missing_requirements") {
          const handled = await tryCompleteMissingRequirements();
          if (handled) return;
        }
        const { missingFields } = readSignUpMeta(res);
        setMessage(
          missingFields?.length
            ? `Sign-up needs: ${missingFields.join(", ")}`
            : `Sign-up status: ${res.status}`
        );
        return;
      }
    } catch (e: unknown) {
      setMessage(formatClerkError(e));
    } finally {
      setBusy(false);
    }
  };

  const emailAuthReady = signInLoaded && signUpLoaded;
  const onFormOnly = authMode === "sign-up" && signUpStep === "form";
  const onEmailCode = authMode === "sign-up" && signUpStep === "email_code";

  const primaryLabel =
    authMode === "sign-in"
      ? "Sign in with email"
      : signUpStep === "form"
        ? "Continue"
        : "Verify email & create account";

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>
        Use email + password only in Clerk (no phone) to avoid SMS charges.
      </Text>
      {message ? <Text style={styles.err}>{message}</Text> : null}

      <Text style={styles.sectionLabel}>Email &amp; password</Text>
      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentBtn, authMode === "sign-in" && styles.segmentBtnOn]}
          onPress={() => {
            setAuthMode("sign-in");
            resetSignUpFlow();
            setMessage(null);
          }}
        >
          <Text style={[styles.segmentText, authMode === "sign-in" && styles.segmentTextOn]}>
            Sign in
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, authMode === "sign-up" && styles.segmentBtnOn]}
          onPress={() => {
            setAuthMode("sign-up");
            resetSignUpFlow();
            setMessage(null);
          }}
        >
          <Text style={[styles.segmentText, authMode === "sign-up" && styles.segmentTextOn]}>
            Sign up
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!busy && onFormOnly}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!busy && onFormOnly}
      />

      {authMode === "sign-up" && onFormOnly ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="First name (optional)"
            placeholderTextColor={colors.muted}
            value={firstName}
            onChangeText={setFirstName}
            editable={!busy}
          />
          <TextInput
            style={styles.input}
            placeholder="Last name (optional)"
            placeholderTextColor={colors.muted}
            value={lastName}
            onChangeText={setLastName}
            editable={!busy}
          />
        </>
      ) : null}

      {authMode === "sign-up" && onEmailCode ? (
        <TextInput
          style={styles.input}
          placeholder="Email verification code"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          editable={!busy}
        />
      ) : null}

      <Pressable
        style={[styles.btnSecondary, busy && styles.btnDisabled]}
        onPress={() => (authMode === "sign-in" ? onEmailSignIn() : onSignUpContinue())}
        disabled={busy || !emailAuthReady}
      >
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.btnSecondaryText}>{primaryLabel}</Text>
        )}
      </Pressable>

      <Text style={styles.divider}>or</Text>

      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        onPress={() => runSso("oauth_google")}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Continue with Google</Text>
        )}
      </Pressable>

      {Platform.OS === "ios" ? (
        <Pressable
          style={[styles.btnApple, busy && styles.btnDisabled]}
          onPress={() => runSso("oauth_apple")}
          disabled={busy}
        >
          <Text style={styles.btnAppleText}>Continue with Apple</Text>
        </Pressable>
      ) : null}

      <Text style={styles.hint}>
        OAuth: add this URL to Clerk mobile SSO allowlist (exact match):{"\n"}
        {redirectUrl}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 48, gap: 12, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 8 },
  err: { color: colors.error, fontSize: 14 },
  segment: { flexDirection: "row", gap: 8, marginTop: 4 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  segmentBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontWeight: "700", color: colors.text },
  segmentTextOn: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "#fff",
  },
  btn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnSecondary: {
    borderWidth: 2,
    borderColor: colors.primary,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  btnApple: {
    backgroundColor: colors.text,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnAppleText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  divider: {
    textAlign: "center",
    color: colors.muted,
    fontWeight: "600",
    marginVertical: 8,
  },
  hint: { fontSize: 12, color: colors.muted, marginTop: 16, lineHeight: 18 },
});

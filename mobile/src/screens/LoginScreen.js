import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { api } from "../api/client";
import { saveToken } from "../state/auth";
import { colors, radius, spacing, cardShadow } from "../theme";

export default function LoginScreen({ onLoggedIn }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }).start();
  }, [anim]);

  const submit = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const { token } = await api.login(password);
      await saveToken(token);
      onLoggedIn();
    } catch (e) {
      setError(e.message.includes("401") ? "Şifre yanlış." : "Sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <Animated.View
        style={[
          styles.card,
          cardShadow,
          { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
        ]}
      >
        <Text style={styles.icon}>🐷</Text>
        <Text style={styles.title}>Piggybank</Text>
        <Text style={styles.subtitle}>Devam etmek için şifreni gir</Text>

        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          autoFocus
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Giriş Yap</Text>}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
  },
  icon: { fontSize: 40, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: spacing.xl },
  input: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    textAlign: "center",
  },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  btn: {
    width: "100%",
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 6,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

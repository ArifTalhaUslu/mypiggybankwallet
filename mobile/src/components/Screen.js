import { View, StyleSheet, ScrollView } from "react-native";
import { colors, maxContentWidth, spacing } from "../theme";

// Full-bleed dark background, with content capped to a readable centered column on wide
// screens (PC/web) — like a Bootstrap col-6 — and full-width on phones.
export default function Screen({ children, scroll = false }) {
  if (scroll) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.scrollContent}>
        <View style={styles.column}>{children}</View>
      </ScrollView>
    );
  }
  return (
    <View style={styles.page}>
      <View style={[styles.column, styles.flex]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  column: { width: "100%", maxWidth: maxContentWidth, alignSelf: "center", padding: spacing.lg },
  flex: { flex: 1 },
});

import { useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, maxContentWidth, spacing } from "../theme";

// Soft fade + rise every time a tab comes into focus, so switching tabs feels alive
// instead of an instant jump-cut. Runs on every focus, not just first mount.
function useEnterAnimation() {
  const anim = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }, [anim])
  );
  return {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };
}

// Full-bleed dark background, with content capped to a readable centered column on wide
// screens (PC/web) — like a Bootstrap col-6 — and full-width on phones.
export default function Screen({ children, scroll = false }) {
  const enterStyle = useEnterAnimation();

  if (scroll) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.column, enterStyle]}>{children}</Animated.View>
      </ScrollView>
    );
  }
  return (
    <View style={styles.page}>
      <Animated.View style={[styles.column, styles.flex, enterStyle]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  column: { width: "100%", maxWidth: maxContentWidth, alignSelf: "center", padding: spacing.lg },
  flex: { flex: 1 },
});

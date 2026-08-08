import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, radius, spacing, cardShadow } from "../theme";

// In-app confirm popup, styled to match the rest of the UI — replaces window.confirm /
// Alert.alert, which either look out of place (browser dialog) or silently no-op on web.
export default function ConfirmModal({ visible, title, message, confirmLabel = "Onayla", onConfirm, onCancel }) {
  // react-native-web's <Modal visible={false}> doesn't reliably unmount its portal
  // content — render the modal at all only while actually visible, to be sure.
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: "800" },
  message: { color: colors.textDim, fontSize: 14, marginTop: spacing.sm, lineHeight: 20 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { color: colors.textDim, fontWeight: "700" },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: "center",
    backgroundColor: colors.accent,
  },
  confirmText: { color: "#fff", fontWeight: "700" },
});

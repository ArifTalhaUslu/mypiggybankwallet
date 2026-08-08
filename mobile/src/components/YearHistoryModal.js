import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import AmountInput from "./AmountInput";
import { colors, radius, spacing, cardShadow } from "../theme";
import { formatMoney } from "../utils/format";

export default function YearHistoryModal({
  visible,
  constantName,
  history,
  draft,
  onDraftChange,
  onSaveYear,
  onDeleteYear,
  onClose,
}) {
  // react-native-web's <Modal visible={false}> doesn't reliably unmount its portal
  // content — render the modal at all only while actually visible, to be sure.
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, cardShadow]}>
          <View style={styles.header}>
            <Text style={styles.title}>{constantName} — Geçmiş Yıllar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {history.length === 0 ? (
              <Text style={styles.empty}>Henüz geçmiş yıl kaydı yok.</Text>
            ) : (
              [...history]
                .sort((a, b) => b.year - a.year)
                .map((h) => (
                  <View key={h.year} style={styles.row}>
                    <Text style={styles.rowText}>
                      {h.year} · {formatMoney(h.amount)}
                    </Text>
                    <TouchableOpacity onPress={() => onDeleteYear(h.year)} hitSlop={8}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
            )}
          </ScrollView>

          <Text style={styles.sectionLabel}>Yıl için tutar gir/güncelle</Text>
          <View style={styles.editRow}>
            <TextInput
              style={[styles.input, { flex: 0.6 }]}
              placeholder="Yıl"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              value={draft.year}
              onChangeText={(v) => onDraftChange({ ...draft, year: v })}
            />
            <AmountInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Tutar"
              placeholderTextColor={colors.textDim}
              value={draft.amount}
              onChangeText={(v) => onDraftChange({ ...draft, amount: v })}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={onSaveYear}>
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 16, fontWeight: "800", flex: 1 },
  closeBtn: { color: colors.textDim, fontSize: 18, paddingHorizontal: 4 },
  list: { maxHeight: 220, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  rowText: { color: colors.text, fontSize: 14 },
  deleteBtn: { color: colors.danger, paddingHorizontal: 4 },
  empty: { color: colors.textDim, fontSize: 13, textAlign: "center", paddingVertical: spacing.lg },
  sectionLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  editRow: { flexDirection: "row", gap: spacing.sm },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.lg, justifyContent: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});

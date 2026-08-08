import { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { colors, radius, spacing, cardShadow } from "../theme";

// Combobox-style picker: a title, a scrollable list of {key, label, sublabel} options.
// Single-select taps and closes immediately; multiSelect checks items and confirms
// with a button so several can be added in one go.
export default function SelectModal({ visible, title, options, multiSelect = false, onSelect, onConfirm, onClose }) {
  const [checked, setChecked] = useState({});

  useEffect(() => {
    if (visible) setChecked({});
  }, [visible]);

  if (!visible) return null;

  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));
  const selectedCount = Object.values(checked).filter(Boolean).length;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.option, multiSelect && checked[opt.key] && styles.optionChecked]}
                onPress={() => (multiSelect ? toggle(opt.key) : onSelect(opt.key))}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  {!!opt.sublabel && <Text style={styles.optionSublabel}>{opt.sublabel}</Text>}
                </View>
                {multiSelect && (
                  <View style={[styles.checkbox, checked[opt.key] && styles.checkboxOn]}>
                    {checked[opt.key] && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {multiSelect ? (
            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.closeBtnFlex} onPress={onClose}>
                <Text style={styles.closeBtnText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, selectedCount === 0 && styles.confirmBtnDisabled]}
                disabled={selectedCount === 0}
                onPress={() => onConfirm(Object.keys(checked).filter((k) => checked[k]))}
              >
                <Text style={styles.confirmBtnText}>Ekle{selectedCount > 0 ? ` (${selectedCount})` : ""}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Vazgeç</Text>
            </TouchableOpacity>
          )}
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
    maxWidth: 360,
    maxHeight: "75%",
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  list: { maxHeight: 300 },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChecked: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  optionLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },
  optionSublabel: { color: colors.textDim, fontSize: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "800" },
  closeBtn: { alignItems: "center", paddingVertical: spacing.sm + 2, marginTop: spacing.sm },
  closeBtnText: { color: colors.textDim, fontWeight: "600" },
  footerRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  closeBtnFlex: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmBtn: { flex: 1, alignItems: "center", paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.accent },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: "#fff", fontWeight: "700" },
});

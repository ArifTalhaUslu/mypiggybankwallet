import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import Screen from "../components/Screen";
import AmountInput from "../components/AmountInput";
import { colors, radius, spacing, cardShadow, CATEGORY_PALETTE as PALETTE } from "../theme";
import { formatMoney } from "../utils/format";

export default function AssetsScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({}); // id -> { name?, quantity?, unitPrice? }
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const fillAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const doc = await api.getAssets();
      setEntries(doc.entries);
    } catch (e) {
      Alert.alert("Hata", "Backend'e ulaşılamadı: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!loading) {
      fillAnim.setValue(0);
      Animated.timing(fillAnim, { toValue: 1, duration: 700, useNativeDriver: false }).start();
    }
  }, [loading, fillAnim]);

  const commitEntry = async (entry) => {
    const draft = edits[entry._id];
    if (!draft) return;
    const patch = {};
    if (draft.name !== undefined) patch.name = draft.name.trim() || entry.name;
    if (draft.quantity !== undefined) {
      const n = parseFloat(draft.quantity.replace(",", "."));
      patch.quantity = Number.isNaN(n) ? entry.quantity : n;
    }
    if (draft.unitPrice !== undefined) {
      const n = parseFloat(draft.unitPrice.replace(",", "."));
      patch.unitPrice = Number.isNaN(n) ? entry.unitPrice : n;
    }
    setEdits((e) => ({ ...e, [entry._id]: undefined }));
    await api.updateAssetEntry(entry._id, patch);
    load();
  };

  const removeEntry = async (id) => {
    await api.deleteAssetEntry(id);
    load();
  };

  const addEntry = async () => {
    const quantity = parseFloat(newQuantity.replace(",", ".")) || 0;
    const unitPrice = parseFloat(newUnitPrice.replace(",", ".")) || 0;
    if (!newName.trim()) return;
    await api.addAssetEntry({ name: newName.trim(), quantity, unitPrice });
    setNewName("");
    setNewQuantity("");
    setNewUnitPrice("");
    load();
  };

  const valueOf = (entry) => {
    const d = edits[entry._id];
    const qty = d?.quantity !== undefined ? parseFloat(d.quantity.replace(",", ".")) || 0 : entry.quantity;
    const price = d?.unitPrice !== undefined ? parseFloat(d.unitPrice.replace(",", ".")) || 0 : entry.unitPrice;
    return qty * price;
  };

  const total = entries.reduce((s, e) => s + valueOf(e), 0);
  const segments = entries.map((e, i) => ({ id: e._id, value: valueOf(e), color: PALETTE[i % PALETTE.length] })).filter((s) => s.value > 0);
  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <Screen scroll>
      <View style={[styles.totalCard, cardShadow]}>
        <Text style={styles.totalLabel}>Toplam Varlık</Text>
        <Text style={styles.totalValue}>{formatMoney(total)} ₺</Text>

        {total > 0 && (
          <View style={styles.segmentTrack}>
            <Animated.View style={{ flexDirection: "row", height: "100%", width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }}>
              {segments.map((s) => (
                <View key={s.id} style={{ width: `${pct(s.value)}%`, backgroundColor: s.color, height: "100%" }} />
              ))}
            </Animated.View>
          </View>
        )}

        {segments.length > 0 && (
          <View style={styles.breakdownRow}>
            {entries.map((e, i) => {
              const v = valueOf(e);
              if (v <= 0) return null;
              return (
                <View key={e._id} style={styles.breakdownItem}>
                  <View style={[styles.dot, { backgroundColor: PALETTE[i % PALETTE.length] }]} />
                  <Text style={styles.breakdownText}>
                    {e.name} {pct(v).toFixed(0)}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {entries.map((entry) => {
        const draft = edits[entry._id] ?? {};
        return (
          <View key={entry._id} style={[styles.entryCard, cardShadow]}>
            <View style={styles.entryHeader}>
              <TextInput
                style={styles.nameInput}
                value={draft.name ?? entry.name}
                onChangeText={(v) => setEdits((e) => ({ ...e, [entry._id]: { ...e[entry._id], name: v } }))}
                onBlur={() => commitEntry(entry)}
              />
              <TouchableOpacity onPress={() => removeEntry(entry._id)} hitSlop={8}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.entryRow}>
              <View style={styles.entryField}>
                <Text style={styles.fieldLabel}>Miktar</Text>
                <AmountInput
                  style={styles.input}
                  value={draft.quantity ?? String(entry.quantity)}
                  onChangeText={(v) => setEdits((e) => ({ ...e, [entry._id]: { ...e[entry._id], quantity: v } }))}
                  onBlur={() => commitEntry(entry)}
                />
              </View>
              <View style={styles.entryField}>
                <Text style={styles.fieldLabel}>Birim Fiyat</Text>
                <AmountInput
                  style={styles.input}
                  value={draft.unitPrice ?? String(entry.unitPrice)}
                  onChangeText={(v) => setEdits((e) => ({ ...e, [entry._id]: { ...e[entry._id], unitPrice: v } }))}
                  onBlur={() => commitEntry(entry)}
                />
              </View>
            </View>
            <Text style={styles.entryValue}>{formatMoney(valueOf(entry))} ₺</Text>
          </View>
        );
      })}

      <View style={[styles.addCard, cardShadow]}>
        <Text style={styles.sectionLabel}>Yeni varlık ekle</Text>
        <TextInput
          style={styles.input}
          placeholder="Ad (örn. Gümüş, Yatırım Fonu...)"
          placeholderTextColor={colors.textDim}
          value={newName}
          onChangeText={setNewName}
        />
        <View style={styles.entryRow}>
          <AmountInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Miktar"
            placeholderTextColor={colors.textDim}
            value={newQuantity}
            onChangeText={setNewQuantity}
          />
          <AmountInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Birim Fiyat"
            placeholderTextColor={colors.textDim}
            value={newUnitPrice}
            onChangeText={setNewUnitPrice}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={addEntry}>
          <Text style={styles.addBtnText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalLabel: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  totalValue: { color: colors.accent, fontSize: 32, fontWeight: "800", marginTop: 4 },
  segmentTrack: {
    width: "100%",
    height: 10,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.md,
  },
  breakdownRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md, flexWrap: "wrap", justifyContent: "center" },
  breakdownItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  breakdownText: { color: colors.textDim, fontSize: 12 },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  nameInput: { color: colors.text, fontSize: 15, fontWeight: "700", flex: 1, padding: 0 },
  deleteBtn: { color: colors.danger, paddingHorizontal: 4, fontSize: 16 },
  entryRow: { flexDirection: "row", gap: spacing.sm },
  entryField: { flex: 1 },
  fieldLabel: { color: colors.textDim, fontSize: 11, marginBottom: 4 },
  entryValue: { color: colors.mint, fontWeight: "700", textAlign: "right", marginTop: spacing.sm },
  addCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  sectionLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

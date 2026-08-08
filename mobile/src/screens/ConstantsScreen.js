import { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import Screen from "../components/Screen";
import AmountInput from "../components/AmountInput";
import YearHistoryModal from "../components/YearHistoryModal";
import { colors, radius, spacing, cardShadow } from "../theme";

export default function ConstantsScreen() {
  const [constants, setConstants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAmount, setEditingAmount] = useState({});
  const [editingName, setEditingName] = useState({});
  const [yearDrafts, setYearDrafts] = useState({}); // id -> { year, amount }
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [historyModalId, setHistoryModalId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConstants(await api.getConstants());
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

  // Modal portals to the document body on web, outside this screen's DOM — left open
  // it would stay rendered on top of whichever tab you switch to next.
  useFocusEffect(
    useCallback(() => {
      return () => setHistoryModalId(null);
    }, [])
  );

  const saveAmount = async (id) => {
    const amount = parseFloat((editingAmount[id] ?? "").replace(",", "."));
    if (Number.isNaN(amount)) return;
    await api.updateConstantAmount(id, amount);
    setEditingAmount((e) => ({ ...e, [id]: undefined }));
    load();
  };

  const saveName = async (id) => {
    const name = (editingName[id] ?? "").trim();
    if (!name) return;
    await api.updateConstantName(id, name);
    setEditingName((e) => ({ ...e, [id]: undefined }));
    load();
  };

  const saveYear = async (id) => {
    const draft = yearDrafts[id] ?? {};
    const year = parseInt(draft.year, 10);
    const amount = parseFloat((draft.amount ?? "").replace(",", "."));
    if (Number.isNaN(year) || Number.isNaN(amount)) return;
    await api.setConstantHistory(id, year, amount);
    setYearDrafts((d) => ({ ...d, [id]: { year: "", amount: "" } }));
    load();
  };

  const removeYear = async (id, year) => {
    await api.deleteConstantHistory(id, year);
    load();
  };

  const removeConstant = async (id) => {
    await api.deleteConstant(id);
    load();
  };

  const addConstant = async () => {
    const amount = parseFloat(newAmount.replace(",", "."));
    if (!newName.trim() || Number.isNaN(amount)) return;
    await api.addConstant(newName.trim(), amount);
    setNewName("");
    setNewAmount("");
    load();
  };

  const historyConstant = constants.find((c) => c._id === historyModalId);
  const historyDraft = yearDrafts[historyModalId] ?? { year: "", amount: "" };

  return (
    <Screen>
      <FlatList
        data={constants}
        keyExtractor={(c) => c._id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        renderItem={({ item }) => (
          <View style={[styles.card, cardShadow]}>
            <View style={styles.cardHeader}>
              <TextInput
                style={styles.nameInput}
                value={editingName[item._id] ?? item.name}
                onChangeText={(v) => setEditingName((e) => ({ ...e, [item._id]: v }))}
                onBlur={() => editingName[item._id] !== undefined && saveName(item._id)}
              />
              <TouchableOpacity onPress={() => removeConstant(item._id)} hitSlop={8}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editRow}>
              <AmountInput
                style={styles.input}
                value={editingAmount[item._id] ?? String(item.current)}
                onChangeText={(v) => setEditingAmount((e) => ({ ...e, [item._id]: v }))}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={() => saveAmount(item._id)}>
                <Text style={styles.saveBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.detailBtn} onPress={() => setHistoryModalId(item._id)}>
              <Text style={styles.detailBtnText}>
                📅 Geçmiş Yıllar {item.history.length > 0 ? `(${item.history.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading && <Text style={styles.empty}>Henüz sabit tanımlanmadı.</Text>}
      />

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Sabit adı (örn. Kira)"
          placeholderTextColor={colors.textDim}
          value={newName}
          onChangeText={setNewName}
        />
        <AmountInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Tutar"
          placeholderTextColor={colors.textDim}
          value={newAmount}
          onChangeText={setNewAmount}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addConstant}>
          <Text style={styles.addBtnText}>Ekle</Text>
        </TouchableOpacity>
      </View>

      {historyConstant && (
        <YearHistoryModal
          visible={!!historyModalId}
          constantName={historyConstant.name}
          history={historyConstant.history}
          draft={historyDraft}
          onDraftChange={(d) => setYearDrafts((s) => ({ ...s, [historyModalId]: d }))}
          onSaveYear={() => saveYear(historyModalId)}
          onDeleteYear={(year) => removeYear(historyModalId, year)}
          onClose={() => setHistoryModalId(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm, gap: spacing.sm },
  nameInput: { color: colors.text, fontSize: 16, fontWeight: "700", flex: 1, padding: 0 },
  deleteBtn: { color: colors.danger, paddingHorizontal: 4, fontSize: 16 },
  editRow: { flexDirection: "row", gap: spacing.sm },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  detailBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
  },
  detailBtnText: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  empty: { color: colors.textDim, textAlign: "center", marginTop: 40 },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
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
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "700" },
});

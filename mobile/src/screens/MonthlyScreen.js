import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import Screen from "../components/Screen";
import AmountInput from "../components/AmountInput";
import ConfirmModal from "../components/ConfirmModal";
import SelectModal from "../components/SelectModal";
import { colors, radius, spacing, cardShadow } from "../theme";
import { formatMoney, formatMonthLabel, formatMonthShort } from "../utils/format";
import { getCachedMonth, setCachedMonth } from "../state/monthCache";

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthlyScreen() {
  const [month, setMonth] = useState(null);
  const [monthsList, setMonthsList] = useState([]); // full list with totals, ascending — powers the strip + "latest" check
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [edits, setEdits] = useState({}); // item._id -> { name?, amount? } draft while editing
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [constants, setConstants] = useState([]);
  const [addMode, setAddMode] = useState("irregular"); // "constant" | "irregular"
  const [constantPickerVisible, setConstantPickerVisible] = useState(false);
  const stripRef = useRef(null);
  const cardRefs = useRef({}); // month -> card node, for scrollIntoView

  // Keeps the months strip's totals in sync locally from a mutation's response —
  // no need to ever re-fetch the whole /months list just because one month changed.
  const patchMonthsList = useCallback((doc) => {
    const t = doc.items.reduce((s, i) => s + i.amount, 0);
    const p = doc.items.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    const summary = { month: doc.month, total: t, paid: p, remaining: t - p, itemCount: doc.items.length };
    setMonthsList((list) => {
      const idx = list.findIndex((m) => m.month === doc.month);
      if (idx === -1) return [...list, summary].sort((a, b) => a.month.localeCompare(b.month));
      const copy = [...list];
      copy[idx] = summary;
      return copy;
    });
  }, []);

  const applyMonthDoc = useCallback(
    (doc) => {
      setItems(doc.items);
      setCachedMonth(doc.month, doc.items);
      patchMonthsList(doc);
    },
    [patchMonthsList]
  );

  // Cache-first: already-visited months render instantly instead of waiting on a round trip.
  const loadMonth = useCallback(async (m) => {
    const cached = getCachedMonth(m);
    if (cached) {
      setItems(cached);
      setLoading(false);
      return true;
    }
    setLoading(true);
    try {
      const doc = await api.getMonth(m);
      applyMonthDoc(doc);
      return true;
    } catch (e) {
      Alert.alert("Hata", "Bu ay yüklenemedi: " + e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [applyMonthDoc]);

  const refreshMonthsList = useCallback(async () => {
    const months = await api.getMonths();
    setMonthsList(months);
    return months.length ? months[months.length - 1].month : null;
  }, []);

  const goToMonth = useCallback(
    async (delta) => {
      if (!month) return;
      const target = shiftMonth(month, delta);
      const ok = await loadMonth(target);
      if (ok) setMonth(target);
    },
    [month, loadMonth]
  );

  const selectMonth = useCallback(
    async (target) => {
      if (target === month) return;
      const ok = await loadMonth(target);
      if (ok) setMonth(target);
    },
    [month, loadMonth]
  );

  const performCreateNextMonth = useCallback(async () => {
    setCreating(true);
    try {
      const doc = await api.createNextMonth();
      applyMonthDoc(doc);
      setMonth(doc.month);
    } catch (e) {
      Alert.alert("Hata", "Yeni ay oluşturulamadı: " + e.message);
    } finally {
      setCreating(false);
    }
  }, [applyMonthDoc]);

  const handleConfirmCreate = useCallback(() => {
    setConfirmVisible(false);
    performCreateNextMonth();
  }, [performCreateNextMonth]);

  useFocusEffect(
    useCallback(() => {
      api.getConstants().then(setConstants).catch(() => {});
    }, [])
  );

  // RN's Modal portals straight to the document body on web, outside this screen's own
  // DOM — so if left open while switching tabs, it stays rendered on top of whichever
  // tab you land on. Close any open modal the moment this tab loses focus.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setConstantPickerVisible(false);
        setConfirmVisible(false);
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (month) {
        loadMonth(month);
        return;
      }
      (async () => {
        const latest = await refreshMonthsList();
        if (cancelled) return;
        if (latest) setMonth(latest);
        else setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month])
  );

  const togglePaid = async (item) => {
    const doc = await api.updateItem(month, item._id, { paid: !item.paid });
    applyMonthDoc(doc);
  };

  const removeItem = async (item) => {
    const doc = await api.deleteItem(month, item._id);
    applyMonthDoc(doc);
  };

  const commitNameEdit = async (item) => {
    const val = edits[item._id]?.name;
    setEdits((e) => ({ ...e, [item._id]: { ...e[item._id], name: undefined } }));
    if (val === undefined || !val.trim() || val === item.name) return;
    const doc = await api.updateItem(month, item._id, { name: val.trim() });
    applyMonthDoc(doc);
  };

  const commitAmountEdit = async (item) => {
    const val = edits[item._id]?.amount;
    setEdits((e) => ({ ...e, [item._id]: { ...e[item._id], amount: undefined } }));
    if (val === undefined) return;
    const n = parseFloat(val.replace(",", "."));
    if (Number.isNaN(n) || n === item.amount) return;
    const doc = await api.updateItem(month, item._id, { amount: n });
    applyMonthDoc(doc);
  };

  const addIrregularItem = async () => {
    const amount = parseFloat(newAmount.replace(",", "."));
    if (!newName.trim() || Number.isNaN(amount)) return;
    const doc = await api.addItem(month, { name: newName.trim(), amount, paid: false });
    applyMonthDoc(doc);
    setNewName("");
    setNewAmount("");
  };

  const addFromConstants = async (constantIds) => {
    setConstantPickerVisible(false);
    let doc;
    for (const id of constantIds) {
      const c = constants.find((x) => x._id === id);
      if (!c) continue;
      // Sequential: each call returns the whole updated month doc, and firing them
      // concurrently would race on the same document.
      // eslint-disable-next-line no-await-in-loop
      doc = await api.addItem(month, { name: c.name, amount: c.current, paid: false, constantId: c._id });
    }
    if (doc) applyMonthDoc(doc);
  };

  // Regular (linked to a constant) items first, irregular one-offs at the bottom —
  // keeps the predictable monthly bills grouped and the surprises visually set apart.
  const sortedItems = [...items].sort((a, b) => {
    const aLinked = a.constantId ? 1 : 0;
    const bLinked = b.constantId ? 1 : 0;
    return bLinked - aLinked;
  });

  const usedConstantIds = new Set(items.filter((i) => i.constantId).map((i) => i.constantId));
  const availableConstants = constants.filter((c) => !usedConstantIds.has(c._id));

  const total = items.reduce((s, i) => s + i.amount, 0);
  const paid = items.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const remaining = total - paid;
  const progress = total > 0 ? paid / total : 0;
  const latestMonth = monthsList.length ? monthsList[monthsList.length - 1].month : null;
  const isAtLatest = month !== null && month === latestMonth;
  // Oldest-first so the current month sits at the right edge — same direction as the
  // "‹" arrow: scrolling left reaches further into the past, matching its meaning.
  const stripData = monthsList;

  // Keeps the selected month's card scrolled into view — on initial load, on arrow
  // navigation, and when tapping a card that's only partly visible at the edge.
  // useFocusEffect (not a plain useEffect) so this never fires while this tab is in
  // the background — React Navigation keeps every tab mounted, and scrollIntoView on
  // a hidden element was scrolling the whole page sideways on iOS Safari.
  useFocusEffect(
    useCallback(() => {
      if (!month) return;
      const t = setTimeout(() => {
        cardRefs.current[month]?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
      }, 50);
      return () => clearTimeout(t);
    }, [month])
  );

  // On PC, a horizontal ScrollView only responds to touch/scrollbar drag by default —
  // add mouse wheel scrolling (smooth glide, not per-notch jumps) and click-drag
  // panning, like any native horizontal carousel. Skipped entirely on touch devices:
  // phones synthesize mousedown/mousemove from real touches, and a global window-level
  // "mousemove" listener reacting to that hijacked normal page scrolling on iOS Safari.
  useEffect(() => {
    if (Platform.OS !== "web" || stripData.length < 2) return;
    const isTouchPrimary = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches;
    if (isTouchPrimary) return;

    const node = stripRef.current?.getScrollableNode?.() ?? stripRef.current;
    if (!node) return;

    const WHEEL_SENSITIVITY = 2;
    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        node.style.scrollBehavior = "smooth";
        node.scrollLeft += e.deltaY * WHEEL_SENSITIVITY;
        e.preventDefault();
      }
    };

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;

    const handleMouseDown = (e) => {
      dragging = true;
      moved = false;
      startX = e.clientX;
      startScrollLeft = node.scrollLeft;
      node.style.scrollBehavior = "auto";
      node.style.cursor = "grabbing";
    };
    const handleMouseMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      node.scrollLeft = startScrollLeft - dx;
    };
    const endDrag = () => {
      dragging = false;
      node.style.cursor = "grab";
    };
    // Swallow the click that follows a real drag so it doesn't also select a card.
    const handleClickCapture = (e) => {
      if (moved) {
        e.stopPropagation();
        moved = false;
      }
    };

    node.style.cursor = "grab";
    node.addEventListener("wheel", handleWheel, { passive: false });
    node.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", endDrag);
    node.addEventListener("click", handleClickCapture, true);
    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", endDrag);
      node.removeEventListener("click", handleClickCapture, true);
    };
  }, [stripData.length]);

  if (!loading && !month) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <Text style={styles.empty}>Henüz hiç ay yok.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={performCreateNextMonth} disabled={creating}>
            <Text style={styles.createBtnText}>{creating ? "Oluşturuluyor…" : "+ İlk Ayı Oluştur"}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.monthSwitcher}>
        <TouchableOpacity onPress={() => goToMonth(-1)} style={styles.navBtn}>
          <Text style={styles.navBtnText}>{"‹"}</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{formatMonthLabel(month) || "…"}</Text>
        {isAtLatest ? (
          <TouchableOpacity
            onPress={() => setConfirmVisible(true)}
            disabled={creating}
            style={[styles.navBtn, styles.createNavBtn]}
            accessibilityLabel={`${formatMonthLabel(shiftMonth(month, 1))} ayını oluştur`}
          >
            <Text style={styles.createNavBtnText}>{creating ? "…" : "+"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => goToMonth(1)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>{"›"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isAtLatest && latestMonth && (
        <TouchableOpacity style={styles.todayBtn} onPress={() => selectMonth(latestMonth)}>
          <Text style={styles.todayBtnText}>↻ Bugüne dön</Text>
        </TouchableOpacity>
      )}

      {stripData.length > 1 && (
        <ScrollView
          ref={stripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.strip}
          contentContainerStyle={styles.stripContent}
        >
          {stripData.map((m) => {
            const selected = m.month === month;
            return (
              <TouchableOpacity
                key={m.month}
                ref={(el) => {
                  if (el) cardRefs.current[m.month] = el;
                }}
                style={[styles.stripCard, selected && styles.stripCardSelected]}
                onPress={() => selectMonth(m.month)}
              >
                <Text style={[styles.stripMonth, selected && styles.stripMonthSelected]} numberOfLines={1}>
                  {formatMonthShort(m.month)}
                </Text>
                <Text style={[styles.stripTotal, selected && styles.stripTotalSelected]} numberOfLines={1}>
                  {formatMoney(m.total)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.summaryCard, cardShadow]}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Toplam</Text>
            <Text style={styles.summaryValue}>{formatMoney(total)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.summaryLabel}>Kalan</Text>
            <Text style={[styles.summaryValue, { color: remaining > 0 ? colors.danger : colors.mint }]}>
              {formatMoney(remaining)}
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 1) * 100}%` }]} />
        </View>
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={(i) => i._id}
        refreshing={loading}
        onRefresh={() => month && loadMonth(month)}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        renderItem={({ item }) => (
          <View style={[styles.row, cardShadow]}>
            <View style={styles.rowTop}>
              <TouchableOpacity onPress={() => togglePaid(item)} style={styles.checkbox}>
                <View style={[styles.checkCircle, item.paid && styles.checkCircleOn]}>
                  {item.paid && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
              <TextInput
                style={[styles.itemNameInput, item.paid && styles.paidText]}
                value={edits[item._id]?.name ?? item.name}
                onChangeText={(v) => setEdits((e) => ({ ...e, [item._id]: { ...e[item._id], name: v } }))}
                onBlur={() => commitNameEdit(item)}
              />
              <AmountInput
                style={styles.itemAmountInput}
                value={edits[item._id]?.amount ?? String(item.amount)}
                onChangeText={(v) => setEdits((e) => ({ ...e, [item._id]: { ...e[item._id], amount: v } }))}
                onBlur={() => commitAmountEdit(item)}
              />
              <TouchableOpacity onPress={() => removeItem(item)} hitSlop={8}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {!item.constantId && (
              <View style={styles.linkRow}>
                <View style={styles.linkBadge}>
                  <Text style={styles.irregularIcon}>✦</Text>
                  <Text style={styles.linkPrompt}>Düzensiz harcama</Text>
                </View>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!loading && <Text style={styles.empty}>Bu ay için kalem yok.</Text>}
      />

      <View style={styles.addModeToggle}>
        <TouchableOpacity
          style={[styles.addModeBtn, addMode === "irregular" && styles.addModeBtnActive]}
          onPress={() => setAddMode("irregular")}
        >
          <Text style={[styles.addModeText, addMode === "irregular" && styles.addModeTextActive]}>Düzensiz Ekle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addModeBtn, addMode === "constant" && styles.addModeBtnActive]}
          onPress={() => setAddMode("constant")}
        >
          <Text style={[styles.addModeText, addMode === "constant" && styles.addModeTextActive]}>Sabitten Ekle</Text>
        </TouchableOpacity>
      </View>

      {addMode === "constant" ? (
        availableConstants.length === 0 ? (
          <Text style={styles.empty}>Bu ay için tüm sabitler zaten eklenmiş.</Text>
        ) : (
          <TouchableOpacity style={styles.comboboxBtn} onPress={() => setConstantPickerVisible(true)}>
            <Text style={styles.comboboxBtnText}>Sabit seç…</Text>
            <Text style={styles.comboboxBtnChevron}>▾</Text>
          </TouchableOpacity>
        )
      ) : (
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Düzensiz kalem adı"
            placeholderTextColor={colors.textDim}
            value={newName}
            onChangeText={setNewName}
          />
          <AmountInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Düzensiz tutar"
            placeholderTextColor={colors.textDim}
            value={newAmount}
            onChangeText={setNewAmount}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addIrregularItem}>
            <Text style={styles.addBtnText}>Ekle</Text>
          </TouchableOpacity>
        </View>
      )}

      <SelectModal
        visible={constantPickerVisible}
        title="Hangi sabitler eklensin?"
        multiSelect
        options={availableConstants.map((c) => ({ key: c._id, label: c.name, sublabel: formatMoney(c.current) }))}
        onConfirm={addFromConstants}
        onClose={() => setConstantPickerVisible(false)}
      />

      <ConfirmModal
        visible={confirmVisible}
        title="Yeni ay oluşturulsun mu?"
        message={
          month
            ? `${formatMonthLabel(shiftMonth(month, 1))} açılacak — sabitler otomatik eklenir ve önceki ay rakamları otomatik eklenir.`
            : ""
        }
        confirmLabel="Oluştur"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleConfirmCreate}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  todayBtn: {
    alignSelf: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  todayBtnText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.25 },
  navBtnText: { color: colors.accent, fontSize: 20, fontWeight: "600" },
  createNavBtn: { backgroundColor: colors.accent },
  createNavBtnText: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 22 },
  monthLabel: { color: colors.text, fontSize: 18, fontWeight: "700", minWidth: 150, textAlign: "center" },
  // No fixed height — sized by the cards' own padding, so it still fits their content
  // (and doesn't collide with the card below) at high browser zoom / larger fonts.
  strip: { marginBottom: spacing.lg, flexGrow: 0, flexShrink: 0 },
  stripContent: { flexGrow: 1, gap: spacing.sm, paddingHorizontal: 2, paddingVertical: 2, justifyContent: "flex-start", alignItems: "stretch" },
  stripCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  stripCardSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  stripMonth: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  stripMonthSelected: { color: colors.accent },
  stripTotal: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  stripTotalSelected: { color: colors.text, fontWeight: "600" },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 2 },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.mint },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  linkRow: { marginTop: 6, marginLeft: 34 },
  linkBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  irregularIcon: { fontSize: 10, color: "#ffb84d" },
  linkPrompt: { color: "#ffb84d", fontSize: 11, fontWeight: "600" },
  checkbox: { padding: 2 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  checkMark: { color: colors.bg, fontSize: 12, fontWeight: "800" },
  itemNameInput: {
    color: colors.text,
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  paidText: { textDecorationLine: "line-through", color: colors.textDim },
  itemAmountInput: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 15,
    textAlign: "right",
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    // A fixed width, not just minWidth — an <input>'s own intrinsic sizing (which
    // minWidth alone doesn't override) grows with font-size, and at the 16px iOS needs
    // to avoid auto-zoom, that intrinsic width alone was crushing the name field next
    // to it down to 1-2 visible characters.
    width: 92,
    flexShrink: 0,
  },
  deleteBtn: { color: colors.danger, paddingHorizontal: 4, fontSize: 16 },
  empty: { color: colors.textDim, textAlign: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  createBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  createBtnText: { color: "#fff", fontWeight: "700" },
  addModeToggle: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  addModeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addModeBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  addModeText: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  addModeTextActive: { color: colors.accent },
  comboboxBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  comboboxBtnText: { color: colors.text, fontSize: 14 },
  comboboxBtnChevron: { color: colors.textDim, fontSize: 14 },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 0,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "700" },
});

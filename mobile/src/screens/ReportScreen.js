import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, Animated, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import Screen from "../components/Screen";
import LineChart from "../components/LineChart";
import PieChart from "../components/PieChart";
import SelectModal from "../components/SelectModal";
import { colors, radius, spacing, cardShadow, CATEGORY_PALETTE } from "../theme";
import { formatMoney, formatMonthShort, formatMonthLabel } from "../utils/format";

const TOP_N = 6;
const ALL_TIME = "ALL";

function AnimatedCard({ delay = 0, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function ReportScreen() {
  const [months, setMonths] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null); // a "YYYY-MM" key, or ALL_TIME
  const [selectedMonthItems, setSelectedMonthItems] = useState([]);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [constants, setConstants] = useState([]);
  const [assetEntries, setAssetEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const fillAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, b, c, a] = await Promise.all([api.getMonths(), api.getSpendingBreakdown(), api.getConstants(), api.getAssets()]);
      setMonths(m);
      setBreakdown(b);
      setConstants(c);
      setAssetEntries(a.entries);
      const latest = m.length ? m[m.length - 1].month : null;
      setSelectedMonth((prev) => prev ?? latest);
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
      return () => setMonthPickerVisible(false);
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
    if (!selectedMonth || selectedMonth === ALL_TIME) {
      setSelectedMonthItems([]);
      return;
    }
    api.getMonth(selectedMonth).then((doc) => {
      if (!cancelled) setSelectedMonthItems(doc.items);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  useEffect(() => {
    if (!loading) {
      fillAnim.setValue(0);
      Animated.timing(fillAnim, { toValue: 1, duration: 800, delay: 250, useNativeDriver: false }).start();
    }
  }, [loading, fillAnim]);

  const chartData = months.map((m) => ({ value: m.total, month: m.month }));

  const savingsTotal = assetEntries.reduce((s, e) => s + e.quantity * e.unitPrice, 0);
  const savingsPct = (n) => (savingsTotal > 0 ? (n / savingsTotal) * 100 : 0);
  const savingsSegments = assetEntries
    .map((e) => ({ name: e.name, value: e.quantity * e.unitPrice }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const constantNameById = (id) => constants.find((c) => c._id === id)?.name;
  const isAllTime = selectedMonth === ALL_TIME;

  let breakdownSegments;
  if (isAllTime) {
    const top = breakdown.slice(0, TOP_N);
    const restTotal = breakdown.slice(TOP_N).reduce((s, b) => s + b.total, 0);
    const cats = restTotal > 0 ? [...top, { name: "Diğer", total: restTotal }] : top;
    breakdownSegments = cats.map((c, i) => ({ label: c.name, value: c.total, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }));
  } else {
    const totals = new Map();
    for (const item of selectedMonthItems) {
      const key = item.constantId ? constantNameById(item.constantId) ?? item.name : item.name;
      totals.set(key, (totals.get(key) ?? 0) + item.amount);
    }
    breakdownSegments = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }));
  }

  const monthPickerOptions = [
    { key: ALL_TIME, label: "Tüm Zamanlar" },
    ...months.slice().reverse().map((m) => ({ key: m.month, label: formatMonthLabel(m.month) })),
  ];
  const breakdownTitle = isAllTime ? "Tüm Zamanlar" : selectedMonth ? formatMonthLabel(selectedMonth) : "";

  return (
    <Screen scroll>
      <AnimatedCard delay={0} style={[styles.chartCard, cardShadow]}>
        <Text style={styles.sectionLabel}>Toplam Birikim</Text>
        <Text style={styles.savingsValue}>{formatMoney(savingsTotal)} ₺</Text>
        {savingsSegments.length === 0 ? (
          <Text style={styles.empty}>Henüz varlık kaydı yok.</Text>
        ) : (
          <>
            <View style={styles.segmentTrack}>
              <Animated.View
                style={{
                  flexDirection: "row",
                  height: "100%",
                  width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                }}
              >
                {savingsSegments.map((s, i) => (
                  <View key={s.name} style={{ width: `${savingsPct(s.value)}%`, backgroundColor: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length], height: "100%" }} />
                ))}
              </Animated.View>
            </View>
            <View style={styles.list}>
              {savingsSegments.map((s, i) => (
                <View key={s.name} style={styles.listRow}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }]} />
                  <Text style={styles.listName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.listPct}>{savingsPct(s.value).toFixed(1)}%</Text>
                  <Text style={styles.listValue}>{formatMoney(s.value)} ₺</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </AnimatedCard>

      <AnimatedCard delay={50} style={[styles.chartCard, cardShadow]}>
        <Text style={styles.sectionLabel}>Aylık Toplam Gider — Zaman Çizelgesi</Text>
        {!loading && months.length >= 2 && (
          <LineChart data={chartData} labelFor={(d) => formatMonthShort(d.month)} formatValue={(v) => `${formatMoney(v)} ₺`} zoomable={false} />
        )}
        {!loading && months.length < 2 && <Text style={styles.empty}>Grafik için en az 2 ay verisi gerekiyor.</Text>}
      </AnimatedCard>

      <AnimatedCard delay={100} style={[styles.chartCard, cardShadow]}>
        <View style={styles.breakdownHeader}>
          <Text style={[styles.sectionLabel, styles.breakdownTitle]} numberOfLines={2}>
            {breakdownTitle} — Nereye Gitti?
          </Text>
          <TouchableOpacity style={styles.monthPickerBtn} onPress={() => setMonthPickerVisible(true)}>
            <Text style={styles.monthPickerBtnText}>Ay seç</Text>
            <Text style={styles.monthPickerBtnChevron}>▾</Text>
          </TouchableOpacity>
        </View>
        {breakdownSegments.length === 0 ? (
          <Text style={styles.empty}>{isAllTime ? "Henüz veri yok." : "Bu ay için kalem yok."}</Text>
        ) : (
          <PieChart segments={breakdownSegments} />
        )}
      </AnimatedCard>

      <SelectModal
        visible={monthPickerVisible}
        title="Hangi ay gösterilsin?"
        options={monthPickerOptions}
        onSelect={(key) => {
          setSelectedMonth(key);
          setMonthPickerVisible(false);
        }}
        onClose={() => setMonthPickerVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.md },
  breakdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.sm },
  breakdownTitle: { flex: 1, minWidth: 0 },
  monthPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  monthPickerBtnText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  monthPickerBtnChevron: { color: colors.textDim, fontSize: 12 },
  savingsValue: { color: colors.mint, fontSize: 26, fontWeight: "800", marginBottom: spacing.md },
  empty: { color: colors.textDim, textAlign: "center", paddingVertical: spacing.xl },
  segmentTrack: {
    width: "100%",
    height: 10,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.md,
  },
  list: { gap: spacing.sm },
  listRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  listName: { color: colors.text, fontSize: 13, flex: 1 },
  listPct: { color: colors.textDim, fontSize: 12, width: 44, textAlign: "right" },
  listValue: { color: colors.text, fontSize: 12, fontWeight: "600", width: 90, textAlign: "right" },
});

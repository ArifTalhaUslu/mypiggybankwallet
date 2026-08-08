import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import Screen from "../components/Screen";
import LineChart from "../components/LineChart";
import PieChart from "../components/PieChart";
import { colors, radius, spacing, cardShadow, CATEGORY_PALETTE } from "../theme";
import { formatMoney, formatMonthShort, formatMonthLabel } from "../utils/format";

const TOP_N = 6;

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
  const [currentMonthItems, setCurrentMonthItems] = useState([]);
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
      if (latest) {
        const doc = await api.getMonth(latest);
        setCurrentMonthItems(doc.items);
      } else {
        setCurrentMonthItems([]);
      }
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
      Animated.timing(fillAnim, { toValue: 1, duration: 800, delay: 250, useNativeDriver: false }).start();
    }
  }, [loading, fillAnim]);

  const totalSpent = months.reduce((s, m) => s + m.total, 0);
  const avgPerMonth = months.length ? totalSpent / months.length : 0;
  const chartData = months.map((m) => ({ value: m.total, month: m.month }));

  const breakdownTotal = breakdown.reduce((s, b) => s + b.total, 0);
  const top = breakdown.slice(0, TOP_N);
  const restTotal = breakdown.slice(TOP_N).reduce((s, b) => s + b.total, 0);
  const categories = restTotal > 0 ? [...top, { name: "Diğer", total: restTotal }] : top;
  const pct = (n) => (breakdownTotal > 0 ? (n / breakdownTotal) * 100 : 0);

  const savingsTotal = assetEntries.reduce((s, e) => s + e.quantity * e.unitPrice, 0);
  const savingsPct = (n) => (savingsTotal > 0 ? (n / savingsTotal) * 100 : 0);
  const savingsSegments = assetEntries
    .map((e) => ({ name: e.name, value: e.quantity * e.unitPrice }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const currentMonthKey = months.length ? months[months.length - 1].month : null;
  const constantNameById = (id) => constants.find((c) => c._id === id)?.name;
  const currentMonthCategoryTotals = new Map();
  for (const item of currentMonthItems) {
    const key = item.constantId ? constantNameById(item.constantId) ?? item.name : item.name;
    currentMonthCategoryTotals.set(key, (currentMonthCategoryTotals.get(key) ?? 0) + item.amount);
  }
  const currentMonthSegments = [...currentMonthCategoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }));

  return (
    <Screen scroll>
      <AnimatedCard delay={0} style={[styles.heroCard, cardShadow]}>
        <Text style={styles.heroLabel}>
          {months.length > 0 ? `${formatMonthLabel(months[0].month)} — şimdiye kadar toplam` : "Toplam Harcama"}
        </Text>
        <Text style={styles.heroValue}>{formatMoney(totalSpent)} ₺</Text>
        {months.length > 0 && (
          <Text style={styles.heroSub}>
            {months.length} ay · aylık ortalama {formatMoney(avgPerMonth)} ₺
          </Text>
        )}
      </AnimatedCard>

      <AnimatedCard delay={50} style={[styles.chartCard, cardShadow]}>
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

      <AnimatedCard delay={100} style={[styles.chartCard, cardShadow]}>
        <Text style={styles.sectionLabel}>Aylık Toplam Gider — Zaman Çizelgesi</Text>
        {!loading && months.length >= 2 && (
          <LineChart data={chartData} labelFor={(d) => formatMonthShort(d.month)} formatValue={(v) => `${formatMoney(v)} ₺`} />
        )}
        {!loading && months.length < 2 && <Text style={styles.empty}>Grafik için en az 2 ay verisi gerekiyor.</Text>}
      </AnimatedCard>

      <AnimatedCard delay={150} style={[styles.chartCard, cardShadow]}>
        <Text style={styles.sectionLabel}>{currentMonthKey ? `${formatMonthLabel(currentMonthKey)} — Ne Nereye Gitti?` : "Bu Ay Ne Nereye Gitti?"}</Text>
        {currentMonthSegments.length === 0 ? (
          <Text style={styles.empty}>Bu ay için kalem yok.</Text>
        ) : (
          <PieChart segments={currentMonthSegments} />
        )}
      </AnimatedCard>

      <AnimatedCard delay={250} style={[styles.chartCard, cardShadow]}>
        <Text style={styles.sectionLabel}>Nereye Gitti? — Kalem Bazında Dağılım</Text>
        {categories.length === 0 ? (
          <Text style={styles.empty}>Henüz veri yok.</Text>
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
                {categories.map((c, i) => (
                  <View key={c.name} style={{ width: `${pct(c.total)}%`, backgroundColor: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length], height: "100%" }} />
                ))}
              </Animated.View>
            </View>

            <View style={styles.list}>
              {categories.map((c, i) => (
                <View key={c.name} style={styles.listRow}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }]} />
                  <Text style={styles.listName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.listPct}>{pct(c.total).toFixed(1)}%</Text>
                  <Text style={styles.listValue}>{formatMoney(c.total)} ₺</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </AnimatedCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroLabel: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
  heroValue: { color: colors.accent, fontSize: 34, fontWeight: "800", marginTop: 6 },
  heroSub: { color: colors.textDim, fontSize: 12, marginTop: spacing.sm },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.md },
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

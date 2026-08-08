import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { colors, radius, spacing } from "../theme";
import { formatMoney } from "../utils/format";

const SIZE = 180;
const R = SIZE / 2;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// Simple categorical pie + legend. Single full-circle segment (one category) renders
// as a ring via two half-arcs since a 360° path degenerates to nothing. Tap/hover a
// slice or its legend row to see its exact amount.
export default function PieChart({ segments }) {
  const [selected, setSelected] = useState(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total <= 0) return null;

  let angle = 0;
  const slices = segments.map((seg) => {
    const sliceAngle = (seg.value / total) * 360;
    const path = sliceAngle >= 359.99 ? null : arcPath(R, R, R, angle, angle + sliceAngle);
    const s = { ...seg, path, pct: (seg.value / total) * 100 };
    angle += sliceAngle;
    return s;
  });

  const active = selected != null ? slices[selected] : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View>
          <Svg width={SIZE} height={SIZE}>
            {slices.map((s, i) =>
              s.path ? (
                <Path
                  key={i}
                  d={s.path}
                  fill={s.color}
                  opacity={selected === null || selected === i ? 1 : 0.35}
                  onPress={() => setSelected(selected === i ? null : i)}
                />
              ) : (
                <Circle
                  key={i}
                  cx={R}
                  cy={R}
                  r={R}
                  fill={s.color}
                  onPress={() => setSelected(selected === i ? null : i)}
                />
              )
            )}
          </Svg>
          {active && (
            <View style={styles.centerTooltip} pointerEvents="none">
              <Text style={styles.tooltipName} numberOfLines={1}>
                {active.label}
              </Text>
              <Text style={styles.tooltipValue}>{formatMoney(active.value)} ₺</Text>
              <Text style={styles.tooltipPct}>{active.pct.toFixed(1)}%</Text>
            </View>
          )}
        </View>
        <View style={styles.legend}>
          {slices.map((s, i) => (
            <View
              key={i}
              style={styles.legendRow}
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => setSelected(selected === i ? null : i)}
            >
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={[styles.legendName, selected === i && styles.legendNameActive]} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={styles.legendPct}>{s.pct.toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg, flexWrap: "wrap" },
  legend: { flex: 1, minWidth: 140, gap: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { color: colors.text, fontSize: 12, flex: 1 },
  legendNameActive: { color: colors.accent, fontWeight: "700" },
  legendPct: { color: colors.textDim, fontSize: 11, width: 34, textAlign: "right" },
  centerTooltip: {
    position: "absolute",
    top: SIZE / 2 - 26,
    left: SIZE / 2 - 60,
    width: 120,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  tooltipName: { color: colors.textDim, fontSize: 10, textAlign: "center" },
  tooltipValue: { color: colors.text, fontSize: 13, fontWeight: "700" },
  tooltipPct: { color: colors.accent, fontSize: 10 },
});

import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from "react-native";
import Svg, { Line, Polyline, Circle } from "react-native-svg";
import { colors, radius, spacing, maxContentWidth } from "../theme";
import { formatMoney } from "../utils/format";

const HEIGHT = 200;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };
const GRID_LINES = 4;
// Screen's centered column padding + this card's own padding, both sides.
const OUTER_PADDING = spacing.lg * 2 + spacing.lg * 2;
const MIN_VISIBLE = 4; // can't zoom in past this many points
const ZOOM_STEP = 0.7; // each +/- press or wheel notch shrinks/grows the window by this factor

// Single-series time line: thin accent stroke, recessive gridlines, no per-point
// clutter. Zoomable — wheel (desktop) or pinch (touch) to zoom, drag to pan once
// zoomed in, tap/scrub to inspect a point via the crosshair tooltip.
export default function LineChart({ data, labelFor, formatValue = formatMoney, zoomable = true }) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, maxContentWidth) - OUTER_PADDING;
  const containerRef = useRef(null);
  const dragState = useRef(null);

  const fullView = { start: 0, end: Math.max(1, data.length - 1) };
  const [view, setView] = useState(fullView);
  const [selected, setSelected] = useState(data.length - 1);

  useEffect(() => {
    setView({ start: 0, end: Math.max(1, data.length - 1) });
    setSelected(data.length - 1);
  }, [data.length]);

  const clampView = (start, end) => {
    let s = start;
    let e = end;
    if (e - s < MIN_VISIBLE - 1) {
      const mid = (s + e) / 2;
      s = mid - (MIN_VISIBLE - 1) / 2;
      e = mid + (MIN_VISIBLE - 1) / 2;
    }
    if (s < 0) {
      e -= s;
      s = 0;
    }
    if (e > data.length - 1) {
      s -= e - (data.length - 1);
      e = data.length - 1;
    }
    return { start: Math.max(0, s), end: Math.min(data.length - 1, e) };
  };

  const zoomAt = (centerIdx, factor) => {
    setView((v) => {
      const span = v.end - v.start;
      const newSpan = Math.max(MIN_VISIBLE - 1, Math.min(data.length - 1, span * factor));
      const ratio = span === 0 ? 0.5 : (centerIdx - v.start) / span;
      const newStart = centerIdx - newSpan * ratio;
      return clampView(newStart, newStart + newSpan);
    });
  };

  const resetZoom = () => setView(fullView);

  // Desktop mouse wheel zoom, centered on the cursor position.
  useEffect(() => {
    if (!zoomable || Platform.OS !== "web" || data.length < 2) return;
    const node = containerRef.current?.getScrollableNode?.() ?? containerRef.current;
    if (!node) return;
    const handleWheel = (e) => {
      const rect = node.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const ratio = Math.min(1, Math.max(0, (localX - PAD.left) / (width - PAD.left - PAD.right)));
      setView((v) => {
        const centerIdx = v.start + ratio * (v.end - v.start);
        const span = v.end - v.start;
        const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        const newSpan = Math.max(MIN_VISIBLE - 1, Math.min(data.length - 1, span * factor));
        const r2 = span === 0 ? 0.5 : (centerIdx - v.start) / span;
        const newStart = centerIdx - newSpan * r2;
        return clampView(newStart, newStart + newSpan);
      });
      e.preventDefault();
    };
    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length, width]);

  if (data.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Grafik için en az 2 ay gerekli.</Text>
      </View>
    );
  }

  const isZoomed = view.end - view.start < data.length - 1 - 0.001;
  const startIdx = Math.round(view.start);
  const endIdx = Math.round(view.end);
  const visible = data.slice(startIdx, endIdx + 1);
  const n = visible.length;

  const values = visible.map((d) => d.value);
  const maxV = Math.max(...values) * 1.1 || 1;
  const minV = 0;
  const chartW = width - PAD.left - PAD.right;
  const chartH = HEIGHT - PAD.top - PAD.bottom;

  const xAt = (i) => PAD.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yAt = (v) => PAD.top + chartH * (1 - (v - minV) / (maxV - minV));
  const points = visible.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(" ");
  const localXToGlobalIndex = (x) => {
    const ratio = Math.min(1, Math.max(0, (x - PAD.left) / chartW));
    return Math.round(startIdx + ratio * (endIdx - startIdx));
  };

  const handleGrant = (evt) => {
    const touches = evt.nativeEvent.touches;
    if (zoomable && touches && touches.length === 2) {
      const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
      dragState.current = { pinchDist: dist, view };
      return;
    }
    const x = evt.nativeEvent.locationX;
    if (isZoomed) {
      dragState.current = { panStartX: x, panStartView: view };
    } else {
      dragState.current = null;
      setSelected(localXToGlobalIndex(x));
    }
  };

  const handleMove = (evt) => {
    const touches = evt.nativeEvent.touches;
    if (zoomable && touches && touches.length === 2 && dragState.current?.pinchDist) {
      const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
      const factor = dragState.current.pinchDist / Math.max(1, dist);
      const { start: s0, end: e0 } = dragState.current.view;
      zoomAt((s0 + e0) / 2, factor);
      return;
    }
    if (dragState.current?.panStartX !== undefined) {
      const x = evt.nativeEvent.locationX;
      const dx = x - dragState.current.panStartX;
      const { start: s0, end: e0 } = dragState.current.panStartView;
      const idxDelta = -(dx / chartW) * (e0 - s0);
      setView(clampView(s0 + idxDelta, e0 + idxDelta));
      return;
    }
    setSelected(localXToGlobalIndex(evt.nativeEvent.locationX));
  };

  const handleRelease = () => {
    dragState.current = null;
  };

  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const lastLocalIndex = n - 1;
  const shouldLabel = (i) => i === lastLocalIndex || (i % labelEvery === 0 && lastLocalIndex - i >= labelEvery / 2);
  const selectedLocal = selected != null ? selected - startIdx : null;

  return (
    <View style={styles.wrapper}>
      {zoomable && (
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomAt((view.start + view.end) / 2, ZOOM_STEP)}>
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomAt((view.start + view.end) / 2, 1 / ZOOM_STEP)}>
            <Text style={styles.zoomBtnText}>−</Text>
          </TouchableOpacity>
          {isZoomed && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetZoom}>
              <Text style={styles.resetBtnText}>Tümü</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View
        ref={containerRef}
        style={styles.container}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}
        onResponderRelease={handleRelease}
        onResponderTerminate={handleRelease}
      >
        <Svg width={width} height={HEIGHT}>
          {Array.from({ length: GRID_LINES + 1 }).map((_, i) => {
            const y = PAD.top + (chartH / GRID_LINES) * i;
            return <Line key={i} x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke={colors.border} strokeWidth={1} />;
          })}

          <Polyline points={points} fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {visible.map((d, i) =>
            shouldLabel(i) ? (
              <Circle key={i} cx={xAt(i)} cy={yAt(d.value)} r={selectedLocal === i ? 4 : 2} fill={selectedLocal === i ? colors.accent : colors.textDim} />
            ) : null
          )}

          {selectedLocal != null && selectedLocal >= 0 && selectedLocal < n && (
            <Line x1={xAt(selectedLocal)} y1={PAD.top} x2={xAt(selectedLocal)} y2={HEIGHT - PAD.bottom} stroke={colors.accent} strokeWidth={1} strokeDasharray="3,3" />
          )}
        </Svg>

        <View style={styles.xLabels}>
          {visible.map((d, i) =>
            shouldLabel(i) ? (
              <Text key={i} style={[styles.xLabel, { left: xAt(i) - 16 }]} numberOfLines={1}>
                {labelFor(d)}
              </Text>
            ) : null
          )}
        </View>

        {selectedLocal != null && selectedLocal >= 0 && selectedLocal < n && (
          <View style={[styles.tooltip, { left: Math.min(Math.max(xAt(selectedLocal) - 55, 0), width - 110) }]}>
            <Text style={styles.tooltipLabel}>{labelFor(visible[selectedLocal])}</Text>
            <Text style={styles.tooltipValue}>{formatValue(visible[selectedLocal].value)}</Text>
          </View>
        )}
      </View>

      {isZoomed && (
        <View style={styles.minimapTrack}>
          <View
            style={[
              styles.minimapWindow,
              { left: `${(view.start / (data.length - 1)) * 100}%`, width: `${((view.end - view.start) / (data.length - 1)) * 100}%` },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  toolbar: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.xs, marginBottom: spacing.sm },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: { color: colors.accent, fontSize: 16, fontWeight: "700", lineHeight: 18 },
  resetBtn: {
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  container: { width: "100%" },
  empty: { color: colors.textDim, textAlign: "center", paddingVertical: spacing.xl },
  xLabels: { height: 18 },
  xLabel: { position: "absolute", top: 0, width: 32, fontSize: 10, color: colors.textDim, textAlign: "center" },
  tooltip: {
    position: "absolute",
    top: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    width: 110,
  },
  tooltipLabel: { color: colors.textDim, fontSize: 10, textAlign: "center" },
  tooltipValue: { color: colors.text, fontSize: 12, fontWeight: "700", textAlign: "center" },
  minimapTrack: { height: 4, backgroundColor: colors.surfaceAlt, borderRadius: 2, marginTop: spacing.sm, overflow: "hidden" },
  minimapWindow: { position: "absolute", top: 0, bottom: 0, backgroundColor: colors.accent, borderRadius: 2 },
});

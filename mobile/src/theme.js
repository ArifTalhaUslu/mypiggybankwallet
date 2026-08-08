import { Platform } from "react-native";

export const colors = {
  bg: "#0b0b14",
  surface: "#16161f",
  surfaceAlt: "#1e1e2b",
  border: "#2a2a3a",
  text: "#f5f5fa",
  textDim: "#8b8ba3",
  accent: "#7c5cff",
  accentSoft: "#7c5cff22",
  mint: "#2dd9b5",
  danger: "#ff5c7a",
  success: "#2dd9b5",
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Web (PC) shouldn't stretch full browser width — cap it like a centered Bootstrap column.
export const maxContentWidth = 560;

// Fixed-order categorical palette for multi-segment charts (assets breakdown, spending
// breakdown). Never cycle/reassign per filter — color always follows the same entity.
export const CATEGORY_PALETTE = [colors.accent, colors.mint, "#ffb84d", "#ff6b9d", "#5dade2", "#a78bfa", "#f7768e", "#73daca"];

export const cardShadow = Platform.select({
  web: { boxShadow: "0 8px 24px rgba(0,0,0,0.35)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
});

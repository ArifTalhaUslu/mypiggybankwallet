import { Platform } from "react-native";
import { getToken, clearToken, notifyUnauthorized } from "../state/auth";

// Phone/Expo Go can't reach "localhost" (that's the phone itself). When phone and PC
// are on the same LAN, LAN_IP works directly. When they can't reach each other (router
// AP isolation, different subnets), TUNNEL_URL (a free Cloudflare quick tunnel pointing
// at the backend) is used instead — set via `cloudflared tunnel --url http://localhost:4000`.
const LAN_IP = "192.168.1.7"; // your PC's current LAN IP — re-check with ipconfig if it changes
const TUNNEL_URL = ""; // set to a live `cloudflared tunnel --url http://localhost:4000` URL when testing over LAN/phone

const BASE_URL = TUNNEL_URL ? `${TUNNEL_URL}/api` : `http://${Platform.OS === "web" ? "localhost" : LAN_IP}:4000/api`;

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401 && path !== "/auth/login") {
    await clearToken();
    notifyUnauthorized();
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (password) => request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),

  getConstants: () => request("/constants"),
  addConstant: (name, current) => request("/constants", { method: "POST", body: JSON.stringify({ name, current }) }),
  updateConstantName: (id, name) => request(`/constants/${id}/name`, { method: "PATCH", body: JSON.stringify({ name }) }),
  updateConstantAmount: (id, amount) =>
    request(`/constants/${id}/amount`, { method: "PATCH", body: JSON.stringify({ amount }) }),
  setConstantHistory: (id, year, amount) =>
    request(`/constants/${id}/history/${year}`, { method: "PUT", body: JSON.stringify({ amount }) }),
  deleteConstantHistory: (id, year) => request(`/constants/${id}/history/${year}`, { method: "DELETE" }),
  deleteConstant: (id) => request(`/constants/${id}`, { method: "DELETE" }),

  getMonths: () => request("/months"),
  getSpendingBreakdown: () => request("/months/breakdown"),
  getMonth: (month) => request(`/months/${month}`),
  createNextMonth: () => request("/months/next", { method: "POST" }),
  addItem: (month, item) => request(`/months/${month}/items`, { method: "POST", body: JSON.stringify(item) }),
  updateItem: (month, itemId, patch) =>
    request(`/months/${month}/items/${itemId}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteItem: (month, itemId) => request(`/months/${month}/items/${itemId}`, { method: "DELETE" }),

  getAssets: () => request("/assets"),
  addAssetEntry: (entry) => request("/assets/entries", { method: "POST", body: JSON.stringify(entry) }),
  updateAssetEntry: (id, patch) => request(`/assets/entries/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteAssetEntry: (id) => request(`/assets/entries/${id}`, { method: "DELETE" }),
};

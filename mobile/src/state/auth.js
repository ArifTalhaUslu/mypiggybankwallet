import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "piggybank_token";
let currentToken = null;
let unauthorizedHandler = () => {};

export async function loadToken() {
  currentToken = await AsyncStorage.getItem(TOKEN_KEY);
  return currentToken;
}

export async function saveToken(token) {
  currentToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  currentToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return currentToken;
}

// App.js registers this to flip back to the login screen the moment any request
// comes back 401 (expired/invalid token) — not just at cold start.
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export function notifyUnauthorized() {
  unauthorizedHandler();
}

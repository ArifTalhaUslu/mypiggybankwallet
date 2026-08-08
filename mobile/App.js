import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, Platform, StyleSheet, View, ActivityIndicator, TouchableOpacity } from "react-native";

import MonthlyScreen from "./src/screens/MonthlyScreen";
import ConstantsScreen from "./src/screens/ConstantsScreen";
import AssetsScreen from "./src/screens/AssetsScreen";
import ReportScreen from "./src/screens/ReportScreen";
import LoginScreen from "./src/screens/LoginScreen";
import { colors } from "./src/theme";
import { loadToken, clearToken, setUnauthorizedHandler } from "./src/state/auth";

const Tab = createBottomTabNavigator();

const ICONS = { Aylık: "📅", Sabitler: "📌", Varlığım: "💰", Rapor: "📊" };

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

// Thin, theme-matched scrollbar on web — the default browser scrollbar clashes with
// the dark UI. Native platforms ignore this entirely.
function useWebScrollbarStyle() {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const style = document.createElement("style");
    style.textContent = `
      * { scrollbar-width: thin; scrollbar-color: ${colors.border} transparent; }
      *::-webkit-scrollbar { width: 8px; height: 8px; }
      *::-webkit-scrollbar-track { background: transparent; }
      *::-webkit-scrollbar-thumb { background-color: ${colors.border}; border-radius: 8px; }
      *::-webkit-scrollbar-thumb:hover { background-color: ${colors.accent}; }
      html, body, #root { background-color: ${colors.bg}; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
}

export default function App() {
  useWebScrollbarStyle();
  const [authState, setAuthState] = useState("checking"); // "checking" | "out" | "in"

  useEffect(() => {
    setUnauthorizedHandler(() => setAuthState("out"));
    loadToken().then((token) => setAuthState(token ? "in" : "out"));
  }, []);

  if (authState === "checking") {
    return (
      <View style={styles.loadingPage}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (authState === "out") {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLoggedIn={() => setAuthState("in")} />
      </>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{ICONS[route.name]}</Text>
          ),
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textDim,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          tabBarStyle: styles.tabBar,
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={async () => {
                await clearToken();
                setAuthState("out");
              }}
            >
              <Text style={styles.logoutBtnText}>Çıkış</Text>
            </TouchableOpacity>
          ),
        })}
      >
        <Tab.Screen name="Aylık" component={MonthlyScreen} />
        <Tab.Screen name="Sabitler" component={ConstantsScreen} />
        <Tab.Screen name="Varlığım" component={AssetsScreen} />
        <Tab.Screen name="Rapor" component={ReportScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingPage: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  logoutBtn: { paddingHorizontal: 16 },
  logoutBtnText: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 64,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabItem: { paddingVertical: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, elevation: 0, shadowOpacity: 0 },
  headerTitle: { fontWeight: "800", fontSize: 18 },
});

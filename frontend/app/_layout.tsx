import React from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider } from "@/src/auth";
import { FeedbackProvider } from "@/src/feedback";
import { Loading } from "@/src/ui";
import { colors } from "@/src/theme";

export default function RootLayout() {
  const [loaded] = useFonts({ Lucide: require("@react-native-vector-icons/lucide/fonts/Lucide.ttf") });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <AuthProvider>
            <FeedbackProvider>
              <StatusBar style="dark" />
              {!loaded ? <Loading /> : (
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
              )}
            </FeedbackProvider>
          </AuthProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

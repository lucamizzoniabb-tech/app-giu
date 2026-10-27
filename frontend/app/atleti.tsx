import React from "react";
import { View } from "react-native";
import { colors, spacing } from "@/src/theme";
import { Header, Pad, Screen } from "@/src/ui";
import { Guard } from "@/src/auth";
import { AtletiManager } from "@/src/components/managers";

export default function Atleti() {
  return (
    <Guard roles={["ADMIN", "GIUDICE"]}>
      <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
        <Header back title="Database atleti" />
        <Screen><Pad style={{ paddingTop: spacing.lg }}><AtletiManager /></Pad></Screen>
      </View>
    </Guard>
  );
}

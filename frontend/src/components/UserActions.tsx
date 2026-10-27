import React from "react";
import { useRouter } from "expo-router";
import { useAuth, homeFor } from "@/src/auth";
import { Btn } from "@/src/ui";

export function UserActions({ hidePanel }: { hidePanel?: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return <Btn small title="Area Giudici" onPress={() => router.push("/login")} testID="area-giudici-btn" />;
  return (
    <>
      {!hidePanel && <Btn small variant="outline" icon="layout-dashboard" title={user.role} onPress={() => router.push(homeFor(user) as any)} testID="topbar-panel-btn" />}
      <Btn small variant="ghost" icon="log-out" onPress={async () => { await logout(); router.replace("/"); }} testID="logout-btn" />
    </>
  );
}

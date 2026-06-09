import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./lib/session";
import { AuthScreen } from "./screens/AuthScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ChildHomeScreen } from "./screens/ChildHomeScreen";
import { ApprovalQueueScreen } from "./screens/ApprovalQueueScreen";
import { ScreenTimeQueueScreen } from "./screens/ScreenTimeQueueScreen";
import { InboxScreen } from "./screens/InboxScreen";
import { WalletScreen } from "./screens/WalletScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { MissionDetailScreen } from "./screens/MissionDetailScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ResetPasswordScreen } from "./screens/ResetPasswordScreen";
import { JoinScreen } from "./screens/JoinScreen";
import { C } from "./design/tokens";

export function App() {
  const { loading, user, childId, recovery } = useSession();

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: C.muted }}>Laddar…</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public — reachable without auth so kids can accept invites */}
        <Route path="/join" element={<JoinScreen />} />

        {recovery && user ? (
          <Route path="*" element={<ResetPasswordScreen />} />
        ) : !user ? (
          <Route path="*" element={<AuthScreen />} />
        ) : (
          <>
            <Route
              path="/"
              element={childId ? <ChildHomeScreen childId={childId} /> : <HomeScreen />}
            />
            <Route path="/wallet/:childId" element={<WalletScreen />} />
            <Route path="/leaderboard" element={<LeaderboardScreen />} />
            <Route
              path="/child/:childId/mission/:missionId"
              element={<MissionDetailScreen />}
            />
            {/* Parent-only routes — in child mode they redirect home. */}
            <Route
              path="/inbox"
              element={childId ? <Navigate to="/" replace /> : <InboxScreen />}
            />
            <Route
              path="/approve"
              element={childId ? <Navigate to="/" replace /> : <ApprovalQueueScreen />}
            />
            <Route
              path="/settings"
              element={childId ? <Navigate to="/" replace /> : <SettingsScreen />}
            />
            <Route
              path="/screentime"
              element={childId ? <Navigate to="/" replace /> : <ScreenTimeQueueScreen />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

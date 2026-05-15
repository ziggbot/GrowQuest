import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSession } from "./lib/session";
import { AuthScreen } from "./screens/AuthScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ApprovalQueueScreen } from "./screens/ApprovalQueueScreen";
import { WalletScreen } from "./screens/WalletScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { C } from "./design/tokens";

export function App() {
  const { loading, user } = useSession();

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: C.muted }}>Laddar…</span>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/approve" element={<ApprovalQueueScreen />} />
        <Route path="/wallet/:childId" element={<WalletScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

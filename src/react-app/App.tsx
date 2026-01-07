import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@/react-app/contexts/AuthContext";
import { ChampionshipProvider } from "@/react-app/contexts/ChampionshipContext";
import RequireChampionship from "@/react-app/components/RequireChampionship";
import Ranking from "@/react-app/pages/Ranking";
import Players from "@/react-app/pages/Players";
import Rounds from "@/react-app/pages/Rounds";
import Settings from "@/react-app/pages/Settings";
import LiveGame from "@/react-app/pages/LiveGame";
import Login from "@/react-app/pages/Login";
import Register from "@/react-app/pages/Register";
import QuickSetup from "@/react-app/pages/QuickSetup";
import WelcomeScreen from "@/react-app/pages/WelcomeScreen";

export default function App() {
  return (
    <AuthProvider>
      <ChampionshipProvider>
        <Router>
          <RequireChampionship>
            <Routes>
              <Route path="/" element={<Ranking />} />
              <Route path="/players" element={<Players />} />
              <Route path="/rounds" element={<Rounds />} />
              <Route path="/live" element={<LiveGame />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/quick-setup" element={<QuickSetup />} />
              <Route path="/welcome" element={<WelcomeScreen />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </RequireChampionship>
        </Router>
      </ChampionshipProvider>
    </AuthProvider>
  );
}

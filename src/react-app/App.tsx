import { BrowserRouter as Router, Routes, Route } from "react-router";
import Ranking from "@/react-app/pages/Ranking";
import Players from "@/react-app/pages/Players";
import Rounds from "@/react-app/pages/Rounds";
import Settings from "@/react-app/pages/Settings";
import LiveGame from "@/react-app/pages/LiveGame";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Ranking />} />
        <Route path="/players" element={<Players />} />
        <Route path="/rounds" element={<Rounds />} />
        <Route path="/live" element={<LiveGame />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

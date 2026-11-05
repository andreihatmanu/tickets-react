import { Navigate, Route, Routes } from "react-router-dom";
import { TicketsPage } from "./pages/TicketsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/teams/:teamId/tickets" element={<TicketsPage />} />
      <Route path="*" element={<Navigate to="/teams/demo/tickets?offset=0" replace />} />
    </Routes>
  );
}

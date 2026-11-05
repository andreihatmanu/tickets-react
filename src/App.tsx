import { Navigate, Route, Routes } from "react-router-dom";
import { TicketsPage } from "./features/tickets/TicketsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/teams/:teamId/tickets" element={<TicketsPage />} />
      <Route path="*" element={<Navigate to="/teams/demo/tickets" replace />} />
    </Routes>
  );
}

import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { TicketsPage } from "./pages/TicketsPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import type { ProfileId } from "./features/tickets/services/ticket.service";

export default function App() {
  const [profile, setProfile] = useState<ProfileId>("developer");
  return <>
    <Routes>
      <Route path="/" element={<TicketsPage profile={profile} setProfile={setProfile} />} />
      <Route path="/tickets/:ticketId" element={<TicketDetailPage profile={profile} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <ToastContainer position="top-center" autoClose={5000} theme="light" />
  </>;
}

import { Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { TicketsPage } from "./pages/TicketsPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<TicketsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer position="top-center" autoClose={5000} theme="light" />
    </>
  );
}

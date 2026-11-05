import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TicketsPage } from "./pages/TicketsPage";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/teams/:teamId/tickets" element={<TicketsPage />} />
        <Route path="*" element={<Navigate to="/teams/demo/tickets?offset=0" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

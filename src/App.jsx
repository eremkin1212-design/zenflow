import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./theme";
import { AuthProvider, useAuth } from "./auth";
import Login from "./screens/Login";
import ResetPassword from "./screens/ResetPassword";
import Dashboard from "./screens/Dashboard";
import Calendar from "./screens/Calendar";
import ClientsList from "./screens/ClientsList";
import ClientCard from "./screens/ClientCard";
import ClientForm from "./screens/ClientForm";
import AppointmentForm from "./screens/AppointmentForm";
import Finance from "./screens/Finance";
import Settings from "./screens/Settings";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center text-sm text-[var(--ink-soft)]">Загрузка…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Routed() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!loading && user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><Calendar /></RequireAuth>} />
      <Route path="/clients" element={<RequireAuth><ClientsList /></RequireAuth>} />
      <Route path="/clients/new" element={<RequireAuth><ClientForm /></RequireAuth>} />
      <Route path="/clients/:id" element={<RequireAuth><ClientCard /></RequireAuth>} />
      <Route path="/appointment/:mode" element={<RequireAuth><AppointmentForm /></RequireAuth>} />
      <Route path="/finance" element={<RequireAuth><Finance /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routed />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

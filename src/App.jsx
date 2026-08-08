import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme";
import Dashboard from "./screens/Dashboard";
import Calendar from "./screens/Calendar";
import ClientsList from "./screens/ClientsList";
import ClientCard from "./screens/ClientCard";
import AppointmentForm from "./screens/AppointmentForm";
import Finance from "./screens/Finance";
import Settings from "./screens/Settings";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/clients" element={<ClientsList />} />
          <Route path="/clients/:id" element={<ClientCard />} />
          <Route path="/appointment/:mode" element={<AppointmentForm />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

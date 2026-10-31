import { Routes, Route } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import InvestigationWorkspace from "@/pages/InvestigationWorkspace";
import Investigations from "@/pages/Investigations";
import Settings from "@/pages/Settings";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/investigations" element={<Investigations />} />
        <Route path="/investigation/:id" element={<InvestigationWorkspace />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

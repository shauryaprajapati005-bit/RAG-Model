import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, CircleHelp, FileText, GitBranch, LayoutDashboard, Menu, MessageSquare, Moon, Network, Plus, Search, Settings, Shield, Sparkles, Timeline, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { seedDocuments, seedInvestigations } from "@/data/mockData";
import type { DocumentItem, Investigation } from "@/types";

interface AppContextValue {
  investigations: Investigation[];
  documents: DocumentItem[];
  addInvestigation: (input: Pick<Investigation, "name" | "description">) => Investigation;
  addDocuments: (files: DocumentItem[]) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, patch: Partial<DocumentItem>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useAppState = () => {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppState must be used inside AppShell");
  return value;
};

const navItems = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "Investigations", to: "/investigations", icon: Shield },
  { label: "Documents", to: "/documents", icon: FileText },
  { label: "AI Assistant", to: "/investigation/inv-orion-001?tab=assistant", icon: MessageSquare },
  { label: "Evidence Graph", to: "/investigation/inv-orion-001?tab=graph", icon: GitBranch },
  { label: "Timeline", to: "/investigation/inv-orion-001?tab=timeline", icon: Timeline },
  { label: "Settings", to: "/settings", icon: Settings },
];

/* ── Mobile drawer (reuses old sidebar nav items for mobile) ── */
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <>
    {open && <button aria-label="Close navigation" data-testid="mobile-nav-backdrop" onClick={onClose} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-[#263449] bg-[#0D1425] transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} lg:hidden`}>
      <div className="flex h-16 items-center justify-between border-b border-[#263449] px-5">
        <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3" data-testid="brand-home-link">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400 text-[#07111f] shadow-[0_0_24px_rgba(34,211,238,.18)]"><Network size={19} strokeWidth={2.5} /></div>
          <div><div className="text-[15px] font-semibold tracking-wide text-slate-100">CaseConnect</div><div className="font-mono text-[9px] uppercase tracking-[.18em] text-cyan-300/70">Intelligence OS</div></div>
        </Link>
        <button data-testid="mobile-nav-close-button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-[#19253A] hover:text-slate-200"><X size={17} /></button>
      </div>
      <div className="px-3 pt-6">
        <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-slate-600">Workspace</div>
        <nav className="space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} onClick={onClose} data-testid={`nav-${label.toLowerCase().replaceAll(" ", "-")}-link`} className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${isActive ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/10" : "text-slate-400 hover:bg-[#19253A] hover:text-slate-100"}`}><Icon size={17} className="shrink-0" /><span>{label}</span>{label === "AI Assistant" && <span className="ml-auto rounded bg-violet-400/15 px-1.5 py-0.5 font-mono text-[9px] text-violet-300">BETA</span>}</NavLink>)}
        </nav>
      </div>
      <div className="mt-auto p-3">
        <div className="rounded-xl border border-[#263449] bg-[#131D30] p-3">
          <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">Demo environment</span></div>
          <p className="text-[11px] leading-relaxed text-slate-500">Evidence is fictional and for demonstration only.</p>
        </div>
      </div>
    </aside>
  </>;
}

/* ── Horizontal top navigation bar ── */
function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#263449] bg-[#0D1425] px-4 sm:px-6 lg:px-8">
      {/* Left side: Logo and navigation links */}
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400 text-[#07111f] shadow-[0_0_24px_rgba(34,211,238,.18)]">
            <Network size={19} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-slate-100">CaseConnect</span>
        </Link>
        {/* Navigation links - hidden on mobile */}
        <nav className="hidden gap-4 lg:flex">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1 text-sm ${isActive ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"}`
              }
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Right side: Search, notifications, profile */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenu}
          data-testid="mobile-menu-button"
          className="rounded-lg p-2 text-slate-400 hover:bg-[#19253A] hover:text-white lg:hidden"
        >
          <Menu size={20} />
        </button>
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <Input
            data-testid="global-search-input"
            placeholder="Search workspace..."
            className="h-9 w-48 border-[#263449] bg-[#131D30] pl-9 text-xs text-slate-200 placeholder:text-slate-600 focus-visible:ring-cyan-400/40 lg:w-60"
          />
        </div>
        {/* Notifications */}
        <button
          data-testid="notifications-button"
          className="relative rounded-lg p-2 text-slate-400 hover:bg-[#19253A] hover:text-slate-100"
        >
          <Bell size={17} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
        </button>
        {/* Profile */}
        <div className="hidden h-7 w-px bg-[#263449] sm:block" />
        <button
          data-testid="profile-menu-button"
          className="flex items-center gap-2 rounded-lg p-1 hover:bg-[#19253A]"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400 to-cyan-400 text-xs font-bold text-[#0B1020]">
            SV
          </div>
          <span className="hidden text-xs font-medium text-slate-300 lg:block">S. Vance</span>
        </button>
      </div>
    </header>
  );
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [investigations, setInvestigations] = useState(seedInvestigations);
  const [documents, setDocuments] = useState(seedDocuments);
  const addInvestigation = (input: Pick<Investigation, "name" | "description">) => { const next: Investigation = { id: `inv-${Date.now()}`, ...input, status: "Active", priority: "Medium", documentCount: 0, entityCount: 0, updatedAt: "Just now" }; setInvestigations((current) => [next, ...current]); return next; };
  const value = useMemo<AppContextValue>(() => ({ investigations, documents, addInvestigation, addDocuments: (files) => setDocuments((current) => [...files, ...current]), removeDocument: (id) => setDocuments((current) => current.filter((doc) => doc.id !== id)), updateDocument: (id, patch) => setDocuments((current) => current.map((doc) => doc.id === id ? { ...doc, ...patch } : doc)) }), [investigations, documents]);
  return <AppContext.Provider value={value}><div className="min-h-svh bg-[#0B1020] text-slate-100"><MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} /><Topbar onMenu={() => setMobileOpen(true)} /><main className="mx-auto w-full max-w-[1560px] p-4 sm:p-7"><Outlet /></main></div></AppContext.Provider>;
}

export const statusIcon = <CircleHelp size={14} />;

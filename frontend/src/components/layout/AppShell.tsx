import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, CircleHelp, FileText, GitBranch, LayoutDashboard, Menu, MessageSquare, Network, Search, Settings, Shield, Timeline, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { seedDocuments, seedInvestigations } from "@/data/mockData";
import { fetchInvestigations, fetchDocuments, createInvestigationApi, deleteDocumentApi } from "@/services/api";
import type { DocumentItem, Investigation } from "@/types";

interface AppContextValue {
  investigations: Investigation[];
  documents: DocumentItem[];
  addInvestigation: (input: Pick<Investigation, "name" | "description">) => Investigation;
  addDocuments: (files: DocumentItem[]) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, patch: Partial<DocumentItem>) => void;
  refreshState: () => void;
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

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/investigations": "Investigations",
  "/documents": "Document library",
  "/settings": "Settings",
};

function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onClose: () => void }) {
  return <>
    {mobileOpen && <button aria-label="Close navigation" data-testid="mobile-nav-backdrop" onClick={onClose} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-[#263449] bg-[#0D1425] transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-[82px]" : ""}`}>
      <div className={`flex h-20 items-center border-b border-[#263449] px-5 ${collapsed ? "lg:justify-center lg:px-0" : "justify-between"}`}>
        <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3" data-testid="brand-home-link">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400 text-[#07111f] shadow-[0_0_24px_rgba(34,211,238,.18)]"><Network size={19} strokeWidth={2.5} /></div>
          <div className={`${collapsed ? "lg:hidden" : ""}`}><div className="text-[15px] font-semibold tracking-wide text-slate-100">CaseConnect</div><div className="font-mono text-[9px] uppercase tracking-[.18em] text-cyan-300/70">Intelligence OS</div></div>
        </Link>
        <button data-testid="mobile-nav-close-button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-[#19253A] hover:text-slate-200 lg:hidden"><X size={17} /></button>
      </div>
      <div className={`px-3 pt-6 ${collapsed ? "lg:px-2" : ""}`}>
        <div className={`mb-3 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-slate-600 ${collapsed ? "lg:hidden" : ""}`}>Workspace</div>
        <nav className="space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} onClick={onClose} data-testid={`nav-${label.toLowerCase().replaceAll(" ", "-")}-link`} className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${isActive ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/10" : "text-slate-400 hover:bg-[#19253A] hover:text-slate-100"}`}><Icon size={17} className="shrink-0" /><span className={`${collapsed ? "lg:hidden" : ""}`}>{label}</span>{label === "AI Assistant" && <span className={`ml-auto rounded bg-violet-400/15 px-1.5 py-0.5 font-mono text-[9px] text-violet-300 ${collapsed ? "lg:hidden" : ""}`}>BETA</span>}</NavLink>)}
        </nav>
      </div>
      <div className={`mt-auto p-3 ${collapsed ? "lg:px-2" : ""}`}>
        <div className={`rounded-xl border border-[#263449] bg-[#131D30] p-3 ${collapsed ? "lg:hidden" : ""}`}>
          <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">Atlas Connected</span></div>
          <p className="text-[11px] leading-relaxed text-slate-500">Live MongoDB Atlas cluster connected for document ingestion & vector intelligence.</p>
        </div>
        <button onClick={onToggle} data-testid="sidebar-collapse-button" className="mt-3 hidden w-full items-center justify-center gap-2 rounded-lg border border-[#263449] py-2 text-xs text-slate-500 hover:bg-[#19253A] hover:text-slate-200 lg:flex">{collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /> Collapse sidebar</>}</button>
      </div>
    </aside>
  </>;
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const location = useLocation();
  const title = location.pathname.startsWith("/investigation/") ? "Investigation workspace" : pageTitles[location.pathname] ?? "Overview";
  return <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#263449] bg-[#0B1020]/90 px-4 backdrop-blur-md sm:px-7">
    <div className="flex min-w-0 items-center gap-3"><button onClick={onMenu} data-testid="mobile-menu-button" className="rounded-lg p-2 text-slate-400 hover:bg-[#19253A] hover:text-white lg:hidden"><Menu size={20} /></button><div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-slate-600"><span>CASECONNECT</span><span className="text-slate-700">/</span><span className="text-cyan-400/80">{title}</span></div><h1 className="mt-1 truncate text-lg font-semibold text-slate-100 sm:text-xl">{title}</h1></div></div>
    <div className="flex items-center gap-2 sm:gap-4"><div className="relative hidden md:block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><Input data-testid="global-search-input" placeholder="Search workspace..." className="h-9 w-48 border-[#263449] bg-[#131D30] pl-9 text-xs text-slate-200 placeholder:text-slate-600 focus-visible:ring-cyan-400/40 lg:w-60" /></div><button data-testid="notifications-button" className="relative rounded-lg p-2 text-slate-400 hover:bg-[#19253A] hover:text-slate-100"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" /></button><div className="hidden h-7 w-px bg-[#263449] sm:block" /><button data-testid="profile-menu-button" className="flex items-center gap-2 rounded-lg p-1 hover:bg-[#19253A]"><div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400 to-cyan-400 text-xs font-bold text-[#0B1020]">SV</div><span className="hidden text-xs font-medium text-slate-300 lg:block">S. Vance</span></button></div>
  </header>;
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [investigations, setInvestigations] = useState(seedInvestigations);
  const [documents, setDocuments] = useState(seedDocuments);

  const loadData = () => {
    fetchInvestigations()
      .then((data) => {
        if (data && data.length > 0) setInvestigations(data);
      })
      .catch((err) => console.warn("Failed to load investigations:", err));

    fetchDocuments()
      .then((data) => {
        if (data && data.length > 0) {
          // Merge or set documents from MongoDB
          setDocuments(data);
        }
      })
      .catch((err) => console.warn("Failed to load documents:", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const addInvestigation = (input: Pick<Investigation, "name" | "description">) => {
    const tempId = `inv-${Date.now()}`;
    const next: Investigation = { id: tempId, ...input, status: "Active", priority: "Medium", documentCount: 0, entityCount: 0, updatedAt: "Just now" };
    setInvestigations((current) => [next, ...current]);

    createInvestigationApi(input)
      .then((saved) => {
        setInvestigations((current) => current.map((item) => item.id === tempId ? saved : item));
      })
      .catch((err) => console.error("Error creating investigation in backend:", err));

    return next;
  };

  const removeDocument = (id: string) => {
    setDocuments((current) => current.filter((doc) => doc.id !== id));
    deleteDocumentApi(id).catch((err) => console.error("Error deleting document in backend:", err));
  };

  const value = useMemo<AppContextValue>(() => ({
    investigations,
    documents,
    addInvestigation,
    addDocuments: (files) => setDocuments((current) => [...files, ...current]),
    removeDocument,
    updateDocument: (id, patch) => setDocuments((current) => current.map((doc) => doc.id === id ? { ...doc, ...patch } : doc)),
    refreshState: loadData,
  }), [investigations, documents]);

  return <AppContext.Provider value={value}><div className="min-h-svh bg-[#0B1020] text-slate-100"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} /><div className={`min-h-svh transition-[padding] duration-200 lg:pl-[264px] ${collapsed ? "lg:pl-[82px]" : ""}`}><Topbar onMenu={() => setMobileOpen(true)} /><main className="mx-auto w-full max-w-[1560px] p-4 sm:p-7"><Outlet /></main></div></div></AppContext.Provider>;
}

export const statusIcon = <CircleHelp size={14} />;

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  FileText,
  GitBranch,
  LayoutDashboard,
  Menu,
  Network,
  Search,
  Settings,
  Shield,
  X,
} from "lucide-react";
import {
  fetchInvestigations,
  fetchDocuments,
  createInvestigationApi,
  updateInvestigationApi,
  deleteDocumentApi,
} from "@/services/api";
import type { DocumentItem, Investigation } from "@/types";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { NotificationCenter } from "./NotificationCenter";
import { ProfileMenu } from "./ProfileMenu";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";

interface AppContextValue {
  investigations: Investigation[];
  documents: DocumentItem[];
  addInvestigation: (input: Pick<Investigation, "name" | "description">) => Investigation;
  updateInvestigation: (id: string, patch: Partial<Investigation>) => Promise<void>;
  addDocuments: (files: DocumentItem[]) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, patch: Partial<DocumentItem>) => void;
  refreshState: () => void;
  openDocumentViewer: (doc: DocumentItem) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useAppState = () => {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppState must be used inside AppShell");
  return value;
};

function Navbar({
  mobileOpen,
  setMobileOpen,
  onOpenSearch,
  notifOpen,
  setNotifOpen,
  profileOpen,
  setProfileOpen,
  unreadCount,
  investigations,
  documents,
  onOpenDocument,
  onSelectInvestigation,
  setUnreadCount,
  refreshState,
}: {
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenSearch: () => void;
  notifOpen: boolean;
  setNotifOpen: React.Dispatch<React.SetStateAction<boolean>>;
  profileOpen: boolean;
  setProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
  investigations: Investigation[];
  documents: DocumentItem[];
  onOpenDocument: (doc: DocumentItem) => void;
  onSelectInvestigation: (id: string) => void;
  setUnreadCount: (n: number) => void;
  refreshState: () => void;
}) {
  const location = useLocation();

  // Check if workspace route or case route is active
  const isWorkspaceActive =
    location.pathname === "/workspace" || location.pathname.startsWith("/investigation/");

  return (
    <header className="sticky top-0 z-40 border-b border-[#263449] bg-[#0B1020]/95 backdrop-blur-md">
      {/* Navbar Container with Increased Size (h-20 / 80px) */}
      <div className="mx-auto flex h-20 max-w-[1720px] items-center justify-between px-4 sm:px-8">
        {/* LEFT: Bigger Brand Logo & Name */}
        <div className="flex items-center shrink-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-3.5 group"
            data-testid="brand-home-link"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400 text-[#07111f] shadow-[0_0_22px_rgba(34,211,238,0.35)] transition-transform group-hover:scale-105 shrink-0">
              <Network size={22} strokeWidth={2.6} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                  CaseConnect
                </span>
                <span className="hidden sm:inline-block rounded-md bg-cyan-400/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300 border border-cyan-400/30">
                  OS
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70 -mt-0.5">
                Intelligence Platform
              </span>
            </div>
          </Link>
        </div>

        {/* CENTER: Exactly 5 Centered Navigation Options (Direct Links - No Hover Section) */}
        <nav className="hidden lg:flex items-center justify-center gap-2 flex-1 px-4">
          {/* 1. Overview */}
          <NavLink
            to="/dashboard"
            data-testid="nav-overview-link"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25 font-semibold shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                  : "text-slate-300 hover:bg-[#19253A] hover:text-white"
              }`
            }
          >
            <LayoutDashboard size={16} />
            <span>Overview</span>
          </NavLink>

          {/* 2. Investigations */}
          <NavLink
            to="/investigations"
            data-testid="nav-investigations-link"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25 font-semibold shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                  : "text-slate-300 hover:bg-[#19253A] hover:text-white"
              }`
            }
          >
            <Shield size={16} />
            <span>Investigations</span>
          </NavLink>

          {/* 3. Documents */}
          <NavLink
            to="/documents"
            data-testid="nav-documents-link"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25 font-semibold shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                  : "text-slate-300 hover:bg-[#19253A] hover:text-white"
              }`
            }
          >
            <FileText size={16} />
            <span>Documents</span>
          </NavLink>

          {/* 4. Workspace (Direct Page Link - Opens all investigations to launch AI Assistant & Graph) */}
          <NavLink
            to="/workspace"
            data-testid="nav-workspace-link"
            className={() =>
              `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                isWorkspaceActive
                  ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25 font-semibold shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                  : "text-slate-300 hover:bg-[#19253A] hover:text-white"
              }`
            }
          >
            <GitBranch size={16} />
            <span>Workspace</span>
          </NavLink>

          {/* 5. Settings */}
          <NavLink
            to="/settings"
            data-testid="nav-settings-link"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25 font-semibold shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                  : "text-slate-300 hover:bg-[#19253A] hover:text-white"
              }`
            }
          >
            <Settings size={16} />
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* RIGHT: Tools, Search, Notifications & Profile */}
        <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Atlas Live Status (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
              Atlas Live
            </span>
          </div>

          {/* Global Search Input */}
          <div
            onClick={onOpenSearch}
            data-testid="global-search-trigger"
            className="relative hidden md:flex items-center cursor-pointer group"
          >
            <Search
              size={14}
              className="absolute left-3 text-slate-500 group-hover:text-cyan-300 transition-colors"
            />
            <input
              readOnly
              placeholder="Search workspace..."
              data-testid="global-search-input"
              className="h-9 w-40 cursor-pointer rounded-xl border border-[#263449] bg-[#131D30] pl-9 pr-12 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-colors group-hover:border-[#3a4a63] group-hover:bg-[#162238] lg:w-48 xl:w-56"
            />
            <div className="absolute right-2 flex items-center gap-0.5 rounded border border-[#263449] bg-[#0D1425] px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
              <span>Ctrl</span>
              <span>K</span>
            </div>
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={onOpenSearch}
            data-testid="mobile-search-button"
            className="rounded-xl p-2 text-slate-400 hover:bg-[#19253A] hover:text-slate-100 md:hidden"
            title="Search workspace (Ctrl+K)"
          >
            <Search size={18} />
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            data-testid="notifications-button"
            className={`relative rounded-xl p-2 transition-colors ${
              notifOpen
                ? "bg-[#19253A] text-cyan-300 ring-1 ring-cyan-400/30"
                : "text-slate-400 hover:bg-[#19253A] hover:text-slate-100"
            }`}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}
          </button>

          <div className="hidden h-7 w-px bg-[#263449] sm:block" />

          {/* Profile Menu Button */}
          <button
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            data-testid="profile-menu-button"
            className={`flex items-center gap-2.5 rounded-xl p-1.5 transition-colors ${
              profileOpen
                ? "bg-[#19253A] ring-1 ring-cyan-400/30"
                : "hover:bg-[#19253A]"
            }`}
            title="Investigator Profile & Telemetry"
          >
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400 to-cyan-400 text-xs font-bold text-[#0B1020]">
              IN
            </div>
            <span className="hidden text-xs font-medium text-slate-300 lg:block">
              Investigator
            </span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            data-testid="mobile-menu-button"
            className="rounded-xl p-2 text-slate-400 hover:bg-[#19253A] hover:text-white lg:hidden"
            title="Toggle Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Anchored Popovers */}
          <NotificationCenter
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            investigations={investigations}
            documents={documents}
            onOpenDocument={onOpenDocument}
            onSelectInvestigation={onSelectInvestigation}
            unreadCount={unreadCount}
            setUnreadCount={setUnreadCount}
          />

          <ProfileMenu
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            investigationsCount={investigations.length}
            documentsCount={documents.length}
            onRefreshData={refreshState}
          />
        </div>
      </div>

      {/* Mobile Navigation Dropdown when open */}
      {mobileOpen && (
        <div className="border-t border-[#263449] bg-[#0D1425] p-4 lg:hidden animate-in fade-in slide-in-from-top-1">
          <div className="space-y-2">
            <NavLink
              to="/dashboard"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-cyan-400/15 text-cyan-300 font-semibold"
                    : "text-slate-300 hover:bg-[#19253A]"
                }`
              }
            >
              <LayoutDashboard size={17} />
              <span>Overview</span>
            </NavLink>

            <NavLink
              to="/investigations"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-cyan-400/15 text-cyan-300 font-semibold"
                    : "text-slate-300 hover:bg-[#19253A]"
                }`
              }
            >
              <Shield size={17} />
              <span>Investigations</span>
            </NavLink>

            <NavLink
              to="/documents"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-cyan-400/15 text-cyan-300 font-semibold"
                    : "text-slate-300 hover:bg-[#19253A]"
                }`
              }
            >
              <FileText size={17} />
              <span>Documents</span>
            </NavLink>

            <NavLink
              to="/workspace"
              onClick={() => setMobileOpen(false)}
              className={() =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isWorkspaceActive
                    ? "bg-cyan-400/15 text-cyan-300 font-semibold"
                    : "text-slate-300 hover:bg-[#19253A]"
                }`
              }
            >
              <GitBranch size={17} />
              <span>Workspace</span>
            </NavLink>

            <NavLink
              to="/settings"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-cyan-400/15 text-cyan-300 font-semibold"
                    : "text-slate-300 hover:bg-[#19253A]"
                }`
              }
            >
              <Settings size={17} />
              <span>Settings</span>
            </NavLink>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#263449] pt-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-300">
                Atlas Connected
              </span>
            </div>
            <span className="text-[10px] text-slate-500">CaseConnect Intelligence OS</span>
          </div>
        </div>
      )}
    </header>
  );
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);

  // Topbar interactive states
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const navigate = useNavigate();

  const loadData = () => {
    fetchInvestigations()
      .then((data) => {
        if (Array.isArray(data)) setInvestigations(data);
      })
      .catch((err) => console.warn("Failed to load investigations:", err));

    fetchDocuments()
      .then((data) => {
        if (Array.isArray(data)) setDocuments(data);
      })
      .catch((err) => console.warn("Failed to load documents:", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addInvestigation = (input: Pick<Investigation, "name" | "description">) => {
    const tempId = `inv-${Date.now()}`;
    const next: Investigation = {
      id: tempId,
      ...input,
      status: "Active",
      priority: "Medium",
      documentCount: 0,
      entityCount: 0,
      updatedAt: "Just now",
    };
    setInvestigations((current) => [next, ...current]);

    createInvestigationApi(input)
      .then((saved) => {
        setInvestigations((current) =>
          current.map((item) => (item.id === tempId ? saved : item))
        );
      })
      .catch((err) => console.error("Error creating investigation in backend:", err));

    return next;
  };

  const updateInvestigation = async (id: string, patch: Partial<Investigation>) => {
    setInvestigations((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    try {
      const updated = await updateInvestigationApi(id, patch);
      setInvestigations((current) =>
        current.map((item) => (item.id === id ? updated : item))
      );
    } catch (err) {
      console.error("Error updating investigation:", err);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments((current) => current.filter((doc) => doc.id !== id));
    deleteDocumentApi(id).catch((err) =>
      console.error("Error deleting document in backend:", err)
    );
  };

  const value = useMemo<AppContextValue>(
    () => ({
      investigations,
      documents,
      addInvestigation,
      updateInvestigation,
      addDocuments: (files) => setDocuments((current) => [...files, ...current]),
      removeDocument,
      updateDocument: (id, patch) =>
        setDocuments((current) =>
          current.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc))
        ),
      refreshState: loadData,
      openDocumentViewer: (doc: DocumentItem) => setViewingDocument(doc),
    }),
    [investigations, documents]
  );

  return (
    <AppContext.Provider value={value}>
      <div className="min-h-svh bg-[#0B1020] text-slate-100 flex flex-col">
        {/* Top Horizontal Navbar */}
        <Navbar
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          onOpenSearch={() => setSearchOpen(true)}
          notifOpen={notifOpen}
          setNotifOpen={setNotifOpen}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          unreadCount={unreadCount}
          investigations={investigations}
          documents={documents}
          onOpenDocument={(doc) => setViewingDocument(doc)}
          onSelectInvestigation={(id) => navigate(`/investigation/${id}`)}
          setUnreadCount={setUnreadCount}
          refreshState={loadData}
        />

        {/* Full-Width Workspace Main Body */}
        <main className="mx-auto w-full max-w-[1680px] flex-1 p-4 sm:p-7">
          <Outlet />
        </main>

        {/* Global Search Modal */}
        <GlobalSearchModal
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          investigations={investigations}
          documents={documents}
          onOpenDocument={(doc) => setViewingDocument(doc)}
        />

        {/* Global Document Viewer Modal */}
        <DocumentViewerModal
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      </div>
    </AppContext.Provider>
  );
}

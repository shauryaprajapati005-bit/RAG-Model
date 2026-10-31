import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitBranch,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Network,
  Search,
  Settings,
  Shield,
  Timeline,
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

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/investigations": "Investigations",
  "/documents": "Document library",
  "/settings": "Settings",
};

function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onClose,
  firstInvId,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onClose: () => void;
  firstInvId?: string;
}) {
  const navItems = [
    { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
    { label: "Investigations", to: "/investigations", icon: Shield },
    { label: "Documents", to: "/documents", icon: FileText },
    {
      label: "AI Assistant",
      to: firstInvId ? `/investigation/${firstInvId}?tab=assistant` : "/investigations",
      icon: MessageSquare,
    },
    {
      label: "Evidence Graph",
      to: firstInvId ? `/investigation/${firstInvId}?tab=graph` : "/investigations",
      icon: GitBranch,
    },
    {
      label: "Timeline",
      to: firstInvId ? `/investigation/${firstInvId}?tab=timeline` : "/investigations",
      icon: Timeline,
    },
    { label: "Settings", to: "/settings", icon: Settings },
  ];

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          data-testid="mobile-nav-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-[#263449] bg-[#0D1425] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[82px]" : ""}`}
      >
        <div
          className={`flex h-20 items-center border-b border-[#263449] px-5 ${
            collapsed ? "lg:justify-center lg:px-0" : "justify-between"
          }`}
        >
          <Link
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
            data-testid="brand-home-link"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400 text-[#07111f] shadow-[0_0_24px_rgba(34,211,238,.18)]">
              <Network size={19} strokeWidth={2.5} />
            </div>
            <div className={`${collapsed ? "lg:hidden" : ""}`}>
              <div className="text-[15px] font-semibold tracking-wide text-slate-100">
                CaseConnect
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[.18em] text-cyan-300/70">
                Intelligence OS
              </div>
            </div>
          </Link>
          <button
            data-testid="mobile-nav-close-button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-[#19253A] hover:text-slate-200 lg:hidden"
          >
            <X size={17} />
          </button>
        </div>
        <div className={`px-3 pt-6 ${collapsed ? "lg:px-2" : ""}`}>
          <div
            className={`mb-3 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-slate-600 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                onClick={onClose}
                data-testid={`nav-${label.toLowerCase().replaceAll(" ", "-")}-link`}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                    isActive
                      ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/10"
                      : "text-slate-400 hover:bg-[#19253A] hover:text-slate-100"
                  }`
                }
              >
                <Icon size={17} className="shrink-0" />
                <span className={`${collapsed ? "lg:hidden" : ""}`}>{label}</span>
                {label === "AI Assistant" && (
                  <span
                    className={`ml-auto rounded bg-violet-400/15 px-1.5 py-0.5 font-mono text-[9px] text-violet-300 ${
                      collapsed ? "lg:hidden" : ""
                    }`}
                  >
                    LIVE RAG
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className={`mt-auto p-3 ${collapsed ? "lg:px-2" : ""}`}>
          <div
            className={`rounded-xl border border-[#263449] bg-[#131D30] p-3 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                Atlas Connected
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Live MongoDB Atlas cluster connected for document ingestion & vector intelligence.
            </p>
          </div>
          <button
            onClick={onToggle}
            data-testid="sidebar-collapse-button"
            className="mt-3 hidden w-full items-center justify-center gap-2 rounded-lg border border-[#263449] py-2 text-xs text-slate-500 hover:bg-[#19253A] hover:text-slate-200 lg:flex"
          >
            {collapsed ? (
              <ChevronRight size={15} />
            ) : (
              <>
                <ChevronLeft size={15} /> Collapse sidebar
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  onMenu,
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
  onMenu: () => void;
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
  const title = location.pathname.startsWith("/investigation/")
    ? "Investigation workspace"
    : pageTitles[location.pathname] ?? "Overview";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#263449] bg-[#0B1020]/90 px-4 backdrop-blur-md sm:px-7">
      {/* Page Title & Mobile Menu */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenu}
          data-testid="mobile-menu-button"
          className="rounded-lg p-2 text-slate-400 hover:bg-[#19253A] hover:text-white lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-slate-600">
            <span>CASECONNECT</span>
            <span className="text-slate-700">/</span>
            <span className="text-cyan-400/80">{title}</span>
          </div>
          <h1 className="mt-1 truncate text-lg font-semibold text-slate-100 sm:text-xl">
            {title}
          </h1>
        </div>
      </div>

      {/* Topbar Actions: Search, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          data-testid="mobile-search-button"
          className="rounded-lg p-2 text-slate-400 hover:bg-[#19253A] hover:text-slate-100 md:hidden"
          title="Search workspace (Ctrl+K)"
        >
          <Search size={18} />
        </button>

        {/* Desktop Search Trigger */}
        <div
          onClick={onOpenSearch}
          data-testid="global-search-trigger"
          className="relative hidden md:flex items-center cursor-pointer group"
        >
          <Search
            size={15}
            className="absolute left-3 text-slate-500 group-hover:text-cyan-300 transition-colors"
          />
          <input
            readOnly
            placeholder="Search workspace..."
            data-testid="global-search-input"
            className="h-9 w-48 cursor-pointer rounded-md border border-[#263449] bg-[#131D30] pl-9 pr-14 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-colors group-hover:border-[#3a4a63] group-hover:bg-[#162238] lg:w-60"
          />
          <div className="absolute right-2 flex items-center gap-0.5 rounded border border-[#263449] bg-[#0D1425] px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>

        {/* Notifications Popover Container */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            data-testid="notifications-button"
            className={`relative rounded-lg p-2 transition-colors ${
              notifOpen
                ? "bg-[#19253A] text-cyan-300 ring-1 ring-cyan-400/30"
                : "text-slate-400 hover:bg-[#19253A] hover:text-slate-100"
            }`}
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}
          </button>

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
        </div>

        <div className="hidden h-7 w-px bg-[#263449] sm:block" />

        {/* Profile Menu Container */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            data-testid="profile-menu-button"
            className={`flex items-center gap-2 rounded-lg p-1.5 transition-colors ${
              profileOpen
                ? "bg-[#19253A] ring-1 ring-cyan-400/30"
                : "hover:bg-[#19253A]"
            }`}
            title="Investigator Profile & Telemetry"
          >
            <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400 to-cyan-400 text-xs font-bold text-[#0B1020]">
              IN
            </div>
            <span className="hidden text-xs font-medium text-slate-300 lg:block">
              Investigator
            </span>
          </button>

          <ProfileMenu
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            investigationsCount={investigations.length}
            documentsCount={documents.length}
            onRefreshData={refreshState}
          />
        </div>
      </div>
    </header>
  );
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
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
      <div className="min-h-svh bg-[#0B1020] text-slate-100">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          firstInvId={investigations[0]?.id}
        />
        <div
          className={`min-h-svh transition-[padding] duration-200 lg:pl-[264px] ${
            collapsed ? "lg:pl-[82px]" : ""
          }`}
        >
          <Topbar
            onMenu={() => setMobileOpen(true)}
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
          <main className="mx-auto w-full max-w-[1560px] p-4 sm:p-7">
            <Outlet />
          </main>
        </div>

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

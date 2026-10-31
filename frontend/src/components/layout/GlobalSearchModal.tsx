import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Timeline,
  X,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { DocumentItem, Investigation } from "@/types";

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  investigations: Investigation[];
  documents: DocumentItem[];
  onOpenDocument: (doc: DocumentItem) => void;
}

export function GlobalSearchModal({
  open,
  onClose,
  investigations,
  documents,
  onOpenDocument,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  const filteredInvestigations = useMemo(() => {
    if (!q) return investigations.slice(0, 4);
    return investigations.filter(
      (inv) =>
        inv.name.toLowerCase().includes(q) ||
        inv.description?.toLowerCase().includes(q) ||
        inv.status?.toLowerCase().includes(q) ||
        inv.priority?.toLowerCase().includes(q)
    );
  }, [investigations, q]);

  const filteredDocuments = useMemo(() => {
    if (!q) return documents.slice(0, 4);
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(q) ||
        doc.classification?.toLowerCase().includes(q) ||
        doc.id.toLowerCase().includes(q)
    );
  }, [documents, q]);

  const quickNavItems = useMemo(() => {
    const firstInvId = investigations[0]?.id;
    const items = [
      { label: "Dashboard / Overview", path: "/dashboard", icon: LayoutDashboard },
      { label: "Investigation Registry", path: "/investigations", icon: Shield },
      { label: "Document Library", path: "/documents", icon: FileText },
      {
        label: "AI Investigation Assistant",
        path: firstInvId ? `/investigation/${firstInvId}?tab=assistant` : "/investigations",
        icon: MessageSquare,
      },
      {
        label: "Evidence Knowledge Graph",
        path: firstInvId ? `/investigation/${firstInvId}?tab=graph` : "/investigations",
        icon: GitBranch,
      },
      {
        label: "Timeline Intelligence",
        path: firstInvId ? `/investigation/${firstInvId}?tab=timeline` : "/investigations",
        icon: Timeline,
      },
      { label: "Workspace Settings", path: "/settings", icon: Settings },
    ];
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [investigations, q]);

  if (!open) return null;

  const totalResults =
    filteredInvestigations.length + filteredDocuments.length + quickNavItems.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="global-search-modal"
      className="fixed inset-0 z-50 grid place-items-start justify-center bg-[#050914]/80 p-4 pt-16 sm:pt-24 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#263449] bg-[#0D1425] shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-[#263449] bg-[#131D30] px-4 py-3.5">
          <Search size={18} className="text-cyan-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search investigations, evidence documents, or actions... (ESC to close)"
            data-testid="global-search-modal-input"
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="mr-2 rounded p-1 text-slate-500 hover:text-slate-300"
            >
              <X size={15} />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded border border-[#263449] bg-[#0D1425] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Investigations Section */}
          {filteredInvestigations.length > 0 && (
            <div>
              <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Investigations ({filteredInvestigations.length})</span>
                <span className="text-[9px] text-slate-600">Case Workspaces</span>
              </div>
              <div className="space-y-1">
                {filteredInvestigations.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      navigate(`/investigation/${inv.id}`);
                      onClose();
                    }}
                    data-testid={`search-result-inv-${inv.id}`}
                    className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#19253A] border border-transparent hover:border-[#263449]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300 group-hover:bg-cyan-400/20">
                        <Shield size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-200 group-hover:text-cyan-300">
                          {inv.name}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {inv.description || "Active intelligence case"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          inv.status === "Active"
                            ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                            : inv.status === "On hold"
                            ? "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-600/30"
                        }`}
                      >
                        {inv.status}
                      </span>
                      <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {filteredDocuments.length > 0 && (
            <div>
              <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Evidence Documents ({filteredDocuments.length})</span>
                <span className="text-[9px] text-slate-600">Click to Open</span>
              </div>
              <div className="space-y-1">
                {filteredDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      onOpenDocument(doc);
                      onClose();
                    }}
                    data-testid={`search-result-doc-${doc.id}`}
                    className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#19253A] border border-transparent hover:border-[#263449]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-400/10 text-violet-300 group-hover:bg-violet-400/20">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-200 group-hover:text-violet-300">
                          {doc.name}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {doc.pages ? `${doc.pages} pages` : "Document"} &bull; {doc.size} &bull; {doc.classification || "Evidence"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="rounded bg-[#131D30] border border-[#263449] px-2 py-0.5 font-mono text-[10px] text-slate-400 group-hover:text-cyan-300 flex items-center gap-1">
                        <ExternalLink size={10} /> Open
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Navigation Section */}
          {quickNavItems.length > 0 && (
            <div>
              <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Quick Navigation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {quickNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        navigate(item.path);
                        onClose();
                      }}
                      className="group flex items-center gap-2.5 rounded-lg border border-[#263449]/40 bg-[#131D30]/60 px-3 py-2 text-left text-xs text-slate-300 hover:bg-[#19253A] hover:text-slate-100 hover:border-[#263449]"
                    >
                      <Icon size={14} className="text-slate-500 group-hover:text-cyan-300 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {totalResults === 0 && (
            <div className="py-10 text-center">
              <Search size={28} className="mx-auto mb-2 text-slate-600" />
              <p className="text-xs text-slate-400">
                No investigations or documents found for &ldquo;<span className="text-cyan-300">{query}</span>&rdquo;
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                Try searching for a case name, status, or uploaded PDF file.
              </p>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between border-t border-[#263449] bg-[#0B1020] px-4 py-2 font-mono text-[10px] text-slate-500">
          <span>Search Intelligence OS</span>
          <div className="flex items-center gap-3">
            <span>Click to navigate</span>
            <span>&bull;</span>
            <span>ESC to dismiss</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Database,
  FileText,
  LogOut,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  User,
  X,
  Check,
} from "lucide-react";

interface ProfileMenuProps {
  open: boolean;
  onClose: () => void;
  investigationsCount: number;
  documentsCount: number;
  onRefreshData: () => void;
}

export function ProfileMenu({
  open,
  onClose,
  investigationsCount,
  documentsCount,
  onRefreshData,
}: ProfileMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleSync = () => {
    setSyncing(true);
    onRefreshData();
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
      setTimeout(() => setSynced(false), 2000);
    }, 600);
  };

  const handleSignOut = () => {
    if (confirm("Reset local demonstration session and reload?")) {
      window.location.href = "/";
    }
  };

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Investigator Profile"
      data-testid="profile-menu-popover"
      className="absolute right-0 top-12 z-50 w-[320px] sm:w-[350px] overflow-hidden rounded-2xl border border-[#263449] bg-[#0D1425] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Investigator Header */}
      <div className="border-b border-[#263449] bg-[#131D30] p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-cyan-400 text-sm font-bold text-[#0B1020] shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                IN
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#131D30] bg-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-100">Agent S. Vance</h4>
                <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300 border border-cyan-400/20">
                  Lead
                </span>
              </div>
              <p className="text-xs text-slate-400">investigator@caseconnect.secops</p>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                <Shield size={11} className="text-amber-400" />
                <span>Level 4 · Special Intelligence</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-[#19253A] hover:text-slate-300"
          >
            <X size={15} />
          </button>
        </div>

        {/* Live Workspace Counters */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#263449]/60 pt-3">
          <div className="rounded-lg bg-[#0D1425] p-2 border border-[#263449]/50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Investigations</div>
            <div className="text-base font-semibold text-slate-200">{investigationsCount}</div>
          </div>
          <div className="rounded-lg bg-[#0D1425] p-2 border border-[#263449]/50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Documents</div>
            <div className="text-base font-semibold text-slate-200">{documentsCount}</div>
          </div>
        </div>
      </div>

      {/* System Telemetry */}
      <div className="border-b border-[#263449] bg-[#0B1020]/50 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Database size={13} className="text-emerald-400" /> MongoDB Atlas
          </span>
          <span className="font-mono text-[10px] text-emerald-300">Cluster Connected</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Sparkles size={13} className="text-violet-400" /> RAG Engine
          </span>
          <span className="font-mono text-[10px] text-violet-300">Gemini Flash Lite</span>
        </div>
      </div>

      {/* Menu Actions */}
      <div className="p-2 space-y-0.5">
        <button
          onClick={() => {
            navigate("/settings");
            onClose();
          }}
          data-testid="profile-settings-button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-[#19253A] hover:text-slate-100 transition-colors"
        >
          <Settings size={15} className="text-slate-400" />
          <span>Workspace Settings</span>
        </button>

        <button
          onClick={() => {
            navigate("/investigations");
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-[#19253A] hover:text-slate-100 transition-colors"
        >
          <Shield size={15} className="text-slate-400" />
          <span>Investigations Registry</span>
        </button>

        <button
          onClick={() => {
            navigate("/documents");
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-[#19253A] hover:text-slate-100 transition-colors"
        >
          <FileText size={15} className="text-slate-400" />
          <span>Document Evidence Vault</span>
        </button>

        <button
          onClick={handleSync}
          disabled={syncing}
          data-testid="profile-sync-button"
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-[#19253A] hover:text-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw
              size={15}
              className={`text-cyan-400 ${syncing ? "animate-spin" : ""}`}
            />
            <span>{syncing ? "Syncing Atlas Data..." : "Re-sync Atlas Data"}</span>
          </div>
          {synced && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
              <Check size={12} /> Synced
            </span>
          )}
        </button>

        <div className="my-1 border-t border-[#263449]/50" />

        <button
          onClick={handleSignOut}
          data-testid="profile-sign-out-button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-red-400/90 hover:bg-red-400/10 hover:text-red-300 transition-colors"
        >
          <LogOut size={15} />
          <span>Reset Session / Sign out</span>
        </button>
      </div>
    </div>
  );
}

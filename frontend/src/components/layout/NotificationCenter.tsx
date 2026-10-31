import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  Database,
  FileText,
  Shield,
  Sparkles,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import type { DocumentItem, Investigation } from "@/types";

export interface AppNotification {
  id: string;
  type: "system" | "document" | "investigation" | "ai";
  title: string;
  description: string;
  time: string;
  read: boolean;
  docRef?: DocumentItem;
  invId?: string;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  investigations: Investigation[];
  documents: DocumentItem[];
  onOpenDocument: (doc: DocumentItem) => void;
  onSelectInvestigation: (id: string) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export function NotificationCenter({
  open,
  onClose,
  investigations,
  documents,
  onOpenDocument,
  onSelectInvestigation,
  unreadCount,
  setUnreadCount,
}: NotificationCenterProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize notifications from real system data
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const list: AppNotification[] = [
      {
        id: "notif-sys-atlas",
        type: "system",
        title: "Atlas Vector Index Online",
        description: "MongoDB Atlas vector search index is operational on caseconnect.documents.",
        time: "Active",
        read: false,
      },
      {
        id: "notif-ai-ready",
        type: "ai",
        title: "Gemini Intelligence Ready",
        description: "Gemini Flash Lite multi-model pipeline online with 0 rate limit delays.",
        time: "Just now",
        read: false,
      },
    ];

    // Add recent documents
    documents.slice(0, 3).forEach((doc) => {
      list.push({
        id: `notif-doc-${doc.id}`,
        type: "document",
        title: `Document Uploaded: ${doc.name}`,
        description: `Evidence file indexed (${doc.pages || 1} pages, ${doc.size}). Click to preview.`,
        time: doc.uploadedAt || "Recent",
        read: false,
        docRef: doc,
      });
    });

    // Add active investigations
    investigations.slice(0, 2).forEach((inv) => {
      list.push({
        id: `notif-inv-${inv.id}`,
        type: "investigation",
        title: `Workspace: ${inv.name}`,
        description: `Status is ${inv.status} with ${inv.documentCount || 0} linked evidence files.`,
        time: inv.updatedAt || "Active",
        read: false,
        invId: inv.id,
      });
    });

    return list;
  });

  // Keep unread count in sync
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications, setUnreadCount]);

  // Handle click outside to close
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

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Notification Center"
      data-testid="notification-center-popover"
      style={{
        position: "absolute",
        right: 0,
        top: "calc(100% + 12px)",
        width: "min(390px, calc(100vw - 32px))",
        maxWidth: "calc(100vw - 32px)",
        zIndex: 50,
      }}
      className="overflow-hidden rounded-2xl border border-[#263449] bg-[#0D1425] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#263449] bg-[#131D30] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300 border border-cyan-400/20">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllRead}
                title="Mark all as read"
                data-testid="mark-all-read-button"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-[#19253A] hover:text-slate-200 transition-colors"
              >
                <CheckCheck size={13} className="text-cyan-400" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
              <button
                onClick={clearAll}
                title="Clear all"
                data-testid="clear-all-notifications-button"
                className="rounded-md p-1.5 text-slate-500 hover:bg-[#19253A] hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-[#19253A] hover:text-slate-300"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-[#263449]/40 p-1">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="mx-auto mb-2 text-slate-600" />
            <p className="text-xs text-slate-400">All caught up!</p>
            <p className="mt-1 text-[11px] text-slate-600">No new notifications in this session.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.read;
            return (
              <div
                key={notif.id}
                onClick={() => {
                  toggleRead(notif.id);
                  if (notif.docRef) {
                    onOpenDocument(notif.docRef);
                    onClose();
                  } else if (notif.invId) {
                    onSelectInvestigation(notif.invId);
                    onClose();
                  }
                }}
                className={`group flex items-start gap-3 p-3 transition-colors cursor-pointer rounded-xl ${
                  isUnread
                    ? "bg-[#131D30]/70 hover:bg-[#19253A]"
                    : "hover:bg-[#131D30]/40 opacity-75 hover:opacity-100"
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    notif.type === "system"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : notif.type === "ai"
                      ? "bg-violet-400/10 text-violet-300"
                      : notif.type === "document"
                      ? "bg-cyan-400/10 text-cyan-300"
                      : "bg-amber-400/10 text-amber-300"
                  }`}
                >
                  {notif.type === "system" ? (
                    <Database size={15} />
                  ) : notif.type === "ai" ? (
                    <Sparkles size={15} />
                  ) : notif.type === "document" ? (
                    <FileText size={15} />
                  ) : (
                    <Shield size={15} />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                      {notif.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      {notif.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    {notif.description}
                  </p>

                  {(notif.docRef || notif.invId) && (
                    <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-cyan-400/80 group-hover:text-cyan-300">
                      <ExternalLink size={10} />
                      <span>{notif.docRef ? "Preview evidence" : "Open case workspace"}</span>
                    </div>
                  )}
                </div>

                {/* Unread dot */}
                {isUnread && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#263449] bg-[#0B1020] px-4 py-2 text-center font-mono text-[10px] text-slate-500">
        CaseConnect Intelligence Center
      </div>
    </div>
  );
}

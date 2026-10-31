import { useEffect } from "react";
import { ExternalLink, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentItem } from "@/types";

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export function DocumentViewerModal({ document, onClose }: DocumentViewerModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!document) return null;

  const viewUrl = `http://localhost:8000/api/documents/${document.id}/view`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="document-viewer-modal"
      className="fixed inset-0 z-50 grid place-items-center bg-[#050914]/85 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#263449] bg-[#0D1425] shadow-2xl">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#263449] bg-[#131D30] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-slate-100 sm:text-base">
                  {document.name}
                </h3>
                <Badge className="border border-cyan-400/25 bg-cyan-400/10 text-[10px] text-cyan-300">
                  {document.classification || "Report"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {document.pages ? `${document.pages} pages` : "Page count pending"} &bull; {document.size} &bull; Uploaded {document.uploadedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(viewUrl, "_blank", "noopener,noreferrer")}
              data-testid="open-document-new-tab-button"
              className="gap-1.5 border-[#263449] bg-[#0D1425] text-xs text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Open in new tab</span>
            </Button>
            <button
              onClick={onClose}
              data-testid="close-document-viewer-button"
              className="rounded-lg p-2 text-slate-400 hover:bg-[#19253A] hover:text-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Viewer Body */}
        <div className="relative flex-1 bg-[#0B1020]">
          <iframe
            src={viewUrl}
            title={document.name}
            data-testid="document-iframe-viewer"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/components/layout/AppShell";
import type { InvestigationStatus } from "@/types";

export default function WorkspaceHub() {
  const navigate = useNavigate();
  const { investigations, addInvestigation, updateInvestigation, documents } = useAppState();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | InvestigationStatus>("All");
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const filtered = useMemo(() => {
    return investigations.filter((item) => {
      const matchQuery =
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase());
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [investigations, query, statusFilter]);

  const submit = () => {
    if (!name.trim()) return;
    const created = addInvestigation({
      name: name.trim(),
      description: description.trim() || "New intelligence workspace ready for evidence review.",
    });
    setName("");
    setDescription("");
    setModal(false);
    navigate(`/investigation/${created.id}`);
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#263449] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            <Sparkles size={12} className="text-cyan-400" />
            <span>Case Intelligence Workspaces</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Workspaces
          </h2>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Select an investigation workspace to analyze evidence, query the AI Assistant, review
            chronological timelines, and explore the knowledge graph.
          </p>
        </div>

        <Button
          onClick={() => setModal(true)}
          data-testid="create-workspace-button"
          className="w-fit gap-2 bg-cyan-400 text-[#07111f] font-semibold hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)] rounded-xl"
        >
          <Plus size={16} /> New workspace
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#263449] bg-[#131D30] p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces by name or description..."
            className="border-[#263449] bg-[#0D1425] pl-9 text-sm text-slate-200 placeholder:text-slate-500 rounded-xl"
          />
        </div>

        <div className="flex gap-1 rounded-xl border border-[#263449] bg-[#0D1425] p-1 shrink-0">
          {(["All", "Active", "On hold", "Closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-[#263449] text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Workspaces Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((item) => {
          const caseDocs = documents.filter((d) => d.investigationId === item.id);
          const docCount = caseDocs.length || item.documentCount || 0;

          return (
            <div
              key={item.id}
              data-testid={`workspace-card-${item.id}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#263449] bg-[#131D30] p-6 sm:p-7 transition-all duration-200 hover:border-cyan-400/50 hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]"
            >
              <div className="space-y-5">
                {/* Header: Title, Description & Status Bar */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-400/10 border border-cyan-400/30 text-cyan-300">
                      <BriefcaseBusiness size={20} />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/investigation/${item.id}`}
                        className="text-lg font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors truncate block"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                        {item.description || "Active intelligence case ready for evidence review and analysis."}
                      </p>
                    </div>
                  </div>

                  {/* Status Bar Dropdown */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={item.status}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateInvestigation(item.id, { status: e.target.value as any });
                      }}
                      data-testid={`workspace-status-${item.id}`}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer transition-colors ${
                        item.status === "Active"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : item.status === "On hold"
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                          : "border-slate-500/40 bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      <option value="Active" className="bg-[#131D30] text-emerald-300">
                        ● Active
                      </option>
                      <option value="On hold" className="bg-[#131D30] text-amber-300">
                        ● On hold
                      </option>
                      <option value="Closed" className="bg-[#131D30] text-slate-400">
                        ● Closed
                      </option>
                    </select>
                  </div>
                </div>

                {/* Telemetry Row: Evidence Files, Entities, Priority */}
                <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#0D1425] p-4 border border-[#263449]/70">
                  <div>
                    <div className="text-xl font-bold text-slate-100">{docCount}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Evidence Files
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-100">{item.entityCount || "—"}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Entities
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-100">{item.priority || "Medium"}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Priority
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Safely Padded Timestamp & Single Open Full Workspace Action */}
              <div className="mt-6 flex items-center justify-between border-t border-[#263449] pt-4">
                <span className="font-mono text-xs text-slate-500">
                  Updated {item.updatedAt || "Just now"}
                </span>

                <Link
                  to={`/investigation/${item.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 text-[#07111f] font-semibold hover:bg-cyan-300 px-4 py-2 text-xs transition-all shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                >
                  <span>Open Full Workspace</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[#263449] p-12 text-center text-slate-400">
            <BriefcaseBusiness size={32} className="mx-auto mb-3 text-slate-600" />
            <h4 className="text-sm font-semibold text-slate-200">No workspaces match your search</h4>
            <p className="mt-1 text-xs text-slate-500">
              Try searching with another keyword or create a new workspace.
            </p>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {modal && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#050914]/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            data-testid="create-workspace-modal"
            className="w-full max-w-md rounded-2xl border border-[#3a4a63] bg-[#131D30] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <Plus size={18} />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Create workspace</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Start a new case workspace equipped with AI and Graph tools.
                </p>
              </div>
              <button
                onClick={() => setModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-[#19253A] hover:text-slate-200"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-300">
                  Workspace / Case Name
                </span>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Orion Financial Network"
                  className="border-[#3a4a63] bg-[#0D1425] text-slate-100 placeholder:text-slate-600 rounded-xl"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-300">
                  Description <span className="text-slate-500">(optional)</span>
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this investigation about?"
                  className="w-full resize-none rounded-xl border border-[#3a4a63] bg-[#0D1425] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setModal(false)}
                className="text-slate-400 hover:bg-[#19253A] hover:text-slate-100 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={!name.trim()}
                className="gap-2 bg-cyan-400 text-[#07111f] font-semibold hover:bg-cyan-300 disabled:opacity-40 rounded-xl"
              >
                <Check size={15} /> Create workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { monthLabel, shiftMonth, dayWeekday, WEEKDAY_LETTERS, offsUsed } from "@/lib/api";
import { exportExcel, exportPdf } from "@/lib/export";
import { Modal } from "@/components/Modal";

const SHIFT_STYLE = {
  day: "border-[rgba(56,142,60,0.45)] bg-[rgba(56,142,60,0.18)] text-[#7BC47E]",
  night: "border-[rgba(30,136,229,0.45)] bg-[rgba(30,136,229,0.18)] text-[#6FB3F0]",
  off: "border-[rgba(117,117,117,0.35)] bg-[rgba(117,117,117,0.14)] text-[#9E9E9E]",
  custom: "border-gold/50 bg-gold/15 text-gold-hover",
  unset: "border-dashed border-line text-cream-mute/50 hover:border-line-hi hover:text-cream-mute",
};
const SHIFT_LABEL = { day: "D", night: "N", off: "F", unset: "–" };
const SHIFT_NAME = { day: "Turno do dia", night: "Turno da noite", off: "Folga", unset: "Sem turno", custom: "Personalizado" };

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "pizzaiolo", label: "Pizzaiolos" },
  { id: "equipa", label: "Equipa" },
];

const CELL_CHOICES = [
  { id: "day", label: "Dia" },
  { id: "night", label: "Noite" },
  { id: "off", label: "Folga" },
  { id: "unset", label: "Vazio" },
];

export default function Schedule({ employees, entries, notes, month, setMonth, onCell, onSetShift, onGenerate, loading }) {
  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const [filter, setFilter] = useState("all");
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editor, setEditor] = useState(null); // {emp, day, note}
  const longPressed = useRef(false);
  const pressTimer = useRef(null);
  const today = new Date();
  const isThisMonth = today.getFullYear() === y && today.getMonth() + 1 === m;

  const filtered = employees.filter((e) => filter === "all" || e.group === filter);

  const openEditor = (emp, day) => setEditor({ emp, day, note: notes[emp.id]?.[day] || "" });

  const startPress = (emp, day) => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      openEditor(emp, day);
    }, 480);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const handleClick = (emp, day) => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onCell(emp.id, day);
  };

  const handleGenerate = async () => {
    if (generating) return;
    if (confirming) {
      setConfirming(false);
      setGenerating(true);
      await onGenerate(true);
      setGenerating(false);
      return;
    }
    setGenerating(true);
    const result = await onGenerate(false);
    setGenerating(false);
    if (result === "confirm") {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
    }
  };

  const doExport = async (kind) => {
    if (!employees.length) {
      toast.error("Sem equipa para exportar.");
      return;
    }
    try {
      if (kind === "excel") await exportExcel(employees, entries, notes, month);
      else await exportPdf(employees, entries, notes, month);
      toast.success(kind === "excel" ? "Excel descarregado." : "PDF descarregado.");
    } catch {
      toast.error("Não foi possível exportar o ficheiro.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4"
      data-testid="schedule-view"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-gold">Planeamento mensal</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-cream">Horários</h1>
          <p className="mt-1 text-sm text-cream-dim">Toca para alternar Dia → Noite → Folga → Vazio. Duplo clique (ou toque longo) para texto personalizado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => doExport("excel")}
            data-testid="export-excel-button"
            className="flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-cream-dim transition-colors hover:border-line-hi hover:text-cream active:scale-95"
          >
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button
            onClick={() => doExport("pdf")}
            data-testid="export-pdf-button"
            className="flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-cream-dim transition-colors hover:border-line-hi hover:text-cream active:scale-95"
          >
            <FileText size={15} /> PDF
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            data-testid="auto-generate-button"
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
              confirming
                ? "bg-gold text-ink-900 hover:bg-gold-hover"
                : "bg-brand text-white shadow-[0_8px_30px_rgba(224,83,60,0.35)] hover:bg-brand-hover"
            } disabled:opacity-60`}
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {confirming ? "Substituir escala atual?" : "Gerar mês automático"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-line bg-ink-700 p-1">
          <button onClick={() => setMonth(shiftMonth(month, -1))} data-testid="month-prev-button" className="rounded-full p-1.5 text-cream-dim transition-colors hover:bg-ink-600 hover:text-cream" aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[130px] text-center font-display text-sm font-bold text-cream" data-testid="month-label">{monthLabel(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} data-testid="month-next-button" className="rounded-full p-1.5 text-cream-dim transition-colors hover:bg-ink-600 hover:text-cream" aria-label="Mês seguinte">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-line bg-ink-700 p-1" data-testid="schedule-group-filter">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              data-testid={`schedule-filter-${f.id}`}
              className={`relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.id ? "text-ink-900" : "text-cream-dim hover:text-cream"
              }`}
            >
              {filter === f.id && <motion.span layoutId="sched-filter-pill" className="absolute inset-0 rounded-full bg-gold" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative">{f.label}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-cream-mute" data-testid="schedule-legend">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#388E3C]" /> Dia</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#1E88E5]" /> Noite</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#757575]" /> Folga</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-gold" /> Personalizado</span>
          <span className="hidden sm:inline">Dom–Qui: 11–18h / 18–00h · Sex–Sáb: 11–19h / 19–02h</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-ink-800" data-testid="schedule-grid">
        <table className="border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-20 min-w-[150px] bg-ink-800 px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-widest text-cream-mute">
                Funcionário
              </th>
              {days.map((d) => {
                const wd = dayWeekday(month, d);
                const weekend = wd === 0 || wd === 6;
                const isToday = isThisMonth && d === today.getDate();
                return (
                  <th key={d} className={`min-w-[42px] px-1 py-2 text-center ${isToday ? "bg-brand/10" : ""}`}>
                    <span className={`block text-[9px] font-mono ${weekend ? "text-gold" : "text-cream-mute"}`}>{WEEKDAY_LETTERS[wd]}</span>
                    <span className={`block font-display text-xs font-bold ${isToday ? "text-brand-hover" : weekend ? "text-gold-hover" : "text-cream"}`}>{d}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => {
              const offs = offsUsed(entries, emp.id);
              return (
                <tr key={emp.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-ink-700/40">
                  <td className="sticky left-0 z-10 bg-ink-800 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${emp.group === "pizzaiolo" ? "bg-brand" : "bg-gold"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-cream">{emp.name}</p>
                        <p className={`text-[10px] font-mono ${offs === 7 ? "text-[#7BC47E]" : "text-cream-mute"}`}>{offs}/7 folgas</p>
                      </div>
                    </div>
                  </td>
                  {days.map((d) => {
                    const shift = entries[emp.id]?.[d] || "unset";
                    const note = notes[emp.id]?.[d];
                    const isToday = isThisMonth && d === today.getDate();
                    const label = shift === "custom" ? (note ? note.slice(0, 3) : "★") : SHIFT_LABEL[shift];
                    return (
                      <td key={d} className={`px-0.5 py-1.5 text-center ${isToday ? "bg-brand/10" : ""}`}>
                        <motion.button
                          whileTap={{ scale: 0.82 }}
                          onClick={() => handleClick(emp, d)}
                          onDoubleClick={() => openEditor(emp, d)}
                          onTouchStart={() => startPress(emp, d)}
                          onTouchEnd={cancelPress}
                          onTouchMove={cancelPress}
                          data-testid={`schedule-cell-${emp.id}-${d}`}
                          title={`${emp.name} · ${d}/${m} · ${SHIFT_NAME[shift]}${note ? `: ${note}` : ""}`}
                          className={`h-9 w-9 rounded-lg border font-mono text-xs font-bold transition-colors sm:h-10 sm:w-10 ${SHIFT_STYLE[shift]}`}
                        >
                          {label}
                        </motion.button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center" data-testid="schedule-empty">
            <p className="font-display text-lg font-bold text-cream">Sem funcionários neste grupo</p>
            <p className="mt-1 text-sm text-cream-mute">Adiciona pessoas na aba Equipa para começares a planear.</p>
          </div>
        )}
      </div>
      {loading && <p className="text-xs text-cream-mute" data-testid="schedule-loading">A atualizar…</p>}

      <Modal
        open={!!editor}
        onClose={() => setEditor(null)}
        title={editor ? `${editor.emp.name} · dia ${editor.day}` : ""}
        testid="cell-editor-modal"
      >
        {editor && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2" data-testid="cell-editor-shifts">
              {CELL_CHOICES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onSetShift(editor.emp.id, editor.day, c.id); setEditor(null); }}
                  data-testid={`cell-editor-${c.id}`}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                    (entries[editor.emp.id]?.[editor.day] || "unset") === c.id
                      ? "border-brand bg-brand/15 text-brand-hover"
                      : "border-line text-cream-dim hover:border-line-hi hover:text-cream"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="cell-note" className="text-xs font-mono uppercase tracking-widest text-cream-mute">
                Texto personalizado (hora extra, saída mais cedo…)
              </label>
              <input
                id="cell-note"
                value={editor.note}
                onChange={(e) => setEditor({ ...editor, note: e.target.value.slice(0, 50) })}
                placeholder="Ex.: Hora extra até 20h"
                maxLength={50}
                data-testid="cell-note-input"
                className="mt-1.5 w-full rounded-xl border border-line bg-ink-800 px-4 py-2.5 text-sm text-cream placeholder:text-cream-mute focus:border-gold focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                if (!editor.note.trim()) {
                  toast.error("Escreve um texto para o turno personalizado.");
                  return;
                }
                onSetShift(editor.emp.id, editor.day, "custom", editor.note.trim());
                setEditor(null);
              }}
              data-testid="cell-note-save"
              className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-ink-900 transition-all hover:bg-gold-hover active:scale-[0.98]"
            >
              Guardar texto personalizado
            </button>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

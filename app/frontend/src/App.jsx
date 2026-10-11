import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import { Toaster, toast } from "sonner";
import { LayoutDashboard, CalendarDays, Users, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import Overview from "@/components/Overview";
import Schedule from "@/components/Schedule";
import Team from "@/components/Team";
import Coverage from "@/components/Coverage";
import AiChat from "@/components/AiChat";

const TABS = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard, testid: "nav-tab-overview" },
  { id: "schedule", label: "Horários", icon: CalendarDays, testid: "nav-tab-schedule" },
  { id: "team", label: "Equipa", icon: Users, testid: "nav-tab-team" },
  { id: "coverage", label: "Cobertura", icon: BarChart3, testid: "nav-tab-coverage" },
];

const currentMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

const NEXT_SHIFT = { unset: "day", day: "night", night: "off", off: "unset", custom: "day" };

export default function App() {
  const [tab, setTab] = useState("overview");
  const [month, setMonth] = useState(currentMonth);
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.12 });
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, sched] = await Promise.all([api.employees(), api.schedule(month)]);
      setEmployees(emps);
      setEntries(sched.entries || {});
      setNotes(sched.notes || {});
    } catch {
      toast.error("Não foi possível ligar ao servidor.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const applyLocal = (empId, day, shift, note) => {
    setEntries((cur) => {
      const clone = { ...cur, [empId]: { ...(cur[empId] || {}) } };
      if (shift === "unset") delete clone[empId][day];
      else clone[empId][day] = shift;
      return clone;
    });
    setNotes((cur) => {
      const clone = { ...cur, [empId]: { ...(cur[empId] || {}) } };
      if (shift === "custom" && note) clone[empId][day] = note;
      else delete clone[empId][day];
      return clone;
    });
  };

  const setShift = async (empId, day, shift, note) => {
    const prevShift = entries[empId]?.[day] || "unset";
    const prevNote = notes[empId]?.[day];
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    applyLocal(empId, day, shift, note);
    try {
      await api.setCell({ employee_id: empId, date: dateStr, shift, note });
    } catch (e) {
      applyLocal(empId, day, prevShift, prevNote);
      toast.error(e.response?.data?.detail || "Falha ao guardar o turno.");
    }
  };

  const handleCell = (empId, day) => {
    const current = entries[empId]?.[day] || "unset";
    setShift(empId, day, NEXT_SHIFT[current]);
  };

  const handleGenerate = async (overwrite) => {
    try {
      const r = await api.generate(month, overwrite);
      toast.success(`Escala gerada: ${r.created} turnos preenchidos.`);
      await load();
      return true;
    } catch (e) {
      if (e.response?.status === 409) return "confirm";
      toast.error(e.response?.data?.detail || "Não foi possível gerar a escala.");
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 font-body text-cream">
      <header className="sticky top-0 z-50 border-b border-line bg-ink-800/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 rounded-full border border-line bg-ink-700/60 p-1 md:flex" aria-label="Navegação principal">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={t.testid}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === t.id ? "text-white" : "text-cream-dim hover:text-cream"
                }`}
              >
                {tab === t.id && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-brand" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                )}
                <t.icon size={15} className="relative" />
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </nav>
          <span className="hidden rounded-full border border-line px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-cream-mute lg:block">
            7 folgas / mês
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-8 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === "overview" && <Overview employees={employees} entries={entries} notes={notes} month={month} goTab={setTab} />}
            {tab === "schedule" && (
              <Schedule
                employees={employees}
                entries={entries}
                notes={notes}
                month={month}
                setMonth={setMonth}
                onCell={handleCell}
                onSetShift={setShift}
                onGenerate={handleGenerate}
                loading={loading}
              />
            )}
            {tab === "team" && <Team employees={employees} entries={entries} onChanged={load} />}
            {tab === "coverage" && <Coverage employees={employees} entries={entries} month={month} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AiChat month={month} onChanged={load} />

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink-800/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Navegação móvel">
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`mobile-${t.testid}`}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                tab === t.id ? "text-brand-hover" : "text-cream-mute"
              }`}
            >
              <t.icon size={19} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: "#211D19", border: "1px solid #332B25", color: "#F7F3EE" },
        }}
      />
    </div>
  );
}

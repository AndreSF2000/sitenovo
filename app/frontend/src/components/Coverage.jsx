import { motion } from "framer-motion";
import { monthLabel, dayWeekday } from "@/lib/api";

export default function Coverage({ employees, entries, month }) {
  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const today = new Date();
  const isThisMonth = today.getFullYear() === y && today.getMonth() + 1 === m;

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1;
    let day = 0, night = 0, off = 0, filled = 0;
    employees.forEach((e) => {
      const s = entries[e.id]?.[d];
      if (s === "day") { day += 1; filled += 1; }
      if (s === "night") { night += 1; filled += 1; }
      if (s === "off") { off += 1; filled += 1; }
      if (s === "custom") { filled += 1; }
    });
    const status = filled === 0 ? "pendente" : day >= 2 && night >= 2 ? "ok" : "reforcar";
    return { d, day, night, off, status, weekend: [5, 6].includes(dayWeekday(month, d)) };
  });

  const ok = days.filter((x) => x.status === "ok").length;
  const weak = days.filter((x) => x.status === "reforcar").length;
  const pending = days.filter((x) => x.status === "pendente").length;
  const maxCrew = Math.max(1, ...days.map((x) => Math.max(x.day, x.night)));

  const STATUS = {
    ok: { label: "Coberto", cls: "bg-[rgba(56,142,60,0.15)] text-[#7BC47E]" },
    reforcar: { label: "Reforçar", cls: "bg-gold/15 text-gold-hover" },
    pendente: { label: "Pendente", cls: "bg-ink-600 text-cream-mute" },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-5" data-testid="coverage-view">
      <div>
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-gold">Análise do mês</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-cream">Cobertura — {monthLabel(month)}</h1>
        <p className="mt-1 text-sm text-cream-dim">Cada dia precisa de pelo menos 2 pessoas por turno para ficar coberto.</p>
      </div>

      <div className="grid grid-cols-3 gap-3" data-testid="coverage-summary">
        {[
          { label: "Dias cobertos", value: ok, cls: "text-[#7BC47E]", testid: "coverage-ok" },
          { label: "A reforçar", value: weak, cls: "text-gold-hover", testid: "coverage-weak" },
          { label: "Por preencher", value: pending, cls: "text-cream-mute", testid: "coverage-pending" },
        ].map((s) => (
          <div key={s.testid} data-testid={s.testid} className="rounded-2xl border border-line bg-ink-700 p-4 text-center sm:p-5">
            <p className={`font-display text-3xl font-extrabold ${s.cls}`}>{s.value}</p>
            <p className="mt-1 text-[11px] font-mono uppercase tracking-widest text-cream-mute">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" data-testid="coverage-grid">
        {days.map((x, i) => (
          <motion.div
            key={x.d}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.015, 0.5), duration: 0.3 }}
            data-testid={`coverage-day-${x.d}`}
            className={`rounded-xl border p-3 ${
              isThisMonth && x.d === today.getDate() ? "border-brand bg-brand/5" : "border-line bg-ink-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-display text-base font-bold ${x.weekend ? "text-gold-hover" : "text-cream"}`}>{x.d}</span>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${STATUS[x.status].cls}`}>
                {STATUS[x.status].label}
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-6 text-[9px] font-mono uppercase text-cream-mute">Dia</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-600">
                  <div className="h-full rounded-full bg-[#388E3C]" style={{ width: `${(x.day / maxCrew) * 100}%` }} />
                </div>
                <span className="w-4 text-right text-[10px] font-bold text-[#7BC47E]">{x.day}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 text-[9px] font-mono uppercase text-cream-mute">Noi</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-600">
                  <div className="h-full rounded-full bg-[#1E88E5]" style={{ width: `${(x.night / maxCrew) * 100}%` }} />
                </div>
                <span className="w-4 text-right text-[10px] font-bold text-[#6FB3F0]">{x.night}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

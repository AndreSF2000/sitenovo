import { motion } from "framer-motion";
import { Users, Clock3, CalendarCheck2, ShieldCheck, ArrowRight, Flame } from "lucide-react";
import { MONTHS_PT } from "@/lib/api";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } } };

function Avatar({ name, group }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        group === "pizzaiolo" ? "bg-brand/20 text-brand-hover" : "bg-gold/20 text-gold-hover"
      }`}
    >
      {initials}
    </span>
  );
}

export default function Overview({ employees, entries, notes, month, goTab }) {
  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const today = new Date();
  const isThisMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
  const todayDay = today.getDate();

  const pizzaiolos = employees.filter((e) => e.group === "pizzaiolo").length;
  const equipa = employees.length - pizzaiolos;
  const filled = employees.reduce((acc, e) => acc + Object.keys(entries[e.id] || {}).length, 0);
  const completion = employees.length ? Math.round((filled / (employees.length * totalDays)) * 100) : 0;

  const shiftOf = (e) => (isThisMonth ? entries[e.id]?.[todayDay] : undefined);
  const dayCrew = employees.filter((e) => shiftOf(e) === "day");
  const nightCrew = employees.filter((e) => shiftOf(e) === "night");
  const customCrew = employees.filter((e) => shiftOf(e) === "custom");
  const offToday = employees.filter((e) => shiftOf(e) === "off").length;

  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const weekInMonth = week.filter((d) => d.getFullYear() === y && d.getMonth() + 1 === m);
  let coveredSlots = 0;
  weekInMonth.forEach((d) => {
    const day = d.getDate();
    const counts = employees.reduce(
      (acc, e) => {
        const s = entries[e.id]?.[day];
        if (s === "day") acc.day += 1;
        if (s === "night") acc.night += 1;
        if (s === "custom") acc.day += 1;
        return acc;
      },
      { day: 0, night: 0 }
    );
    if (counts.day >= 1) coveredSlots += 1;
    if (counts.night >= 1) coveredSlots += 1;
  });
  const coverage = weekInMonth.length ? Math.round((coveredSlots / (weekInMonth.length * 2)) * 100) : 0;

  const stats = [
    { icon: Users, label: "Equipa Ativa", value: employees.length, unit: "pessoas", sub: `${pizzaiolos} pizzaiolos · ${equipa} equipa`, testid: "stat-active-staff" },
    { icon: Clock3, label: "A Trabalhar Hoje", value: isThisMonth ? dayCrew.length + nightCrew.length + customCrew.length : "–", unit: "em turno", sub: isThisMonth ? `${offToday} folgas hoje` : "Abre o mês atual", testid: "stat-working-today" },
    { icon: CalendarCheck2, label: "Horário do Mês", value: completion, unit: "% preenchido", sub: "Regra: 7 folgas por pessoa", testid: "stat-month-completion", progress: completion },
    { icon: ShieldCheck, label: "Cobertura Semanal", value: coverage, unit: "% assegurada", sub: "Turnos com pelo menos 1 pessoa", testid: "stat-week-coverage", progress: coverage },
  ];

  const shiftCards = [
    { label: "Turno do Dia", crew: dayCrew, accent: "text-[#7BC47E]", testid: "today-day-shift" },
    { label: "Turno da Noite", crew: nightCrew, accent: "text-[#6FB3F0]", testid: "today-night-shift" },
    ...(customCrew.length ? [{ label: "Personalizado", crew: customCrew, accent: "text-gold-hover", testid: "today-custom-shift" }] : []),
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6" data-testid="overview-view">
      <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-gold">
            {today.getDate()} de {MONTHS_PT[today.getMonth()]} de {today.getFullYear()}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
            Bom turno, chefe<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-cream-dim sm:text-base">O pulso da tua equipa, sem folhas de papel.</p>
        </div>
        <button
          onClick={() => goTab("schedule")}
          data-testid="overview-open-schedule"
          className="group flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(224,83,60,0.35)] transition-all hover:bg-brand-hover active:scale-95"
        >
          <Flame size={16} /> Gerir horários
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <motion.article
            key={s.testid}
            variants={item}
            data-testid={s.testid}
            className="rounded-2xl border border-line bg-ink-700 p-4 transition-colors hover:border-line-hi sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-cream-mute">{s.label}</span>
              <s.icon size={16} className="text-gold" />
            </div>
            <p className="mt-3 font-display text-3xl font-extrabold text-cream">
              {s.value}
              <span className="ml-1.5 text-xs font-medium text-cream-mute">{s.unit}</span>
            </p>
            {s.progress !== undefined && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-600">
                <motion.div
                  className="h-full rounded-full bg-brand"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(s.progress, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-cream-dim">{s.sub}</p>
          </motion.article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.section variants={item} className="rounded-2xl border border-line bg-ink-700 p-5 lg:col-span-2" data-testid="today-shifts-panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-cream">Turnos de hoje</h2>
              <p className="text-xs text-cream-mute">Dom–Qui 11:00–18:00 / 18:00–00:00 · Sex–Sáb 11:00–19:00 / 19:00–02:00</p>
            </div>
            <button onClick={() => goTab("schedule")} data-testid="today-shifts-open-schedule" className="text-xs font-semibold text-gold transition-colors hover:text-gold-hover">
              Ver calendário →
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {shiftCards.map((s) => (
              <div key={s.testid} data-testid={s.testid} className="rounded-xl border border-line bg-ink-800 p-4">
                <p className={`text-xs font-mono uppercase tracking-widest ${s.accent}`}>{s.label}</p>
                <div className="mt-3 space-y-2.5">
                  {!isThisMonth && <p className="text-sm text-cream-mute">Seleciona o mês atual para veres hoje.</p>}
                  {isThisMonth && s.crew.length === 0 && <p className="text-sm text-cream-mute">Sem ninguém neste turno.</p>}
                  {isThisMonth &&
                    s.crew.map((e) => (
                      <div key={e.id} className="flex items-center gap-2.5">
                        <Avatar name={e.name} group={e.group} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-cream">{e.name}</p>
                          <p className="truncate text-xs text-cream-mute">{notes[e.id]?.[todayDay] || e.role}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section variants={item} className="rounded-2xl border border-line bg-ink-700 p-5" data-testid="week-strip-panel">
          <h2 className="font-display text-lg font-bold text-cream">Esta semana</h2>
          <p className="text-xs text-cream-mute">Pessoas em serviço por dia</p>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const inMonth = d.getFullYear() === y && d.getMonth() + 1 === m;
              const isToday = d.toDateString() === today.toDateString();
              const working = inMonth
                ? employees.filter((e) => ["day", "night", "custom"].includes(entries[e.id]?.[d.getDate()])).length
                : null;
              return (
                <div
                  key={d.toISOString()}
                  className={`flex flex-col items-center rounded-xl border py-2.5 ${
                    isToday ? "border-brand bg-brand/10" : "border-line bg-ink-800"
                  } ${!inMonth ? "opacity-35" : ""}`}
                >
                  <span className="text-[10px] font-mono uppercase text-cream-mute">
                    {["S", "T", "Q", "Q", "S", "S", "D"][d.getDay()]}
                  </span>
                  <span className={`mt-1 font-display text-base font-bold ${isToday ? "text-brand-hover" : "text-cream"}`}>{d.getDate()}</span>
                  <span className="mt-1 text-[10px] font-semibold text-gold">{working !== null ? `${working}` : "·"}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => goTab("team")}
            data-testid="overview-open-team"
            className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-cream-dim transition-colors hover:border-line-hi hover:text-cream"
          >
            Gerir equipa
          </button>
        </motion.section>
      </div>
    </motion.div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, offsUsed } from "@/lib/api";
import { Modal } from "@/components/Modal";

function Avatar({ name, group, size = "h-11 w-11 text-sm" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-2xl font-display font-bold ${
        group === "pizzaiolo" ? "bg-brand/20 text-brand-hover" : "bg-gold/20 text-gold-hover"
      }`}
    >
      {initials}
    </span>
  );
}

export default function Team({ employees, entries, onChanged }) {
  const [group, setGroup] = useState("pizzaiolo");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', employee?}
  const [form, setForm] = useState({ name: "", role: "", group: "pizzaiolo" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = employees.filter(
    (e) => e.group === group && e.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const pizzaiolos = employees.filter((e) => e.group === "pizzaiolo").length;

  const openAdd = () => {
    setForm({ name: "", role: "", group });
    setModal({ mode: "add" });
  };
  const openEdit = (emp) => {
    setForm({ name: emp.name, role: emp.role, group: emp.group });
    setModal({ mode: "edit", employee: emp });
  };

  const save = async (ev) => {
    ev.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = { name: form.name, role: form.role || "Novo membro", group: form.group };
      if (modal.mode === "add") {
        await api.createEmployee(payload);
        toast.success(`${payload.name} adicionado à equipa.`);
      } else {
        await api.updateEmployee(modal.employee.id, payload);
        toast.success("Ficha atualizada.");
      }
      setModal(null);
      await onChanged();
    } catch {
      toast.error("Não foi possível guardar. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (emp) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(emp.id);
      toast.success(`${emp.name} removido da equipa.`);
      setConfirmDelete(null);
      await onChanged();
    } catch {
      toast.error("Não foi possível remover.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-5" data-testid="team-view">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-gold">Pessoas e funções</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-cream">A tua equipa</h1>
          <p className="mt-1 text-sm text-cream-dim">
            {pizzaiolos} pizzaiolos · {employees.length - pizzaiolos} na equipa de sala
          </p>
        </div>
        <button
          onClick={openAdd}
          data-testid="add-employee-button"
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(224,83,60,0.35)] transition-all hover:bg-brand-hover active:scale-95"
        >
          <Plus size={16} /> Adicionar pessoa
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-line bg-ink-700 p-1" data-testid="team-group-tabs">
          {[
            { id: "pizzaiolo", label: "Pizzaiolos", testid: "team-tab-pizzaiolos" },
            { id: "equipa", label: "Equipa de Sala", testid: "team-tab-equipa" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setGroup(t.id)}
              data-testid={t.testid}
              className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                group === t.id ? "text-ink-900" : "text-cream-dim hover:text-cream"
              }`}
            >
              {group === t.id && (
                <motion.span layoutId="team-tab-pill" className={`absolute inset-0 rounded-full ${t.id === "pizzaiolo" ? "bg-brand" : "bg-gold"}`} transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <span className={`relative ${group === t.id && t.id === "pizzaiolo" ? "text-white" : ""}`}>{t.label}</span>
            </button>
          ))}
        </div>
        <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-line bg-ink-700 px-4 py-2 sm:max-w-xs">
          <Search size={15} className="text-cream-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar pessoa…"
            data-testid="team-search-input"
            className="w-full bg-transparent text-sm text-cream placeholder:text-cream-mute focus:outline-none"
          />
        </label>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-ink-800 px-6 py-16 text-center" data-testid="team-empty">
          <p className="font-display text-lg font-bold text-cream">
            {search ? "Ninguém corresponde à pesquisa" : group === "pizzaiolo" ? "Ainda sem pizzaiolos" : "Ainda sem equipa de sala"}
          </p>
          <p className="mt-1 text-sm text-cream-mute">Usa o botão “Adicionar pessoa” para registar o primeiro membro.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="team-cards">
          {list.map((emp, i) => {
            const offs = offsUsed(entries, emp.id);
            return (
              <motion.article
                key={emp.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: "easeOut" }}
                data-testid={`employee-card-${emp.id}`}
                className="group rounded-2xl border border-line bg-ink-700 p-4 transition-colors hover:border-line-hi"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={emp.name} group={emp.group} />
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-cream">{emp.name}</p>
                      <p className="truncate text-xs text-cream-mute">{emp.role}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${emp.group === "pizzaiolo" ? "bg-brand/15 text-brand-hover" : "bg-gold/15 text-gold-hover"}`}>
                    {emp.group === "pizzaiolo" ? "Pizzaiolo" : "Sala"}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-800 px-3 py-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-cream-mute">Folgas do mês</span>
                  <span className={`font-display text-sm font-bold ${offs === 7 ? "text-[#7BC47E]" : offs > 7 ? "text-brand-hover" : "text-cream"}`} data-testid={`employee-offs-${emp.id}`}>
                    {offs}/7
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEdit(emp)}
                    data-testid={`employee-edit-${emp.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-semibold text-cream-dim transition-colors hover:border-line-hi hover:text-cream"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  {confirmDelete === emp.id ? (
                    <button
                      onClick={() => remove(emp)}
                      disabled={deleting}
                      data-testid={`employee-delete-confirm-${emp.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
                    >
                      {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Confirmar?
                    </button>
                  ) : (
                    <button
                      onClick={() => { setConfirmDelete(emp.id); setTimeout(() => setConfirmDelete((c) => (c === emp.id ? null : c)), 3500); }}
                      data-testid={`employee-delete-${emp.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-semibold text-cream-dim transition-colors hover:border-brand/50 hover:text-brand-hover"
                    >
                      <Trash2 size={13} /> Remover
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Editar pessoa" : "Adicionar pessoa"} testid="employee-modal">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="emp-name" className="text-xs font-mono uppercase tracking-widest text-cream-mute">Nome</label>
            <input
              id="emp-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={80}
              autoFocus
              data-testid="employee-name-input"
              className="mt-1.5 w-full rounded-xl border border-line bg-ink-800 px-4 py-2.5 text-sm text-cream placeholder:text-cream-mute focus:border-brand focus:outline-none"
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label htmlFor="emp-role" className="text-xs font-mono uppercase tracking-widest text-cream-mute">Função</label>
            <input
              id="emp-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              maxLength={80}
              data-testid="employee-role-input"
              className="mt-1.5 w-full rounded-xl border border-line bg-ink-800 px-4 py-2.5 text-sm text-cream placeholder:text-cream-mute focus:border-brand focus:outline-none"
              placeholder={form.group === "pizzaiolo" ? "Ex.: Pizzaiolo" : "Ex.: Atendimento"}
            />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cream-mute">Grupo</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2" data-testid="employee-group-select">
              {[
                { id: "pizzaiolo", label: "Pizzaiolo" },
                { id: "equipa", label: "Equipa de Sala" },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setForm({ ...form, group: g.id })}
                  data-testid={`employee-group-${g.id}`}
                  className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                    form.group === g.id
                      ? g.id === "pizzaiolo"
                        ? "border-brand bg-brand/15 text-brand-hover"
                        : "border-gold bg-gold/15 text-gold-hover"
                      : "border-line text-cream-dim hover:border-line-hi"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            data-testid="employee-save-button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white transition-all hover:bg-brand-hover active:scale-[0.98] disabled:opacity-50"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {modal?.mode === "edit" ? "Guardar alterações" : "Adicionar à equipa"}
          </button>
        </form>
      </Modal>
    </motion.div>
  );
}

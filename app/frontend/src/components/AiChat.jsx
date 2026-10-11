import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const API = "/api";

const SHIFT_PT = { day: "Turno do Dia", night: "Turno da Noite", off: "Folga", unset: "Sem turno", custom: "Personalizado" };

const actionLabel = (a) => {
  if (!a) return "";
  if (a.type === "set_shift")
    return `${a.employee_name} · ${a.date.split("-").reverse().join("/")} · ${SHIFT_PT[a.shift]}${a.shift === "custom" && a.note ? ` (${a.note})` : ""}`;
  if (a.type === "add_employee") return `Adicionar ${a.name} (${a.group === "pizzaiolo" ? "Pizzaiolo" : "Equipa"})`;
  if (a.type === "remove_employee") return `Remover ${a.employee_name} permanentemente`;
  if (a.type === "generate_month") return "Gerar a escala completa do mês (substitui a atual)";
  return "";
};

export default function AiChat({ month, onChanged }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Olá, chefe. Diz-me o que precisas: “Rita folga dia 23”, “Bruno de noite dia 25”, “adiciona o pizzaiolo Mário”…" },
  ]);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const pushAssistant = (patch) => {
    setMessages((cur) => {
      const clone = [...cur];
      clone[clone.length - 1] = { ...clone[clone.length - 1], ...patch };
      return clone;
    });
  };

  const send = async (ev) => {
    ev?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    lastText.current = "";
    setMessages((cur) => [...cur, { role: "user", text }, { role: "assistant", text: "", streaming: true }]);
    try {
      const res = await fetch(`${API}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          month,
          history: messages
            .filter((item) => ["user", "assistant"].includes(item.role) && !item.streaming && !item.failed)
            .slice(-10)
            .map(({ role, text: message }) => ({ role, text: message })),
        }),
      });
      if (!res.ok) {
        const problem = await res.json().catch(() => null);
        throw new Error(problem?.detail || "Não foi possível contactar o assistente.");
      }
      if (!res.body) throw new Error("O assistente não devolveu uma resposta.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const ev2 = JSON.parse(payload);
            if (ev2.t === "delta") {
              pushAssistant({ text: (messagesRefAppend(ev2.c)), streaming: true });
            } else if (ev2.t === "done") {
              pushAssistant({ streaming: false, action: ev2.action || null });
            } else if (ev2.t === "error") {
              pushAssistant({ text: ev2.c, streaming: false, failed: true });
            }
          } catch { /* linha parcial */ }
        }
      }
      pushAssistant({ streaming: false });
    } catch (error) {
      pushAssistant({
        text: error.message || "Não consegui falar com o assistente. Verifica a ligação e tenta outra vez.",
        streaming: false,
        failed: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const lastText = useRef("");
  const messagesRefAppend = (chunk) => {
    lastText.current += chunk;
    return lastText.current;
  };

  const confirm = async (idx) => {
    const msg = messages[idx];
    if (!msg?.action || msg.acted) return;
    setMessages((cur) => cur.map((m2, i) => (i === idx ? { ...m2, acting: true } : m2)));
    try {
      const a = msg.action;
      if (a.type === "set_shift") await api.setCell({ employee_id: a.employee_id, date: a.date, shift: a.shift, note: a.note });
      if (a.type === "add_employee") await api.createEmployee({ name: a.name, role: a.role, group: a.group });
      if (a.type === "remove_employee") await api.deleteEmployee(a.employee_id);
      if (a.type === "generate_month") await api.generate(a.month, true);
      toast.success("Feito. A escala foi atualizada.");
      setMessages((cur) => cur.map((m2, i) => (i === idx ? { ...m2, acted: true, acting: false } : m2)));
      await onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não consegui executar a ação.");
      setMessages((cur) => cur.map((m2, i) => (i === idx ? { ...m2, acting: false } : m2)));
    }
  };

  const decline = (idx) => setMessages((cur) => cur.map((m2, i) => (i === idx ? { ...m2, declined: true } : m2)));

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        data-testid="ai-open-button"
        aria-label="Abrir assistente Mr Pizza IA"
        className="fixed bottom-[74px] right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_35px_rgba(224,83,60,0.45)] transition-colors hover:bg-brand-hover md:bottom-6 md:right-6"
      >
        <Bot size={22} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            data-testid="ai-panel"
            className="fixed inset-x-3 bottom-[132px] z-[75] flex max-h-[62vh] flex-col overflow-hidden rounded-2xl border border-line bg-ink-700 shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[380px]"
          >
            <header className="flex items-center justify-between border-b border-line bg-ink-800 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-brand-hover"><Sparkles size={15} /></span>
                <div>
                  <p className="font-display text-sm font-bold text-cream">Mr Pizza IA</p>
                  <p className="flex items-center gap-1 text-[10px] text-cream-mute"><i className="h-1.5 w-1.5 rounded-full bg-[#7BC47E]" /> Assistente do site</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} data-testid="ai-close-button" className="rounded-full p-1.5 text-cream-mute transition-colors hover:bg-ink-600 hover:text-cream" aria-label="Fechar assistente">
                <X size={16} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" data-testid="ai-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`ai-message-${i}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-br-md bg-brand text-white"
                        : msg.failed
                          ? "rounded-bl-md border border-brand/40 bg-ink-800 text-cream-dim"
                          : "rounded-bl-md bg-ink-800 text-cream"
                    }`}
                  >
                    {msg.text}
                    {msg.streaming && <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-gold align-middle" />}
                    {msg.action && !msg.acted && !msg.declined && (
                      <div className="mt-2.5 rounded-xl border border-gold/40 bg-gold/10 p-3" data-testid={`ai-action-${i}`}>
                        <p className="text-xs font-semibold text-gold-hover">{actionLabel(msg.action)}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => confirm(i)}
                            disabled={msg.acting}
                            data-testid={`ai-confirm-${i}`}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
                          >
                            {msg.acting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirmar
                          </button>
                          <button onClick={() => decline(i)} data-testid={`ai-decline-${i}`} className="flex-1 rounded-lg border border-line py-1.5 text-xs font-semibold text-cream-dim transition-colors hover:text-cream">
                            Recusar
                          </button>
                        </div>
                      </div>
                    )}
                    {msg.acted && <p className="mt-1.5 text-[11px] font-semibold text-[#7BC47E]">✓ Executado</p>}
                    {msg.declined && <p className="mt-1.5 text-[11px] text-cream-mute">Ação recusada</p>}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={send} className="flex items-center gap-2 border-t border-line bg-ink-800 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Peça uma alteração…"
                data-testid="ai-input"
                maxLength={400}
                className="min-w-0 flex-1 rounded-full border border-line bg-ink-700 px-4 py-2.5 text-sm text-cream placeholder:text-cream-mute focus:border-brand focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                data-testid="ai-send-button"
                aria-label="Enviar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-all hover:bg-brand-hover active:scale-90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

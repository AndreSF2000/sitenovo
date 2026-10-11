import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Output, streamText } from "ai";
import { z } from "zod";
import { getDb } from "../server/db.js";
import { ApiError, parseMonth, readJson, requireMethod, validateDate, withApiErrors } from "../server/http.js";

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set_shift"),
    employee_id: z.string().uuid(),
    date: z.string(),
    shift: z.enum(["day", "night", "off", "custom"]),
    note: z.string().max(50).optional(),
  }),
  z.object({
    type: z.literal("add_employee"),
    name: z.string().trim().min(1).max(80),
    role: z.string().max(80),
    group: z.enum(["pizzaiolo", "equipa"]),
  }),
  z.object({
    type: z.literal("remove_employee"),
    employee_id: z.string().uuid(),
  }),
  z.object({ type: z.literal("generate_month"), month: z.string() }),
]);

const responseSchema = z.object({
  message: z.string().min(1).max(2000),
  action: actionSchema.nullable(),
});

function safeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10)
    .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.text === "string")
    .map((item) => ({
      role: item.role,
      text: item.text.slice(0, 2000),
    }));
}

function normalizeAction(action, employees, month) {
  if (!action) return null;
  if (action.type === "set_shift") {
    const employee = employees.find((item) => item.id === action.employee_id);
    if (!employee) return null;
    try {
      validateDate(action.date, month);
    } catch {
      return null;
    }
    if (action.shift === "custom" && !action.note?.trim()) return null;
    return {
      ...action,
      employee_name: employee.name,
      note: action.shift === "custom" ? action.note.trim() : undefined,
    };
  }
  if (action.type === "remove_employee") {
    const employee = employees.find((item) => item.id === action.employee_id);
    return employee ? { ...action, employee_name: employee.name } : null;
  }
  if (action.type === "generate_month" && action.month !== month) return null;
  return action;
}

const handler = withApiErrors(async (request, response) => {
  requireMethod(request, response, "POST");
  const body = readJson(request);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 400) throw new ApiError(400, "A mensagem tem de ter entre 1 e 400 caracteres.");
  const month = parseMonth(body.month);
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;
  if (!apiKey || !modelId) {
    throw new ApiError(503, "Configura OPENROUTER_API_KEY e OPENROUTER_MODEL para ativar o assistente.");
  }

  const sql = getDb();
  const [employees, monthRows] = await Promise.all([
    sql`
      SELECT id, name, role, employee_group AS "group"
      FROM employees
      ORDER BY employee_group, name
    `,
    sql`
      SELECT employee_id, work_date::text AS work_date, shift, note
      FROM schedule_cells
      WHERE work_date >= ${month.start}::date AND work_date < ${month.end}::date
      ORDER BY work_date, employee_id
    `,
  ]);
  const history = safeHistory(body.history);

  const currentSchedule = monthRows.map((row) => ({
    employee_id: row.employee_id,
    date: row.work_date,
    shift: row.shift,
    note: row.note,
  }));
  const conversation = [
    ...history.map(({ role, text }) => `${role === "user" ? "Gerente" : "Assistente"}: ${text}`),
    `Pedido atual do gerente: ${message}`,
  ].join("\n");
  const openrouter = createOpenRouter({ apiKey });
  const result = streamText({
    model: openrouter.chat(modelId),
    output: Output.object({ schema: responseSchema }),
    system: [
      "És o assistente de gestão da Mr Pizza. Responde sempre em português europeu, de forma curta e clara.",
      "A data atual de planeamento é o mês selecionado. A equipa e a escala abaixo são os dados reais.",
      "Podes propor no máximo uma ação; nunca executes ações nem afirmes que já foram executadas.",
      "Só propõe uma ação quando o pedido e a pessoa/data são inequívocos. Se houver ambiguidade, faz uma pergunta e usa action=null.",
      "Para uma alteração de horário usa set_shift; para novo membro add_employee; para remoção remove_employee; para gerar o mês generate_month com o mês selecionado.",
      "Em set_shift, usa apenas IDs da equipa abaixo, datas AAAA-MM-DD dentro do mês selecionado e o turno pedido pelo gerente.",
      `Mês selecionado: ${month.value}.`,
      `Equipa: ${JSON.stringify(employees)}.`,
      `Escala deste mês: ${JSON.stringify(currentSchedule)}.`,
    ].join(" "),
    prompt: conversation,
    onError({ error }) {
      console.error("OpenRouter devolveu um erro:", error);
    },
  });

  const send = (event) => response.write(`data: ${JSON.stringify(event)}\n\n`);
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  try {
    let sentLength = 0;
    for await (const partial of result.partialOutputStream) {
      if (typeof partial.message !== "string" || partial.message.length <= sentLength) continue;
      send({ t: "delta", c: partial.message.slice(sentLength) });
      sentLength = partial.message.length;
    }

    const output = await result.output;
    const action = normalizeAction(output.action, employees, month.value);
    let answer = output.message;
    if (output.action && !action) {
      answer += " Não consegui confirmar todos os dados dessa alteração; podes especificar o funcionário e a data?";
    }
    if (answer.length > sentLength) send({ t: "delta", c: answer.slice(sentLength) });
    send({ t: "done", action });
    response.write("data: [DONE]\n\n");
  } catch (error) {
    console.error("Não foi possível concluir a conversa com OpenRouter:", error);
    send({ t: "error", c: "O assistente não conseguiu responder. Verifica o modelo e a chave do OpenRouter." });
  } finally {
    response.end();
  }
});

export default handler;

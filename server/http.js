export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function withApiErrors(handler) {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      if (error instanceof ApiError) {
        response.status(error.status).json({ detail: error.message });
        return;
      }

      if (error?.code === "23503") {
        response.status(404).json({ detail: "Funcionário não encontrado." });
        return;
      }
      if (error?.code === "23505") {
        response.status(409).json({ detail: "Já existe um registo com estes dados." });
        return;
      }

      console.error("Falha na API:", error);
      response.status(500).json({ detail: "Ocorreu um erro interno. Tenta novamente." });
    }
  };
}

export function requireMethod(request, response, ...allowedMethods) {
  if (!allowedMethods.includes(request.method)) {
    response.setHeader("Allow", allowedMethods.join(", "));
    throw new ApiError(405, "Método não permitido.");
  }
}

export function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body !== "string") throw new ApiError(400, "Corpo JSON obrigatório.");

  try {
    return JSON.parse(request.body);
  } catch {
    throw new ApiError(400, "O corpo do pedido tem JSON inválido.");
  }
}

export function isUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function requireUuid(value) {
  if (!isUuid(value)) throw new ApiError(400, "Identificador de funcionário inválido.");
  return value;
}

export function parseMonth(value) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new ApiError(400, "Mês inválido. Usa o formato AAAA-MM.");
  }

  const [year, monthNumber] = value.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    value,
    year,
    monthNumber,
    days,
    start: `${value}-01`,
    end: monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`,
  };
}

export function validateDate(value, monthValue) {
  const month = parseMonth(monthValue);
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !value.startsWith(`${month.value}-`)) {
    throw new ApiError(400, "A data tem de pertencer ao mês selecionado.");
  }
  const day = Number(value.slice(-2));
  if (day < 1 || day > month.days) throw new ApiError(400, "Data inválida.");
  return value;
}

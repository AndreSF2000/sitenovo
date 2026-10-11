import { getDb } from "../server/db.js";
import { ApiError, readJson, requireMethod, requireUuid, validateDate, withApiErrors } from "../server/http.js";

export default withApiErrors(async (request, response) => {
  requireMethod(request, response, "PUT");
  const body = readJson(request);
  const employeeId = requireUuid(body.employee_id);
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    throw new ApiError(400, "Data inválida.");
  }
  const date = validateDate(body.date, body.date.slice(0, 7));
  const shift = body.shift;
  if (!["day", "night", "off", "custom", "unset"].includes(shift)) {
    throw new ApiError(400, "Turno inválido.");
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 50) throw new ApiError(400, "O texto personalizado não pode exceder 50 caracteres.");
  if (shift === "custom" && !note) throw new ApiError(400, "Escreve um texto para o turno personalizado.");

  const sql = getDb();
  if (shift === "unset") {
    const [employee] = await sql`SELECT id FROM employees WHERE id = ${employeeId}`;
    if (!employee) throw new ApiError(404, "Funcionário não encontrado.");
    await sql`
      DELETE FROM schedule_cells
      WHERE employee_id = ${employeeId} AND work_date = ${date}::date
    `;
    response.status(200).json({ saved: true });
    return;
  }

  const [cell] = await sql`
    INSERT INTO schedule_cells (employee_id, work_date, shift, note)
    VALUES (${employeeId}, ${date}::date, ${shift}, ${shift === "custom" ? note : null})
    ON CONFLICT (employee_id, work_date)
    DO UPDATE SET shift = EXCLUDED.shift, note = EXCLUDED.note
    RETURNING employee_id, work_date::text AS work_date, shift, note
  `;
  response.status(200).json({ saved: true, cell });
});

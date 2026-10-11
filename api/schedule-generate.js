import { getDb } from "../server/db.js";
import { ApiError, parseMonth, readJson, requireMethod, withApiErrors } from "../server/http.js";
import { buildMonthlySchedule } from "../server/schedule.js";

export default withApiErrors(async (request, response) => {
  requireMethod(request, response, "POST");
  const body = readJson(request);
  const month = parseMonth(body.month);
  if (typeof body.overwrite !== "boolean") throw new ApiError(400, "Indica se a escala atual pode ser substituída.");
  const sql = getDb();
  const employees = await sql`SELECT id FROM employees ORDER BY id`;
  if (!employees.length) throw new ApiError(400, "Adiciona pelo menos uma pessoa antes de gerar a escala.");

  const cells = buildMonthlySchedule(employees, month.value);
  const serializedCells = JSON.stringify(cells.map((cell) => ({
    employee_id: cell.employeeId,
    work_date: cell.date,
    shift: cell.shift,
    note: cell.note,
  })));
  const [result] = await sql`
    WITH month_lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtext(${month.value}))
    ),
    existing AS MATERIALIZED (
      SELECT EXISTS (
        SELECT 1 FROM schedule_cells
        WHERE work_date >= ${month.start}::date AND work_date < ${month.end}::date
      ) AS has_rows
      FROM month_lock
    ),
    deleted AS (
      DELETE FROM schedule_cells
      WHERE work_date >= ${month.start}::date AND work_date < ${month.end}::date
        AND ${body.overwrite} AND (SELECT has_rows FROM existing)
      RETURNING 1
    ),
    inserted AS (
      INSERT INTO schedule_cells (employee_id, work_date, shift, note)
      SELECT input.employee_id::uuid, input.work_date::date, input.shift, input.note
      FROM jsonb_to_recordset(${serializedCells}::jsonb)
        AS input(employee_id text, work_date text, shift text, note text)
      CROSS JOIN existing
      CROSS JOIN (SELECT count(*) FROM deleted) AS deletion_barrier
      WHERE ${body.overwrite} OR NOT existing.has_rows
      ON CONFLICT (employee_id, work_date) DO NOTHING
      RETURNING 1
    )
    SELECT existing.has_rows, (SELECT count(*)::int FROM inserted) AS created
    FROM existing
  `;

  if (result.has_rows && !body.overwrite) {
    throw new ApiError(409, "Já existe uma escala para este mês.");
  }
  response.status(200).json({ created: result.created });
});

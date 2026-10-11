import { getDb } from "../server/db.js";
import { parseMonth, requireMethod, withApiErrors } from "../server/http.js";
import { groupScheduleRows } from "../server/schedule.js";

export default withApiErrors(async (request, response) => {
  requireMethod(request, response, "GET");
  const monthValue = request.query.month;
  const month = parseMonth(monthValue);
  const sql = getDb();
  const rows = await sql`
    SELECT employee_id, work_date::text AS work_date, shift, note
    FROM schedule_cells
    WHERE work_date >= ${month.start}::date AND work_date < ${month.end}::date
    ORDER BY work_date, employee_id
  `;
  response.status(200).json(groupScheduleRows(rows));
});

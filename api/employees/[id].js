import { getDb } from "../../server/db.js";
import { ApiError, readJson, requireMethod, requireUuid, withApiErrors } from "../../server/http.js";

const handler = withApiErrors(async (request, response) => {
  requireMethod(request, response, "PUT", "DELETE");
  const id = requireUuid(request.query.id);
  const sql = getDb();

  if (request.method === "DELETE") {
    const deleted = await sql`DELETE FROM employees WHERE id = ${id} RETURNING id`;
    if (!deleted.length) throw new ApiError(404, "Funcionário não encontrado.");
    response.status(200).json({ deleted: true });
    return;
  }

  const body = readJson(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "Novo membro";
  const group = body.group;
  if (!name || name.length > 80) throw new ApiError(400, "O nome tem de ter entre 1 e 80 caracteres.");
  if (role.length > 80) throw new ApiError(400, "A função não pode exceder 80 caracteres.");
  if (!["pizzaiolo", "equipa"].includes(group)) throw new ApiError(400, "Grupo inválido.");

  const [employee] = await sql`
    UPDATE employees
    SET name = ${name}, role = ${role}, employee_group = ${group}
    WHERE id = ${id}
    RETURNING id, name, role, employee_group AS "group"
  `;
  if (!employee) throw new ApiError(404, "Funcionário não encontrado.");
  response.status(200).json(employee);
});

export default handler;

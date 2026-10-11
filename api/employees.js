import { getDb } from "../server/db.js";
import { ApiError, readJson, requireMethod, withApiErrors } from "../server/http.js";

const handler = withApiErrors(async (request, response) => {
  requireMethod(request, response, "GET", "POST");
  const sql = getDb();

  if (request.method === "GET") {
    const employees = await sql`
      SELECT id, name, role, employee_group AS "group"
      FROM employees
      ORDER BY employee_group, name
    `;
    response.status(200).json(employees);
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
    INSERT INTO employees (name, role, employee_group)
    VALUES (${name}, ${role}, ${group})
    RETURNING id, name, role, employee_group AS "group"
  `;
  response.status(201).json(employee);
});

export default handler;

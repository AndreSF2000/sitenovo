import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, validateDate } from "../server/http.js";
import { buildMonthlySchedule, groupScheduleRows } from "../server/schedule.js";

test("monthly generation creates seven unique rest days per employee and balances shifts", () => {
  const employees = Array.from({ length: 8 }, (_, index) => ({ id: `employee-${index}` }));
  const cells = buildMonthlySchedule(employees, "2028-02");
  const daysInMonth = 29;

  assert.equal(cells.length, employees.length * daysInMonth);
  for (const employee of employees) {
    const employeeCells = cells.filter((cell) => cell.employeeId === employee.id);
    const offs = employeeCells.filter((cell) => cell.shift === "off");
    const dayShifts = employeeCells.filter((cell) => cell.shift === "day");
    const nightShifts = employeeCells.filter((cell) => cell.shift === "night");
    assert.equal(offs.length, 7);
    assert.equal(new Set(offs.map((cell) => cell.date)).size, 7);
    assert.ok(Math.abs(dayShifts.length - nightShifts.length) <= 1);
  }
});

test("schedule rows are grouped in the format expected by the frontend", () => {
  assert.deepEqual(
    groupScheduleRows([
      { employee_id: "employee-1", work_date: "2026-10-04", shift: "day", note: null },
      { employee_id: "employee-1", work_date: "2026-10-05", shift: "custom", note: "Até às 20h" },
    ]),
    {
      entries: { "employee-1": { 4: "day", 5: "custom" } },
      notes: { "employee-1": { 5: "Até às 20h" } },
    },
  );
});

test("date validation rejects dates outside the selected month", () => {
  assert.equal(validateDate("2028-02-29", "2028-02"), "2028-02-29");
  assert.throws(() => validateDate("2028-03-01", "2028-02"), ApiError);
  assert.throws(() => validateDate("2028-02-30", "2028-02"), ApiError);
});

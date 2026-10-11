import { parseMonth } from "./http.js";

export function buildMonthlySchedule(employees, monthValue) {
  const month = parseMonth(monthValue);
  const shiftCounts = new Map(employees.map((employee) => [employee.id, { day: 0, night: 0 }]));
  const cells = [];

  for (let day = 1; day <= month.days; day += 1) {
    const date = `${month.value}-${String(day).padStart(2, "0")}`;
    const working = employees.filter((_, index) => {
      for (let off = 0; off < 7; off += 1) {
        if ((Math.floor((off * month.days) / 7) + index) % month.days + 1 === day) return false;
      }
      return true;
    });

    let dayTotal = 0;
    let nightTotal = 0;
    working.forEach((employee, index) => {
      const counts = shiftCounts.get(employee.id);
      const shift = counts.day < counts.night
        ? "day"
        : counts.night < counts.day
          ? "night"
          : dayTotal < nightTotal
            ? "day"
            : nightTotal < dayTotal
              ? "night"
              : (index + day) % 2 === 0
                ? "day"
                : "night";
      counts[shift] += 1;
      if (shift === "day") dayTotal += 1;
      else nightTotal += 1;
      cells.push({ employeeId: employee.id, date, shift, note: null });
    });
  }

  employees.forEach((employee, employeeIndex) => {
    for (let off = 0; off < 7; off += 1) {
      const day = (Math.floor((off * month.days) / 7) + employeeIndex) % month.days + 1;
      cells.push({
        employeeId: employee.id,
        date: `${month.value}-${String(day).padStart(2, "0")}`,
        shift: "off",
        note: null,
      });
    }
  });

  return cells;
}

export function groupScheduleRows(rows) {
  const entries = {};
  const notes = {};

  rows.forEach((row) => {
    const employeeId = row.employee_id;
    const day = Number(String(row.work_date).slice(-2));
    entries[employeeId] ??= {};
    entries[employeeId][day] = row.shift;

    if (row.shift === "custom" && row.note) {
      notes[employeeId] ??= {};
      notes[employeeId][day] = row.note;
    }
  });

  return { entries, notes };
}

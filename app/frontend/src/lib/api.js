import axios from "axios";

const API = "/api";

export const api = {
  employees: () => axios.get(`${API}/employees`).then((r) => r.data),
  createEmployee: (data) => axios.post(`${API}/employees`, data).then((r) => r.data),
  updateEmployee: (id, data) => axios.put(`${API}/employees/${id}`, data).then((r) => r.data),
  deleteEmployee: (id) => axios.delete(`${API}/employees/${id}`).then((r) => r.data),
  schedule: (month) => axios.get(`${API}/schedule`, { params: { month } }).then((r) => r.data),
  setCell: (data) => axios.put(`${API}/schedule-cell`, data).then((r) => r.data),
  generate: (month, overwrite) => axios.post(`${API}/schedule-generate`, { month, overwrite }).then((r) => r.data),
};

export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

export const monthLabel = (month) => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_PT[m - 1]} ${y}`;
};

export const shiftMonth = (month, delta) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const dayWeekday = (month, day) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, day).getDay();
};

export const countShift = (entries, empId, day, shift) => entries[empId]?.[day] === shift;

export const offsUsed = (entries, empId) =>
  Object.values(entries[empId] || {}).filter((s) => s === "off").length;

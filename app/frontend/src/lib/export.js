import { monthLabel, dayWeekday } from "./api";

const cellText = (entries, notes, empId, d) => {
  const s = entries[empId]?.[d];
  if (s === "day") return "D";
  if (s === "night") return "N";
  if (s === "off") return "F";
  if (s === "custom") return (notes[empId]?.[d] || "*").slice(0, 12);
  return "";
};

const RULES = "D = Dia (Dom–Qui 11:00–18:00 · Sex–Sáb 11:00–19:00)   N = Noite (Dom–Qui 18:00–00:00 · Sex–Sáb 19:00–02:00)   F = Folga";

export async function exportExcel(employees, entries, notes, month) {
  const { default: ExcelJS } = await import("exceljs");
  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const rows = [
    [`Mr Pizza — Escala de ${monthLabel(month)}`],
    [RULES],
    [],
    ["Funcionário", "Grupo", ...days.map(String), "Folgas"],
  ];
  employees.forEach((e) => {
    const offs = days.filter((d) => entries[e.id]?.[d] === "off").length;
    rows.push([
      e.name,
      e.group === "pizzaiolo" ? "Pizzaiolo" : "Equipa",
      ...days.map((d) => cellText(entries, notes, e.id, d)),
      `${offs}/7`,
    ]);
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Escala");
  worksheet.addRows(rows);
  worksheet.columns = [
    { width: 22 },
    { width: 10 },
    ...days.map(() => ({ width: 5 })),
    { width: 8 },
  ];

  const file = new Blob([await workbook.xlsx.writeBuffer()], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mr-pizza-escala-${month}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPdf(employees, entries, notes, month) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(224, 83, 60);
  doc.text(`Mr Pizza — Escala de ${monthLabel(month)}`, 40, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110, 100, 90);
  doc.text(RULES, 40, 50);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-PT")} · ${employees.length} pessoas`, 40, 61);

  autoTable(doc, {
    startY: 70,
    head: [["Funcionário", ...days.map(String)]],
    body: employees.map((e) => [
      `${e.name}${e.group === "pizzaiolo" ? "  🍕" : ""}`,
      ...days.map((d) => cellText(entries, notes, e.id, d)),
    ]),
    styles: { fontSize: 5.6, cellPadding: 1.6, halign: "center", textColor: [40, 34, 30] },
    headStyles: { fillColor: [224, 83, 60], textColor: [255, 255, 255], fontSize: 5.6, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 243, 238] },
    columnStyles: { 0: { halign: "left", cellWidth: 78, fontStyle: "bold" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0) {
        const v = data.cell.raw;
        if (v === "D") data.cell.styles.textColor = [46, 125, 50];
        if (v === "N") data.cell.styles.textColor = [21, 101, 192];
        if (v === "F") data.cell.styles.textColor = [150, 150, 150];
        const wd = dayWeekday(month, data.column.index);
        if (wd === 0 || wd === 6) data.cell.styles.fillColor = [252, 243, 224];
      }
      if (data.section === "head" && data.column.index > 0) {
        const wd = dayWeekday(month, data.column.index);
        if (wd === 0 || wd === 6) data.cell.styles.fillColor = [229, 169, 60];
      }
    },
    margin: { left: 40, right: 40 },
  });
  doc.save(`mr-pizza-escala-${month}.pdf`);
}

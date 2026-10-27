import { today } from "../domain";
import type { ReportCell, ReportData } from "./reportData";

const escapeCell = (value: ReportCell) => {
  const text = String(value ?? "");
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

export function exportReportCsv(report: ReportData) {
  const rows = report.sheets.flatMap((sheet) => [
    [sheet.name],
    ...sheet.rows,
    [],
  ]);
  const csv = rows
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `billwise-report-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

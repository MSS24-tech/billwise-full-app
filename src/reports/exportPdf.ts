import { dateLabel, today } from "../domain";
import type { ReportData, ReportSheet } from "./reportData";

const currency = (amount: number) =>
  `INR ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;

function formatPdfRows(sheet: ReportSheet, report: ReportData) {
  return sheet.rows.slice(1).map((row, rowIndex) =>
    row.map((value, columnIndex) => {
      if (sheet.dateColumn === columnIndex && typeof value === "string") {
        return dateLabel(value);
      }
      if (
        sheet.name === "Summary" &&
        report.summaryCurrencyRows.includes(rowIndex + 1) &&
        typeof value === "number"
      ) {
        return currency(value);
      }
      if (
        sheet.name !== "Summary" &&
        sheet.currencyColumns.includes(columnIndex) &&
        typeof value === "number"
      ) {
        return currency(value);
      }
      return String(value);
    }),
  );
}

export async function exportReportPdf(report: ReportData) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const primary = [86, 72, 218] as [number, number, number];
  const muted = [100, 105, 120] as [number, number, number];
  const baseStyles = {
    theme: "grid" as const,
    margin: { left: 14, right: 14, bottom: 14 },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      lineColor: [220, 222, 230] as [number, number, number],
      lineWidth: 0.15,
      overflow: "linebreak" as const,
      valign: "middle" as const,
    },
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
    },
    alternateRowStyles: {
      fillColor: [247, 248, 252] as [number, number, number],
    },
  };
  const addFooter = () => {
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.setFontSize(8);
      pdf.setTextColor(muted[0], muted[1], muted[2]);
      pdf.text(
        `Page ${page} of ${pageCount}`,
        pdf.internal.pageSize.getWidth() - 14,
        pdf.internal.pageSize.getHeight() - 8,
        { align: "right" },
      );
    }
  };

  for (const [index, sheet] of report.sheets.entries()) {
    if (index > 0) pdf.addPage();
    if (index === 0) {
      pdf.setTextColor(35, 38, 50);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Billwise sales report", 14, 18);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(muted[0], muted[1], muted[2]);
      pdf.text(report.businessName, 14, 25);
      pdf.text(`Generated: ${report.generatedAt}`, 14, 30);
    } else {
      pdf.setTextColor(35, 38, 50);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(sheet.name, 14, 20);
    }

    const fontSize =
      sheet.rows[0].length > 10 ? 6.3 : sheet.rows[0].length > 7 ? 7 : 8;
    autoTable(pdf, {
      ...baseStyles,
      startY: index === 0 ? 36 : 26,
      head: [sheet.rows[0].map(String)],
      body: formatPdfRows(sheet, report),
      styles: { ...baseStyles.styles, fontSize, cellPadding: 1.8 },
      didParseCell: (hook) => {
        if (hook.section === "body" && index === 0 && hook.column.index === 0) {
          hook.cell.styles.fontStyle = "bold";
        }
      },
      rowPageBreak: "avoid",
      showHead: "everyPage",
    });
  }
  addFooter();
  pdf.save(`billwise-report-${today()}.pdf`);
}

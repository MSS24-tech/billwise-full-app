import { today } from "../domain";
import type { Business, Product, Sale } from "../domain";

export type ReportCell = string | number;

export type ReportSheet = {
  name: string;
  rows: ReportCell[][];
  currencyColumns: number[];
  quantityColumns: number[];
  dateColumn?: number;
};

export type ReportData = {
  businessName: string;
  generatedAt: string;
  invoices: {
    Invoice: string;
    Date: string;
    Customer: string;
    Total: number;
    Paid: number;
    Balance: number;
    Status: string;
    Place: string;
    Supply: string;
    TaxableSubtotal: number;
    Discount: number;
    GST: number;
  }[];
  products: {
    name: string;
    sku: string;
    unitsSold: number;
    stock: number;
    stockValue: number;
  }[];
  sheets: ReportSheet[];
  summaryCurrencyRows: number[];
};

export function buildReportData(
  business: Business,
  products: Product[],
  sales: Sale[],
): ReportData {
  const invoices = sales.map((sale) => ({
    Invoice: sale.number,
    Date: sale.date,
    Customer: sale.customerName,
    Total: sale.total,
    Paid: sale.paid,
    Balance: Math.max(0, sale.total - sale.paid),
    Status: sale.status,
    Place: sale.place,
    Supply: sale.supply,
    TaxableSubtotal: sale.taxableSubtotal ?? sale.subtotal,
    Discount: sale.discountAmount ?? (sale.subtotal * sale.discount) / 100,
    GST: sale.tax,
  }));
  const unitsSoldByProduct = new Map<string, number>();
  for (const sale of sales) {
    for (const line of sale.lines) {
      unitsSoldByProduct.set(
        line.productId,
        (unitsSoldByProduct.get(line.productId) ?? 0) + line.qty,
      );
    }
  }
  const productReports = products
    .map((product) => ({
      name: product.name,
      sku: product.sku,
      unitsSold: unitsSoldByProduct.get(product.id) ?? 0,
      stock: product.stock,
      stockValue: product.stock * product.cost,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold);
  const unitsSoldTotal = sales.reduce(
    (total, sale) =>
      total + sale.lines.reduce((quantity, line) => quantity + line.qty, 0),
    0,
  );
  const summaryRows: ReportCell[][] = [
    ["Metric", "Value"],
    ["Business", business.name || "Business"],
    ["Generated", today()],
    ["Gross sales", sales.reduce((total, sale) => total + sale.total, 0)],
    ["Tax collected", sales.reduce((total, sale) => total + sale.tax, 0)],
    ["Discounts", invoices.reduce((total, invoice) => total + invoice.Discount, 0)],
    ["Payments received", sales.reduce((total, sale) => total + sale.paid, 0)],
    [
      "Outstanding",
      sales.reduce(
        (total, sale) => total + Math.max(0, sale.total - sale.paid),
        0,
      ),
    ],
    ["Invoices", sales.length],
    ["Units sold", unitsSoldTotal],
  ];
  const invoiceRows: ReportCell[][] = [
    [
      "Invoice",
      "Date",
      "Customer",
      "Place of supply",
      "Supply type",
      "Taxable subtotal",
      "Discount",
      "GST",
      "Total",
      "Paid",
      "Balance",
      "Status",
    ],
    ...invoices.map((invoice) => [
      invoice.Invoice,
      invoice.Date,
      invoice.Customer,
      invoice.Place,
      invoice.Supply,
      invoice.TaxableSubtotal,
      invoice.Discount,
      invoice.GST,
      invoice.Total,
      invoice.Paid,
      invoice.Balance,
      invoice.Status,
    ]),
  ];
  const itemRows: ReportCell[][] = [
    [
      "Invoice",
      "Date",
      "Customer",
      "Product",
      "SKU",
      "HSN/SAC",
      "Quantity",
      "Unit price incl. GST",
      "GST rate",
      "Line total incl. GST",
    ],
    ...sales.flatMap((sale) =>
      sale.lines.map((line) => [
        sale.number,
        sale.date,
        sale.customerName,
        line.name,
        products.find((product) => product.id === line.productId)?.sku ?? "",
        line.hsn,
        line.qty,
        line.rate,
        line.gst,
        line.rate * line.qty,
      ]),
    ),
  ];
  const productRows: ReportCell[][] = [
    [
      "Product",
      "SKU",
      "Barcode",
      "HSN/SAC",
      "Unit",
      "Cost per unit",
      "Selling price incl. GST",
      "GST rate",
      "Units sold",
      "Stock on hand",
      "Low stock threshold",
      "Stock cost value",
    ],
    ...products
      .map((product) => ({
        ...product,
        unitsSold: unitsSoldByProduct.get(product.id) ?? 0,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .map((product) => [
        product.name,
        product.sku,
        product.barcode ?? "",
        product.hsn,
        product.unit,
        product.cost,
        product.price,
        product.gst,
        product.unitsSold,
        product.stock,
        product.minStock,
        product.stock * product.cost,
      ]),
  ];
  const summaryCurrencyRows = [3, 4, 5, 6, 7];

  return {
    businessName: business.name || "Business",
    generatedAt: today(),
    invoices,
    products: productReports,
    sheets: [
      {
        name: "Summary",
        rows: summaryRows,
        currencyColumns: [],
        quantityColumns: [],
      },
      {
        name: "Invoices",
        rows: invoiceRows,
        currencyColumns: [5, 6, 7, 8, 9, 10],
        quantityColumns: [],
        dateColumn: 1,
      },
      {
        name: "Items sold",
        rows: itemRows,
        currencyColumns: [7, 9],
        quantityColumns: [6],
        dateColumn: 1,
      },
      {
        name: "Products",
        rows: productRows,
        currencyColumns: [5, 6, 11],
        quantityColumns: [8, 9, 10],
      },
    ],
    summaryCurrencyRows,
  };
}

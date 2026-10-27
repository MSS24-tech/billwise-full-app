import { calculateSaleTotals, id, roundMoney } from "../domain";
import type {
  Business,
  Customer,
  Product,
  Proforma,
  PurchaseEntry,
  Sale,
  SaleLine,
  StockBatch,
} from "../domain";

type PurchaseLineDraft = {
  productId: string;
  qty: number;
  unitCost: number;
  gst: number;
  batchCode?: string;
  expiryDate?: string;
};

function isValidDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function createPurchaseEntry({
  products,
  purchases,
  date,
  supplier,
  supplierInvoice,
  notes,
  lines,
}: {
  products: Product[];
  purchases: PurchaseEntry[];
  date: string;
  supplier: string;
  supplierInvoice: string;
  notes: string;
  lines: PurchaseLineDraft[];
}):
  | { ok: true; entry: PurchaseEntry; products: Product[] }
  | { ok: false; message: string } {
  if (!isValidDate(date) || !supplier.trim()) {
    return { ok: false, message: "Enter a valid date and supplier name." };
  }
  if (!lines.length) {
    return { ok: false, message: "Add at least one product to this purchase." };
  }
  for (const line of lines) {
    if (
      !products.some((product) => product.id === line.productId) ||
      !Number.isFinite(line.qty) ||
      line.qty <= 0 ||
      !Number.isFinite(line.unitCost) ||
      line.unitCost < 0 ||
      !Number.isFinite(line.gst) ||
      line.gst < 0 ||
      (line.expiryDate && !isValidDate(line.expiryDate)) ||
      !Number.isFinite(line.qty * line.unitCost) ||
      !Number.isFinite(line.qty * line.unitCost * (1 + line.gst / 100))
    ) {
      return {
        ok: false,
        message: "Check each product, quantity, cost, and GST rate.",
      };
    }
  }
  const entryLines = lines.map((line) => ({
    ...line,
    batchCode: line.batchCode?.trim() || "",
    expiryDate: line.expiryDate || "",
    productName:
      products.find((product) => product.id === line.productId)?.name ?? "",
  }));
  const subtotal = roundMoney(
    entryLines.reduce((sum, line) => sum + line.qty * line.unitCost, 0),
  );
  const tax = roundMoney(
    entryLines.reduce(
      (sum, line) => sum + (line.qty * line.unitCost * line.gst) / 100,
      0,
    ),
  );
  if (!Number.isFinite(subtotal) || !Number.isFinite(tax)) {
    return { ok: false, message: "Purchase totals are outside the supported range." };
  }
  const entry: PurchaseEntry = {
    id: id(),
    number: `PUR-${String(purchases.length + 1).padStart(4, "0")}`,
    date,
    supplier: supplier.trim(),
    supplierInvoice: supplierInvoice.trim(),
    notes: notes.trim(),
    lines: entryLines,
    subtotal,
    tax,
    total: roundMoney(subtotal + tax),
  };
  const quantities = new Map<string, number>();
  const latestCosts = new Map<string, number>();
  const incomingBatches = new Map<string, StockBatch[]>();
  for (const line of entryLines) {
    quantities.set(
      line.productId,
      (quantities.get(line.productId) ?? 0) + line.qty,
    );
    latestCosts.set(line.productId, line.unitCost);
    if (line.batchCode || line.expiryDate) {
      const current = incomingBatches.get(line.productId) ?? [];
      current.push({
        id: id(),
        code: line.batchCode ?? "",
        expiryDate: line.expiryDate ?? "",
        receivedDate: date,
        quantity: line.qty,
      });
      incomingBatches.set(line.productId, current);
    }
  }
  const updatedProducts = products.map((product) => {
    const quantity = quantities.get(product.id) ?? 0;
    const incoming = incomingBatches.get(product.id) ?? [];
    const batchedQuantity = incoming.reduce(
      (sum, batch) => sum + batch.quantity,
      0,
    );
    const existingBatchQuantity = (product.batches ?? []).reduce(
      (sum, batch) => sum + batch.quantity,
      0,
    );
    const unbatched =
      product.unbatchedStock ?? product.stock - existingBatchQuantity;
    return {
      ...product,
      stock: product.stock + quantity,
      cost: latestCosts.get(product.id) ?? product.cost,
      batches: [...(product.batches ?? []), ...incoming],
      unbatchedStock: unbatched + quantity - batchedQuantity,
    };
  });
  if (updatedProducts.some((product) => !Number.isFinite(product.stock))) {
    return { ok: false, message: "Purchase quantity exceeds the supported stock range." };
  }
  return {
    ok: true,
    entry,
    products: updatedProducts,
  };
}

export function createProforma({
  business,
  proformas,
  customer,
  date,
  validUntil,
  place,
  supply,
  lines,
  discount,
  notes,
}: {
  business: Business;
  proformas: Proforma[];
  customer: Customer | undefined;
  date: string;
  validUntil: string;
  place: string;
  supply: Sale["supply"];
  lines: SaleLine[];
  discount: number;
  notes: string;
}): { ok: true; proforma: Proforma } | { ok: false; message: string } {
  if (!business.name.trim() || !business.state.trim()) {
    return {
      ok: false,
      message: "Enter your business name and state in Settings before creating a proforma.",
    };
  }
  if (!isValidDate(date) || !isValidDate(validUntil) || !place.trim()) {
    return {
      ok: false,
      message: "Enter valid issue and validity dates, and a place of supply.",
    };
  }
  if (validUntil < date) {
    return {
      ok: false,
      message: "Proforma validity date cannot be before its issue date.",
    };
  }
  if (!customer || !lines.length) {
    return {
      ok: false,
      message: "Select a customer and add at least one item.",
    };
  }
  if (lines.some((line) => !Number.isFinite(line.qty) || line.qty <= 0)) {
    return { ok: false, message: "Each item must have a quantity greater than zero." };
  }
  const totals = calculateSaleTotals(lines, discount, supply);
  if (
    ![
      totals.subtotal,
      totals.discountAmount,
      totals.taxableSubtotal,
      totals.tax,
      totals.total,
    ].every(Number.isFinite)
  ) {
    return { ok: false, message: "Proforma totals are outside the supported range." };
  }
  const number = `PF-${String(proformas.length + 1).padStart(4, "0")}`;
  return {
    ok: true,
    proforma: {
      id: id(),
      number,
      date,
      validUntil,
      due: "",
      customerId: customer.id,
      customerName: customer.name,
      customerGstin: customer.gstin,
      place,
      supply,
      lines,
      discount: totals.discount,
      discountAmount: totals.discountAmount,
      subtotal: totals.subtotal,
      taxableSubtotal: totals.taxableSubtotal,
      tax: totals.tax,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      roundingAdjustment: totals.roundingAdjustment,
      total: totals.total,
      paid: 0,
      status: "Open",
      notes,
      pricesIncludeGst: true,
    },
  };
}

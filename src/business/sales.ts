import {
  calculateSaleTotals,
  id,
  saleQuantitiesByProduct,
  updateStockForSale,
} from "../domain";
import type {
  Business,
  Customer,
  Product,
  Sale,
  SaleLine,
  SaleTotals,
} from "../domain";

type SaleDraft = {
  business: Business;
  sales: Sale[];
  products: Product[];
  customer: Customer | undefined;
  date: string;
  place: string;
  due?: string;
  supply: Sale["supply"];
  lines: SaleLine[];
  totals: SaleTotals;
  paid: number;
  notes: string;
};

export type CreateSaleResult =
  | { ok: true; sale: Sale; products: Product[] }
  | { ok: false; message: string };

export function getSaleSupply(
  businessState: string,
  placeOfSupply: string,
): Sale["supply"] {
  return businessState.trim() &&
    placeOfSupply.trim() &&
    businessState.trim().toLowerCase() === placeOfSupply.trim().toLowerCase()
    ? "Intra-state"
    : "Inter-state";
}

export function buildSalePreview(
  saleLines: { productId: string; qty: number }[],
  products: Product[],
  discount: string,
  supply: Sale["supply"],
) {
  const lines = saleLines
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return product
        ? {
            productId: product.id,
            name: product.name,
            hsn: product.hsn,
            qty: Math.max(0, Number(line.qty) || 0),
            rate: product.price,
            gst: product.gst,
            cost: product.cost,
            amount: product.price * Math.max(0, Number(line.qty) || 0),
          }
        : null;
    })
    .filter((line): line is SaleLine & { amount: number } => line !== null);
  return {
    lines,
    ...calculateSaleTotals(lines, Number(discount) || 0, supply),
  };
}

export function createSale(draft: SaleDraft): CreateSaleResult {
  const { business, sales, products, customer, date, place, lines, totals } =
    draft;
  if (!business.name.trim() || !business.state.trim()) {
    return {
      ok: false,
      message: "Enter your business name and state in Settings before creating an invoice.",
    };
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date;
  if (!validDate || !place.trim()) {
    return {
      ok: false,
      message: "Enter a valid invoice date (YYYY-MM-DD) and place of supply.",
    };
  }
  if (draft.due) {
    const dueDate = new Date(`${draft.due}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.due) ||
      !Number.isFinite(dueDate.getTime()) ||
      dueDate.toISOString().slice(0, 10) !== draft.due
    ) {
      return { ok: false, message: "Enter a valid payment due date." };
    }
  }
  if (!customer || !lines.length) {
    return {
      ok: false,
      message: "Select a customer and add at least one item.",
    };
  }
  for (const [productId, quantity] of saleQuantitiesByProduct(lines)) {
    const product = products.find((item) => item.id === productId);
    if (
      !product ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > product.stock
    ) {
      return {
        ok: false,
        message: `Not enough stock for ${product?.name ?? "a selected product"}. Available: ${product?.stock ?? 0}; requested: ${quantity}.`,
      };
    }
  }
  const paid = Math.min(totals.total, Math.max(0, Number(draft.paid) || 0));
  const number = business.prefix + String(sales.length + 1).padStart(4, "0");
  const sale: Sale = {
    id: id(),
    number,
    date,
    due: draft.due ?? "",
    customerId: customer.id,
    customerName: customer.name,
    customerGstin: customer.gstin,
    place,
    supply: draft.supply,
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
    paid,
    status:
      paid >= totals.total ? "Paid" : paid > 0 ? "Part-paid" : "Unpaid",
    notes: draft.notes,
    pricesIncludeGst: true,
  };
  return {
    ok: true,
    sale,
    products: updateStockForSale(products, lines, -1),
  };
}

export function recordSalePayment(sale: Sale, amount: number): Sale {
  const paid = Math.min(sale.total, sale.paid + amount);
  return {
    ...sale,
    paid,
    status: paid >= sale.total ? "Paid" : "Part-paid",
  };
}

export function restoreStockForDeletedSale(
  products: Product[],
  sale: Sale,
): Product[] {
  return updateStockForSale(products, sale.lines, 1);
}

export function addProductQuantity(
  lines: { productId: string; qty: number }[],
  product: Product,
): { ok: true; lines: { productId: string; qty: number }[] } | {
  ok: false;
  message: string;
} {
  const currentQty = lines.reduce(
    (quantity, line) =>
      line.productId === product.id ? quantity + line.qty : quantity,
    0,
  );
  if (currentQty >= product.stock) {
    return { ok: false, message: `No more stock available for ${product.name}.` };
  }
  const existing = lines.find((line) => line.productId === product.id);
  return {
    ok: true,
    lines: existing
      ? lines.map((line) =>
          line.productId === product.id ? { ...line, qty: line.qty + 1 } : line,
        )
      : [...lines, { productId: product.id, qty: 1 }],
  };
}

export function findProductByScan(
  products: Product[],
  scannedCode: string,
): Product | undefined {
  const code = scannedCode.trim().toLowerCase();
  if (!code) return undefined;
  return (
    products.find((item) => item.barcode?.trim().toLowerCase() === code) ??
    products.find((item) => item.sku.trim().toLowerCase() === code)
  );
}

export function getNextAvailableSaleProduct(
  products: Product[],
  lines: { productId: string; qty: number }[],
) {
  return products.find(
    (product) =>
      product.stock > 0 &&
      !lines.some((line) => line.productId === product.id),
  );
}

export function adjustProductStock(
  product: Product,
  amount: number,
): { ok: true; product: Product } | { ok: false; message: string } {
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, message: "Enter a non-zero quantity." };
  }
  if (product.stock + amount < 0) {
    return { ok: false, message: "Stock cannot be negative." };
  }
  const batchStock = (product.batches ?? []).reduce(
    (sum, batch) => sum + batch.quantity,
    0,
  );
  const unbatched =
    product.unbatchedStock ?? product.stock - batchStock;
  if (amount > 0) {
    return {
      ok: true,
      product: {
        ...product,
        stock: product.stock + amount,
        unbatchedStock: unbatched + amount,
      },
    };
  }
  let removeFromBatches = Math.max(0, -amount - unbatched);
  const updatedBatches = [...(product.batches ?? [])]
    .sort((a, b) => {
      if (!a.expiryDate) return b.expiryDate ? 1 : 0;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    })
    .map((batch) => {
      const removed = Math.min(batch.quantity, removeFromBatches);
      removeFromBatches -= removed;
      return { ...batch, quantity: batch.quantity - removed };
    });
  return {
    ok: true,
    product: {
      ...product,
      stock: product.stock + amount,
      batches: updatedBatches,
      unbatchedStock: Math.max(0, unbatched + amount),
    },
  };
}

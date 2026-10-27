import { id, roundMoney } from "../domain";
import type {
  Expense,
  Product,
  PurchaseEntry,
  Sale,
  SalesReturn,
  SupplierPayment,
} from "../domain";

function validDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function createSalesReturn({
  sale,
  returns,
  products,
  date,
  quantities,
  refundAmount,
  notes,
}: {
  sale: Sale | undefined;
  returns: SalesReturn[];
  products: Product[];
  date: string;
  quantities: Record<string, number>;
  refundAmount: number;
  notes: string;
}):
  | { ok: true; entry: SalesReturn; products: Product[] }
  | { ok: false; message: string } {
  if (!sale || !validDate(date)) {
    return { ok: false, message: "Select an invoice and enter a valid return date." };
  }
  const priorReturns = returns.filter((entry) => entry.saleId === sale.id);
  const alreadyReturned = new Map<string, number>();
  for (const entry of priorReturns) {
    for (const line of entry.lines) {
      alreadyReturned.set(
        line.productId,
        (alreadyReturned.get(line.productId) ?? 0) + line.qty,
      );
    }
  }
  const lines = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => {
      const soldLines = sale.lines.filter((line) => line.productId === productId);
      const soldQuantity = soldLines.reduce((sum, line) => sum + line.qty, 0);
      return soldLines.length
        ? {
            productId,
            productName: soldLines[0].name,
            qty,
            amount: roundMoney(
              (soldLines.reduce(
                (sum, line) => sum + line.rate * line.qty,
                0,
              ) /
                soldQuantity) *
                qty *
                (1 - sale.discount / 100),
            ),
          }
        : null;
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);
  if (
    !lines.length ||
    lines.some((line) => {
      const soldQty = sale.lines
        .filter((item) => item.productId === line.productId)
        .reduce((sum, item) => sum + item.qty, 0);
      return (
        !Number.isFinite(line.qty) ||
        line.qty <= 0 ||
        line.qty + (alreadyReturned.get(line.productId) ?? 0) > soldQty
      );
    })
  ) {
    return {
      ok: false,
      message: "Return quantities must be positive and cannot exceed the unreturned quantity.",
    };
  }
  const priorRefund = priorReturns.reduce((sum, entry) => sum + entry.refundAmount, 0);
  const returnValue = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
  const remainingPaid = Math.max(0, sale.paid - priorRefund);
  if (
    !Number.isFinite(refundAmount) ||
    refundAmount < 0 ||
    refundAmount > Math.min(returnValue, remainingPaid)
  ) {
    return {
      ok: false,
      message: `Refund cannot exceed the returned item value or the remaining amount paid (${roundMoney(Math.min(returnValue, remainingPaid))}).`,
    };
  }
  const entry: SalesReturn = {
    id: id(),
    number: `RET-${String(returns.length + 1).padStart(4, "0")}`,
    saleId: sale.id,
    saleNumber: sale.number,
    customerName: sale.customerName,
    date,
    lines,
    refundAmount: roundMoney(refundAmount),
    notes: notes.trim(),
  };
  const updatedProducts = products.map((product) => {
    const qty = lines
      .filter((line) => line.productId === product.id)
      .reduce((sum, line) => sum + line.qty, 0);
    return qty
      ? {
          ...product,
          stock: product.stock + qty,
          unbatchedStock:
            (product.unbatchedStock ??
              product.stock -
                (product.batches ?? []).reduce(
                  (sum, batch) => sum + batch.quantity,
                  0,
                )) + qty,
        }
      : product;
  });
  return { ok: true, entry, products: updatedProducts };
}

export function getSaleBalance(sale: Sale, returns: SalesReturn[]) {
  const relatedReturns = returns.filter((entry) => entry.saleId === sale.id);
  const returnValue = relatedReturns.reduce(
    (sum, entry) =>
      sum + entry.lines.reduce((lineSum, line) => lineSum + line.amount, 0),
    0,
  );
  const refunds = relatedReturns.reduce((sum, entry) => sum + entry.refundAmount, 0);
  return {
    total: Math.max(0, sale.total - returnValue),
    paid: Math.max(0, sale.paid - refunds),
    balance: Math.max(0, sale.total - returnValue - sale.paid + refunds),
  };
}

export function createExpense({
  expenses,
  date,
  category,
  description,
  amount,
  paymentMethod,
}: {
  expenses: Expense[];
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
}): { ok: true; expense: Expense } | { ok: false; message: string } {
  if (
    !validDate(date) ||
    !category.trim() ||
    !description.trim() ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return { ok: false, message: "Enter a valid date, category, description, and positive amount." };
  }
  return {
    ok: true,
    expense: {
      id: id(),
      date,
      category: category.trim(),
      description: description.trim(),
      amount: roundMoney(amount),
      paymentMethod,
    },
  };
}

export function createSupplierPayment({
  purchase,
  payments,
  date,
  amount,
  notes,
}: {
  purchase: PurchaseEntry | undefined;
  payments: SupplierPayment[];
  date: string;
  amount: number;
  notes: string;
}): { ok: true; payment: SupplierPayment } | { ok: false; message: string } {
  if (!purchase || !validDate(date) || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Select a purchase and enter a valid date and payment amount." };
  }
  const previouslyPaid = payments
    .filter((payment) => payment.purchaseId === purchase.id)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const balance = roundMoney(purchase.total - previouslyPaid);
  if (amount > balance) {
    return { ok: false, message: `Payment exceeds the remaining purchase balance of ${balance.toFixed(2)}.` };
  }
  return {
    ok: true,
    payment: {
      id: id(),
      purchaseId: purchase.id,
      purchaseNumber: purchase.number,
      supplier: purchase.supplier,
      date,
      amount: roundMoney(amount),
      notes: notes.trim(),
    },
  };
}

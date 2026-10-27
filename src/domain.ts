export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  hsn: string;
  unit: string;
  cost: number;
  price: number;
  gst: number;
  stock: number;
  minStock: number;
  minMarginPct?: number;
  batches?: StockBatch[];
  unbatchedStock?: number;
};
export type StockBatch = {
  id: string;
  code: string;
  expiryDate: string;
  receivedDate: string;
  quantity: number;
};
export type Customer = {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
};
export type Business = {
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  prefix: string;
};
export type SaleLine = {
  productId: string;
  name: string;
  hsn: string;
  qty: number;
  rate: number;
  gst: number;
  cost: number;
};
export type Sale = {
  id: string;
  number: string;
  date: string;
  due: string;
  customerId: string;
  customerName: string;
  customerGstin: string;
  place: string;
  supply: "Intra-state" | "Inter-state";
  lines: SaleLine[];
  discount: number;
  discountAmount?: number;
  subtotal: number;
  taxableSubtotal?: number;
  tax: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  roundingAdjustment?: number;
  total: number;
  paid: number;
  status: "Paid" | "Part-paid" | "Unpaid";
  notes: string;
  pricesIncludeGst?: boolean;
  followUpStatus?: "Not contacted" | "Contacted" | "Promised";
};
export type Proforma = Omit<Sale, "status"> & {
  status: "Open" | "Converted";
  validUntil: string;
  convertedSaleId?: string;
};
export type PurchaseEntry = {
  id: string;
  number: string;
  date: string;
  supplier: string;
  supplierInvoice: string;
  notes: string;
  lines: {
    productId: string;
    productName: string;
    qty: number;
    unitCost: number;
    gst: number;
    batchCode?: string;
    expiryDate?: string;
  }[];
  subtotal: number;
  tax: number;
  total: number;
};
export type SalesReturn = {
  id: string;
  number: string;
  saleId: string;
  saleNumber: string;
  customerName: string;
  date: string;
  lines: { productId: string; productName: string; qty: number; amount: number }[];
  refundAmount: number;
  notes: string;
};
export type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
};
export type SupplierPayment = {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  supplier: string;
  date: string;
  amount: number;
  notes: string;
};
export type SalePayment = {
  id: string;
  saleId: string;
  date: string;
  amount: number;
};
export type SaleTotals = {
  subtotal: number;
  discount: number;
  discountAmount: number;
  taxableSubtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  roundingAdjustment: number;
  total: number;
};
export const saleQuantitiesByProduct = (
  lines: Pick<SaleLine, "productId" | "qty">[],
) =>
  lines.reduce((quantities, line) => {
    quantities.set(
      line.productId,
      (quantities.get(line.productId) ?? 0) + line.qty,
    );
    return quantities;
  }, new Map<string, number>());
export const updateStockForSale = (
  products: Product[],
  lines: Pick<SaleLine, "productId" | "qty">[],
  direction: 1 | -1,
) => {
  const quantities = saleQuantitiesByProduct(lines);
  return products.map((product) => {
    const quantity = quantities.get(product.id);
    if (quantity === undefined) return product;
    const batches = product.batches ?? [];
    if (direction === 1) {
      return {
        ...product,
        stock: product.stock + quantity,
        unbatchedStock:
          (product.unbatchedStock ??
            product.stock - batches.reduce((sum, batch) => sum + batch.quantity, 0)) +
          quantity,
      };
    }
    let remaining = quantity;
    const sortedBatches = [...batches].sort((a, b) => {
      if (!a.expiryDate) return b.expiryDate ? 1 : 0;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });
    const updatedBatches = sortedBatches.map((batch) => {
      if (remaining <= 0) return batch;
      const deducted = Math.min(batch.quantity, remaining);
      remaining -= deducted;
      return { ...batch, quantity: batch.quantity - deducted };
    });
    const unbatched =
      product.unbatchedStock ??
      product.stock - batches.reduce((sum, batch) => sum + batch.quantity, 0);
    const remainingUnbatched = Math.max(0, unbatched - remaining);
    return {
      ...product,
      stock: product.stock - quantity,
      batches: updatedBatches,
      unbatchedStock: remainingUnbatched,
    };
  });
};
export type Tab =
  | "Overview"
  | "New sale"
  | "Sales invoices"
  | "Proforma invoices"
  | "New proforma"
  | "Purchases"
  | "Sales returns"
  | "Expenses & cashbook"
  | "Payment reminders"
  | "Supplier payments"
  | "Products"
  | "Customers"
  | "Inventory"
  | "Reports"
  | "Settings";
export const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
export const roundMoney = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;
export const priceWithGst = (amount: number, gstRate: number) =>
  roundMoney(amount * (1 + gstRate / 100));
export const roundToRupee = (amount: number) => {
  if (!Number.isFinite(amount)) return 0;
  return Math.ceil(amount);
};
export const calculateSaleTotals = (
  lines: SaleLine[],
  discountRate: number,
  supply: Sale["supply"],
): SaleTotals => {
  const discount = Number.isFinite(discountRate)
    ? Math.min(100, Math.max(0, discountRate))
    : 0;
  const calculatedLines = lines.map((line) => {
    const amount = roundMoney(line.rate * line.qty);
    const discountedAmount = roundMoney(amount * (1 - discount / 100));
    const taxableAmount = roundMoney(
      discountedAmount / (1 + line.gst / 100),
    );
    const lineTax = roundMoney(discountedAmount - taxableAmount);
    const cgst = supply === "Intra-state" ? roundMoney(lineTax / 2) : 0;
    const sgst =
      supply === "Intra-state" ? roundMoney(lineTax - cgst) : 0;
    return {
      ...line,
      amount,
      discountedAmount,
      taxableAmount,
      cgst,
      sgst,
      igst: supply === "Inter-state" ? lineTax : 0,
    };
  });
  const subtotal = roundMoney(
    calculatedLines.reduce((sum, line) => sum + line.amount, 0),
  );
  const taxableSubtotal = roundMoney(
    calculatedLines.reduce((sum, line) => sum + line.taxableAmount, 0),
  );
  const discountedSubtotal = roundMoney(
    calculatedLines.reduce((sum, line) => sum + line.discountedAmount, 0),
  );
  const discountAmount = roundMoney(subtotal - discountedSubtotal);
  const cgst =
    supply === "Intra-state"
      ? roundMoney(
          calculatedLines.reduce((sum, line) => sum + line.cgst, 0),
        )
      : 0;
  const sgst =
    supply === "Intra-state"
      ? roundMoney(
          calculatedLines.reduce((sum, line) => sum + line.sgst, 0),
        )
      : 0;
  const igst =
    supply === "Inter-state"
      ? roundMoney(
          calculatedLines.reduce((sum, line) => sum + line.igst, 0),
        )
      : 0;
  const tax = roundMoney(cgst + sgst + igst);
  const amountBeforeRounding = roundMoney(taxableSubtotal + tax);
  const total = roundToRupee(amountBeforeRounding);
  return {
    subtotal,
    discount,
    discountAmount,
    taxableSubtotal,
    cgst,
    sgst,
    igst,
    tax,
    roundingAdjustment: roundMoney(total - amountBeforeRounding),
    total,
  };
};
export const id = () => Math.random().toString(36).slice(2, 10);
export const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
export const dateLabel = (d: string) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
export const emptyBusiness: Business = {
  name: "",
  gstin: "",
  phone: "",
  email: "",
  address: "",
  state: "",
  prefix: "",
};
export const read = <T,>(key: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};

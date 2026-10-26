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
export type Tab =
  | "Overview"
  | "New sale"
  | "Sales invoices"
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
export const roundToRupee = (amount: number) => {
  const roundedAmount = roundMoney(amount);
  const wholeAmount = Math.floor(roundedAmount);
  return roundedAmount - wholeAmount < 0.5 ? wholeAmount : wholeAmount + 1;
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
    const taxableAmount = roundMoney(amount * (1 - discount / 100));
    const lineTax = roundMoney((taxableAmount * line.gst) / 100);
    const cgst = supply === "Intra-state" ? roundMoney(lineTax / 2) : 0;
    const sgst =
      supply === "Intra-state" ? roundMoney(lineTax - cgst) : 0;
    return {
      ...line,
      amount,
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
  const discountAmount = roundMoney(subtotal - taxableSubtotal);
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

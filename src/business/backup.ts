import { priceWithGst, read } from "../domain";
import type {
  Business,
  Customer,
  Product,
  Proforma,
  PurchaseEntry,
  SalesReturn,
  Expense,
  SupplierPayment,
  SalePayment,
  Sale,
} from "../domain";

export type BusinessBackup = {
  business: Business;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  proformas: Proforma[];
  purchases: PurchaseEntry[];
  returns: SalesReturn[];
  expenses: Expense[];
  supplierPayments: SupplierPayment[];
  salePayments: SalePayment[];
};

export function hasBusinessData(data: BusinessBackup): boolean {
  return Boolean(
    data.business.name.trim() ||
      data.products.length ||
      data.customers.length ||
      data.sales.length ||
      (data.proformas?.length ?? 0) ||
      (data.purchases?.length ?? 0) ||
      (data.returns?.length ?? 0) ||
      (data.expenses?.length ?? 0) ||
      (data.supplierPayments?.length ?? 0) ||
      (data.salePayments?.length ?? 0),
  );
}

export function readProductsFromStorage(): Product[] {
  const savedProducts = read<Product[]>("bw-products", []);
  if (localStorage.getItem("bw-prices-include-gst") === "true") {
    return savedProducts;
  }
  return savedProducts.map((product) => ({
    ...product,
    price: priceWithGst(product.price, product.gst),
  }));
}

export function parseBusinessBackup(
  content: string,
  fallbackBusiness: Business,
): BusinessBackup {
  const backup: unknown = JSON.parse(content);
  if (!backup || typeof backup !== "object") {
    throw new Error("Invalid backup");
  }
  const data = backup as Record<string, unknown>;
  if (
    !Array.isArray(data.products) ||
    !Array.isArray(data.customers) ||
    !Array.isArray(data.sales)
  ) {
    throw new Error("Invalid backup");
  }
  const products = data.products.map((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("Invalid backup product");
    }
    const product = value as Product;
    return {
      ...product,
      price:
        data.pricesIncludeGst === true
          ? product.price
          : priceWithGst(product.price, product.gst),
    };
  });
  return {
    business:
      data.business && typeof data.business === "object"
        ? (data.business as Business)
        : fallbackBusiness,
    products,
    customers: data.customers as Customer[],
    sales: data.sales as Sale[],
    proformas: Array.isArray(data.proformas)
      ? (data.proformas as Proforma[])
      : [],
    purchases: Array.isArray(data.purchases)
      ? (data.purchases as PurchaseEntry[])
      : [],
    returns: Array.isArray(data.returns) ? (data.returns as SalesReturn[]) : [],
    expenses: Array.isArray(data.expenses) ? (data.expenses as Expense[]) : [],
    supplierPayments: Array.isArray(data.supplierPayments)
      ? (data.supplierPayments as SupplierPayment[])
      : [],
    salePayments: Array.isArray(data.salePayments)
      ? (data.salePayments as SalePayment[])
      : [],
  };
}

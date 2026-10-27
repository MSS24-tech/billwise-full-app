import { id } from "../domain";
import type { Customer, Product } from "../domain";

export type CatalogResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function createProduct(
  form: Partial<Product>,
  existingProducts: Product[],
): CatalogResult<Product> {
  const name = form.name?.trim();
  const sku = form.sku?.trim();
  if (!name || !sku) {
    return { ok: false, message: "Product name and SKU are required." };
  }
  if (existingProducts.some((product) => product.sku.toLowerCase() === sku.toLowerCase())) {
    return { ok: false, message: "SKU already exists. Use a unique SKU." };
  }
  const barcode = form.barcode?.trim() || "";
  if (
    barcode &&
    existingProducts.some(
      (product) => product.barcode?.trim().toLowerCase() === barcode.toLowerCase(),
    )
  ) {
    return { ok: false, message: "Barcode already exists. Use a unique barcode." };
  }
  const gst = Number(form.gst ?? 0);
  const price = Number(form.price ?? 0);
  const cost = Number(form.cost ?? 0);
  const stock = Number(form.stock ?? 0);
  const minStock = Number(form.minStock ?? 0);
  const minMarginPct = Number(form.minMarginPct ?? 0);
  if (
    ![gst, price, cost, stock, minStock, minMarginPct].every(Number.isFinite) ||
    gst < 0 ||
    price < 0 ||
    cost < 0 ||
    stock < 0 ||
    minStock < 0 ||
    minMarginPct < 0 ||
    minMarginPct > 1000
  ) {
    return {
      ok: false,
      message: "Price, cost, opening stock, and threshold must be valid non-negative numbers.",
    };
  }
  return {
    ok: true,
    value: {
      id: id(),
      name,
      sku,
      barcode,
      hsn: form.hsn || "",
      unit: form.unit || "",
      cost,
      price,
      gst,
      stock,
      minStock,
      minMarginPct,
      unbatchedStock: stock,
    },
  };
}

export function createCustomer(
  form: Partial<Customer>,
): CatalogResult<Customer> {
  const name = form.name?.trim();
  if (!name) return { ok: false, message: "Customer name is required." };
  return {
    ok: true,
    value: {
      id: id(),
      name,
      gstin: form.gstin || "",
      phone: form.phone || "",
      email: form.email || "",
      address: form.address || "",
      state: form.state || "",
    },
  };
}

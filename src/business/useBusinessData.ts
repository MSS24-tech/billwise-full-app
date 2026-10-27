import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { emptyBusiness, read } from "../domain";
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
import { readProductsFromStorage } from "./backup";

export type BusinessDataStore = {
  business: Business;
  setBusiness: Dispatch<SetStateAction<Business>>;
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  customers: Customer[];
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  sales: Sale[];
  setSales: Dispatch<SetStateAction<Sale[]>>;
  proformas: Proforma[];
  setProformas: Dispatch<SetStateAction<Proforma[]>>;
  purchases: PurchaseEntry[];
  setPurchases: Dispatch<SetStateAction<PurchaseEntry[]>>;
  returns: SalesReturn[];
  setReturns: Dispatch<SetStateAction<SalesReturn[]>>;
  expenses: Expense[];
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  supplierPayments: SupplierPayment[];
  setSupplierPayments: Dispatch<SetStateAction<SupplierPayment[]>>;
  salePayments: SalePayment[];
  setSalePayments: Dispatch<SetStateAction<SalePayment[]>>;
};

export function useBusinessData(): BusinessDataStore {
  const [products, setProducts] = useState<Product[]>(readProductsFromStorage);
  const [customers, setCustomers] = useState<Customer[]>(() =>
    read("bw-customers", []),
  );
  const [sales, setSales] = useState<Sale[]>(() => read("bw-sales", []));
  const [proformas, setProformas] = useState<Proforma[]>(() =>
    read("bw-proformas", []),
  );
  const [purchases, setPurchases] = useState<PurchaseEntry[]>(() =>
    read("bw-purchases", []),
  );
  const [returns, setReturns] = useState<SalesReturn[]>(() =>
    read("bw-returns", []),
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    read("bw-expenses", []),
  );
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>(
    () => read("bw-supplier-payments", []),
  );
  const [salePayments, setSalePayments] = useState<SalePayment[]>(() =>
    read("bw-sale-payments", []),
  );
  const [business, setBusiness] = useState<Business>(() =>
    read("bw-business", emptyBusiness),
  );

  useEffect(() => {
    localStorage.setItem("bw-products", JSON.stringify(products));
    localStorage.setItem("bw-prices-include-gst", "true");
  }, [products]);
  useEffect(() => {
    localStorage.setItem("bw-customers", JSON.stringify(customers));
  }, [customers]);
  useEffect(() => {
    localStorage.setItem("bw-sales", JSON.stringify(sales));
  }, [sales]);
  useEffect(() => {
    localStorage.setItem("bw-proformas", JSON.stringify(proformas));
  }, [proformas]);
  useEffect(() => {
    localStorage.setItem("bw-purchases", JSON.stringify(purchases));
  }, [purchases]);
  useEffect(() => {
    localStorage.setItem("bw-returns", JSON.stringify(returns));
  }, [returns]);
  useEffect(() => {
    localStorage.setItem("bw-expenses", JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem("bw-supplier-payments", JSON.stringify(supplierPayments));
  }, [supplierPayments]);
  useEffect(() => {
    localStorage.setItem("bw-sale-payments", JSON.stringify(salePayments));
  }, [salePayments]);
  useEffect(() => {
    localStorage.setItem("bw-business", JSON.stringify(business));
  }, [business]);

  return {
    business,
    setBusiness,
    products,
    setProducts,
    customers,
    setCustomers,
    sales,
    setSales,
    proformas,
    setProformas,
    purchases,
    setPurchases,
    returns,
    setReturns,
    expenses,
    setExpenses,
    supplierPayments,
    setSupplierPayments,
    salePayments,
    setSalePayments,
  };
}

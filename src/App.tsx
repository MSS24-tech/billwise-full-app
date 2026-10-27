import { useMemo, useRef, useState } from "react";
import { calculateSaleTotals, dateLabel, emptyBusiness, fmt, id, today } from "./domain";
import type {
  Customer,
  Expense,
  Product,
  Proforma,
  PurchaseEntry,
  Sale,
  SalePayment,
  SalesReturn,
  SupplierPayment,
  Tab,
} from "./domain";
import { parseBusinessBackup } from "./business/backup";
import { useBusinessData } from "./business/useBusinessData";
import { GST_RATES, INDIAN_STATES, PRODUCT_UNITS } from "./business/formOptions";
import {
  getBasketAffinities,
  getCustomerInsights,
  getInventoryMetrics,
  getRestockRecommendations,
  getSalesMetrics,
} from "./business/analytics";
import { createCustomer, createProduct } from "./business/catalog";
import { createProforma } from "./business/transactions";
import { getSaleBalance } from "./business/operations";
import {
  addProductQuantity,
  adjustProductStock,
  buildSalePreview,
  createSale,
  findProductByScan,
  getNextAvailableSaleProduct,
  getSaleSupply,
  recordSalePayment,
  restoreStockForDeletedSale,
} from "./business/sales";
import {
  Empty,
  Field,
  Metric,
  Modal,
  PageHead,
  Quick,
  Status,
} from "./components/Ui";
import { InvoiceView } from "./components/InvoiceView";
import { SaleForm } from "./components/SaleForm";
import { PurchaseEntryPage } from "./components/PurchaseEntryPage";
import {
  ExpensesCashbookPage,
  PaymentRemindersPage,
  SalesReturnsPage,
  SupplierPaymentsPage,
} from "./components/BusinessOperationsPages";
import { Chatbot } from "./components/Chatbot";
import type { ChatResult } from "./components/Chatbot";
import { buildReportData } from "./reports/reportData";
import { exportReportCsv } from "./reports/exportCsv";
import { exportReportExcel } from "./reports/exportExcel";
import { exportReportPdf } from "./reports/exportPdf";
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Users,
  Warehouse,
  ChartNoAxesCombined,
  Settings,
  Search,
  Plus,
  Trash2,
  Download,
  Printer,
  ChevronDown,
  Menu,
  X,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  RotateCcw,
  Upload,
  Save,
  Boxes,
  Wallet,
  BellRing,
  Truck,
  CalendarDays,
  Eye,
  Minus,
  Filter,
} from "lucide-react";

export default function App() {
  const [tab, setTab] = useState<Tab>("Overview"),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [toast, setToast] = useState(""),
    [errorPopup, setErrorPopup] = useState("");
  const {
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
  } = useBusinessData();
  const [showProduct, setShowProduct] = useState(false),
    [showCustomer, setShowCustomer] = useState(false),
    [showAdjust, setShowAdjust] = useState<Product | null>(null),
    [showSale, setShowSale] = useState(false),
    [viewSale, setViewSale] = useState<Sale | null>(null),
    [paymentSale, setPaymentSale] = useState<Sale | null>(null),
    [viewProforma, setViewProforma] = useState<Proforma | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [marginWarnings, setMarginWarnings] = useState<string[]>([]);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: "",
    sku: "",
    barcode: "",
    hsn: "",
    unit: "",
    gst: 18,
  });
  const [productNumbers, setProductNumbers] = useState({
    cost: "",
    price: "",
    stock: "",
    minStock: "",
  });
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    name: "",
    gstin: "",
    phone: "",
    email: "",
    address: "",
    state: "",
  });
  const [adjustQty, setAdjustQty] = useState("");
  const [saleCustomer, setSaleCustomer] = useState(""),
    [saleDate, setSaleDate] = useState(""),
    [saleDue, setSaleDue] = useState(""),
    [proformaValidUntil, setProformaValidUntil] = useState(""),
    [salePlace, setSalePlace] = useState(""),
    [saleDiscount, setSaleDiscount] = useState(""),
    [salePaid, setSalePaid] = useState(""),
    [saleNotes, setSaleNotes] = useState(""),
    [saleLines, setSaleLines] = useState<{ productId: string; qty: number }[]>(
      [],
    );
  const fileRef = useRef<HTMLInputElement>(null);
  const notify = (s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(""), 2600);
  };
  const notifyError = (message: string) => {
    setToast("");
    setErrorPopup(message);
  };
  const nav = [
    ["Overview", LayoutDashboard],
    ["New sale", ShoppingCart],
    ["Sales invoices", ReceiptText],
    ["Proforma invoices", FileText],
    ["Purchases", Truck],
    ["Sales returns", RotateCcw],
    ["Expenses & cashbook", Wallet],
    ["Payment reminders", BellRing],
    ["Supplier payments", IndianRupee],
    ["Products", Package],
    ["Customers", Users],
    ["Inventory", Warehouse],
    ["Reports", ChartNoAxesCombined],
    ["Settings", Settings],
  ] as const;
  const productMatches = products.filter((p) =>
    (p.name + " " + p.sku + " " + p.barcode + " " + p.hsn)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const customerMatches = customers.filter((c) =>
    (c.name + " " + c.phone + " " + c.gstin)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const invoiceMatches = sales.filter((s) =>
    (s.number + " " + s.customerName + " " + s.status)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const currentCustomer = customers.find((c) => c.id === saleCustomer);
  const salesAfterReturns = useMemo(
    () =>
      sales.map((sale) => {
        const net = getSaleBalance(sale, returns);
        const status: Sale["status"] =
          net.balance === 0
            ? "Paid"
            : net.paid > 0
              ? "Part-paid"
              : "Unpaid";
        const returnedQuantities = new Map<string, number>();
        returns
          .filter((entry) => entry.saleId === sale.id)
          .flatMap((entry) => entry.lines)
          .forEach((line) =>
            returnedQuantities.set(
              line.productId,
              (returnedQuantities.get(line.productId) ?? 0) + line.qty,
            ),
          );
        const lines = sale.lines.map((line) => {
          const remainingReturn = returnedQuantities.get(line.productId) ?? 0;
          const returnedFromLine = Math.min(line.qty, remainingReturn);
          returnedQuantities.set(
            line.productId,
            Math.max(0, remainingReturn - returnedFromLine),
          );
          return { ...line, qty: line.qty - returnedFromLine };
        });
        return {
          ...sale,
          total: net.total,
          paid: net.paid,
          status,
          lines,
        };
      }),
    [sales, returns],
  );
  const {
    stockCount: productStockCount,
    stockCostValue: productStockCostValue,
    retailValue: productRetailValue,
    lowStockProducts: lowStock,
    lowStockCount: productLowStockCount,
  } =
    getInventoryMetrics(products);
  const expiryCutoff = new Date(`${today()}T00:00:00`);
  expiryCutoff.setDate(expiryCutoff.getDate() + 30);
  const expiringBatches = products.flatMap((product) =>
    (product.batches ?? [])
      .filter(
        (batch) =>
          batch.quantity > 0 &&
          batch.expiryDate &&
          batch.expiryDate <=
            `${expiryCutoff.getFullYear()}-${String(expiryCutoff.getMonth() + 1).padStart(2, "0")}-${String(expiryCutoff.getDate()).padStart(2, "0")}`,
      )
      .map((batch) => ({ product, batch })),
  );
  const saleSupply = getSaleSupply(business.state, salePlace);
  const computed = useMemo(
    () => buildSalePreview(saleLines, products, saleDiscount, saleSupply),
    [saleLines, products, saleDiscount, saleSupply],
  );
  const {
    revenue,
    received,
    outstanding,
    unitsSold,
    todaySales,
    todayRevenue,
    todayGrossProfit,
    paymentFollowUp,
  } =
    getSalesMetrics(salesAfterReturns, today());
  const customerInsights = getCustomerInsights(customers, salesAfterReturns, today());
  const basketAffinities = getBasketAffinities(products, salesAfterReturns);
  const restockRecommendations = getRestockRecommendations(products, salesAfterReturns, today());
  const resetSaleForm = () => {
    setSaleCustomer("");
    setSaleDate("");
    setSaleDue("");
    setSalePlace("");
    setSaleDiscount("");
    setSalePaid("");
    setSaleNotes("");
    setSaleLines([]);
  };
  const startSale = () => {
    setViewProforma(null);
    setSaleCustomer(customers[0]?.id || "");
    const issueDate = today();
    const due = new Date(`${issueDate}T00:00:00`);
    due.setDate(due.getDate() + 30);
    setSaleDate(issueDate);
    setSaleDue(
      `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`,
    );
    setSalePlace(customers[0]?.state || "");
    setSaleDiscount("");
    setSalePaid("");
    setSaleNotes("");
    setSaleLines(
      products.length ? [{ productId: products[0].id, qty: 1 }] : [],
    );
    setTab("New sale");
    setShowSale(true);
  };
  const startProforma = () => {
    setViewSale(null);
    setViewProforma(null);
    const date = today();
    const expiry = new Date(`${date}T00:00:00`);
    expiry.setDate(expiry.getDate() + 30);
    setSaleCustomer(customers[0]?.id || "");
    setSaleDate(date);
    setProformaValidUntil(
      `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, "0")}-${String(expiry.getDate()).padStart(2, "0")}`,
    );
    setSalePlace(customers[0]?.state || "");
    setSaleDiscount("");
    setSalePaid("");
    setSaleNotes("");
    setSaleLines(products.length ? [{ productId: products[0].id, qty: 1 }] : []);
    setTab("New proforma");
    setQuery("");
  };
  const startPairSale = (productIds: string[]) => {
    const availableProducts = productIds.filter((productId) =>
      products.some((product) => product.id === productId && product.stock > 0),
    );
    if (availableProducts.length !== productIds.length) {
      notifyError("One of these products is out of stock. Review the pair before billing.");
      return;
    }
    setSaleCustomer("");
    const issueDate = today();
    const due = new Date(`${issueDate}T00:00:00`);
    due.setDate(due.getDate() + 30);
    setSaleDate(issueDate);
    setSaleDue(
      `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`,
    );
    setSalePlace("");
    setSaleDiscount("");
    setSalePaid("");
    setSaleNotes("");
    setSaleLines(availableProducts.map((productId) => ({ productId, qty: 1 })));
    setTab("New sale");
    setQuery("");
    setShowSale(true);
  };
  const saveSale = (acceptMarginWarning = false) => {
    const result = createSale({
      business,
      sales,
      products,
      customer: customers.find((customer) => customer.id === saleCustomer),
      date: saleDate,
      due: saleDue,
      place: salePlace,
      supply: saleSupply,
      lines: computed.lines,
      totals: computed,
      paid: Number(salePaid),
      notes: saleNotes,
    });
    if (!result.ok) {
      notifyError(result.message);
      return;
    }
    const warnings = result.sale.lines.flatMap((line) => {
      if (line.cost <= 0) return [];
      const netRate = line.rate / (1 + line.gst / 100);
      const margin = ((netRate - line.cost) / line.cost) * 100;
      const minimum = products.find((product) => product.id === line.productId)
        ?.minMarginPct ?? 0;
      return margin < 0 || (minimum > 0 && margin < minimum)
        ? [`${line.name}: ${margin.toFixed(1)}% margin${margin < 0 ? " (below cost)" : `; minimum is ${minimum}%`}`]
        : [];
    });
    if (warnings.length && !acceptMarginWarning) {
      setMarginWarnings([...new Set(warnings)]);
      return;
    }
    setSales((currentSales) => [result.sale, ...currentSales]);
    if (result.sale.paid > 0) {
      setSalePayments((current) => [
        ...current,
      { id: id(), saleId: result.sale.id, date: saleDate, amount: result.sale.paid },
      ]);
    }
    setProducts(result.products);
    resetSaleForm();
    setShowSale(false);
    setTab("Sales invoices");
    setQuery("");
    notify(`Invoice ${result.sale.number} created and stock updated.`);
  };
  const saveProforma = () => {
    const result = createProforma({
      business,
      proformas,
      customer: customers.find((customer) => customer.id === saleCustomer),
      date: saleDate,
      validUntil: proformaValidUntil,
      place: salePlace,
      supply: saleSupply,
      lines: computed.lines,
      discount: Number(saleDiscount) || 0,
      notes: saleNotes,
    });
    if (!result.ok) {
      notifyError(result.message);
      return;
    }
    setProformas((current) => [result.proforma, ...current]);
    setViewProforma(result.proforma);
    setTab("Proforma invoices");
    notify(`Proforma ${result.proforma.number} saved. Stock was not changed.`);
  };
  const convertProforma = (proforma: Proforma) => {
    if (proforma.status === "Converted") {
      notifyError("This proforma has already been converted.");
      return;
    }
    const issueDate = today();
    const due = new Date(`${issueDate}T00:00:00`);
    due.setDate(due.getDate() + 30);
    const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
    const result = createSale({
      business,
      sales,
      products,
      customer: customers.find((customer) => customer.id === proforma.customerId),
      date: issueDate,
      due: dueDate,
      place: proforma.place,
      supply: proforma.supply,
      lines: proforma.lines,
      totals: calculateSaleTotals(
        proforma.lines,
        proforma.discount,
        proforma.supply,
      ),
      paid: 0,
      notes: proforma.notes,
    });
    if (!result.ok) {
      notifyError(result.message);
      return;
    }
    setSales((current) => [result.sale, ...current]);
    setProducts(result.products);
    setProformas((current) =>
      current.map((item) =>
        item.id === proforma.id
          ? { ...item, status: "Converted", convertedSaleId: result.sale.id }
          : item,
      ),
    );
    setViewProforma(null);
    setTab("Sales invoices");
    notify(`${proforma.number} converted to invoice ${result.sale.number}.`);
  };
  const recordPayment = (s: Sale) => {
    const amt = Number(paymentAmount);
    const balance = getSaleBalance(s, returns).balance;
    if (!Number.isFinite(amt) || amt <= 0 || amt > balance) {
      notifyError(`Enter a payment greater than zero and no more than ${fmt(balance)}.`);
      return;
    }
    const updatedSale = recordSalePayment(s, amt);
    const netBalance = Math.max(
      0,
      getSaleBalance(s, returns).balance - amt,
    );
    updatedSale.status =
      netBalance === 0 ? "Paid" : updatedSale.paid > 0 ? "Part-paid" : "Unpaid";
    setSalePayments((current) => [
      ...current,
      { id: id(), saleId: s.id, date: today(), amount: amt },
    ]);
    setSales((currentSales) =>
      currentSales.map((sale) => (sale.id === s.id ? updatedSale : sale)),
    );
    setViewSale((currentSale) =>
      currentSale?.id === s.id ? updatedSale : currentSale,
    );
    setPaymentSale(null);
    setPaymentAmount("");
    notify("Payment recorded.");
  };
  const recordReturn = (
    entry: SalesReturn,
    updatedProducts: Product[],
  ) => {
    setReturns((current) => [entry, ...current]);
    setProducts(updatedProducts);
    notify(`Return ${entry.number} recorded and stock updated.`);
  };
  const updateFollowUp = (
    sale: Sale,
    followUpStatus: NonNullable<Sale["followUpStatus"]>,
  ) => {
    setSales((current) =>
      current.map((item) =>
        item.id === sale.id ? { ...item, followUpStatus } : item,
      ),
    );
  };
  const beginPayment = (sale: Sale) => {
    setPaymentSale(sale);
    setPaymentAmount(String(getSaleBalance(sale, returns).balance));
  };
  const deleteSale = (s: Sale) => {
    if (
      !window.confirm(
        `Delete ${s.number}? Stock will be returned to inventory.`,
      )
    )
      return;
    setSales((v) => v.filter((x) => x.id !== s.id));
    setProducts((currentProducts) =>
      restoreStockForDeletedSale(currentProducts, s),
    );
    setViewSale(null);
    notify("Invoice deleted and stock restored.");
  };
  const startAddProduct = () => {
    setProductForm({
      name: "",
      sku: "",
      barcode: "",
      hsn: "",
      unit: "",
      gst: 18,
    });
    setProductNumbers({ cost: "", price: "", stock: "", minStock: "" });
    setShowProduct(true);
  };
  const saveProduct = () => {
    const numberOrUndefined = (value: string) =>
      value.trim() === "" ? undefined : Number(value);
    const result = createProduct(
      {
        ...productForm,
        cost: numberOrUndefined(productNumbers.cost),
        price: numberOrUndefined(productNumbers.price),
        stock: numberOrUndefined(productNumbers.stock),
        minStock: numberOrUndefined(productNumbers.minStock),
      },
      products,
    );
    if (!result.ok) {
      notifyError(result.message);
      return;
    }
    setProducts((currentProducts) => [result.value, ...currentProducts]);
    setShowProduct(false);
    setProductForm({
      name: "",
      sku: "",
      barcode: "",
      hsn: "",
      unit: "",
      gst: 18,
    });
    setProductNumbers({ cost: "", price: "", stock: "", minStock: "" });
    notify("Product added.");
  };
  const addProductToSale = (product: Product) => {
    const result = addProductQuantity(saleLines, product);
    if (!result.ok) {
      notifyError(result.message);
      return;
    }
    setSaleLines(result.lines);
    notify(`${product.name} added to sale.`);
  };
  const addProductToProforma = (product: Product) => {
    setSaleLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      return existing
        ? current.map((line) =>
            line.productId === product.id
              ? { ...line, qty: line.qty + 1 }
              : line,
          )
        : [...current, { productId: product.id, qty: 1 }];
    });
  };
  const scanProductIntoSale = (scannedCode: string) => {
    if (!scannedCode.trim()) return;
    const product = findProductByScan(products, scannedCode);
    if (!product) {
      notifyError(`No product found for barcode "${scannedCode.trim()}".`);
      return;
    }
    addProductToSale(product);
  };
  const scanProductIntoProforma = (scannedCode: string) => {
    if (!scannedCode.trim()) return;
    const product = findProductByScan(products, scannedCode);
    if (!product) {
      notifyError(`No product found for barcode "${scannedCode.trim()}".`);
      return;
    }
    addProductToProforma(product);
  };
  const saveCustomer = () => {
    const result = createCustomer(customerForm);
    if (!result.ok) {
      notifyError(result.message);
      return;
    }
    setCustomers((currentCustomers) => [result.value, ...currentCustomers]);
    setShowCustomer(false);
    setCustomerForm({
      name: "",
      gstin: "",
      phone: "",
      email: "",
      address: "",
      state: "",
    });
    notify("Customer added.");
  };
  const addLine = () => {
    if (tab === "New proforma") {
      const product = products.find(
        (item) => !saleLines.some((line) => line.productId === item.id),
      );
      if (!product) {
        notifyError("No additional products available.");
        return;
      }
      setSaleLines((current) => [...current, { productId: product.id, qty: 1 }]);
      return;
    }
    const p = getNextAvailableSaleProduct(products, saleLines);
    if (!p) {
      notifyError("No additional in-stock products available.");
      return;
    }
    setSaleLines((v) => [...v, { productId: p.id, qty: 1 }]);
  };
  const exportCSV = (kind: "sales" | "products") => {
    const rows =
      kind === "sales"
        ? [
            [
              "Invoice",
              "Date",
              "Customer",
              "Subtotal",
              "GST",
              "Total",
              "Paid",
              "Balance",
              "Status",
            ],
            ...sales.map((s) => [
              s.number,
              s.date,
              s.customerName,
              s.subtotal.toFixed(2),
              s.tax.toFixed(2),
              getSaleBalance(s, returns).total.toFixed(2),
              getSaleBalance(s, returns).paid.toFixed(2),
              getSaleBalance(s, returns).balance.toFixed(2),
              getSaleBalance(s, returns).balance === 0
                ? "Paid"
                : getSaleBalance(s, returns).paid > 0
                  ? "Part-paid"
                  : "Unpaid",
            ]),
          ]
        : [
            [
              "Name",
              "SKU",
              "Barcode",
              "HSN/SAC",
              "Cost",
              "Selling price (incl. GST)",
              "Minimum margin %",
              "GST %",
              "Stock",
              "Low stock threshold",
            ],
            ...products.map((p) => [
              p.name,
              p.sku,
              p.barcode || "",
              p.hsn,
              p.cost,
              p.price,
              p.minMarginPct ?? 0,
              p.gst,
              p.stock,
              p.minStock,
            ]),
          ];
    const csv = rows
      .map((r) =>
        r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billwise-${kind}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const reportData = buildReportData(business, products, salesAfterReturns);
  const reportInvoices = reportData.invoices;
  const reportProducts = reportData.products;
  const hasReportData = reportInvoices.length > 0 || reportProducts.length > 0;
  const topProductsBySales = reportProducts
    .filter((product) => product.unitsSold > 0)
    .slice(0, 8);
  const downloadReportCSV = () => {
    if (hasReportData) exportReportCsv(reportData);
  };
  const downloadReportExcel = () => {
    if (hasReportData) exportReportExcel(reportData);
  };
  const downloadReportPDF = () => {
    if (hasReportData) void exportReportPdf(reportData);
  };
  const backup = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            business,
            products,
            customers,
            sales,
            proformas,
            purchases,
            returns,
            expenses,
            supplierPayments,
            salePayments,
            version: 4,
            pricesIncludeGst: true,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billwise-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Backup downloaded.");
  };
  const restore = (file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = parseBusinessBackup(String(r.result), business);
        if (!window.confirm("Import backup and replace current data?")) return;
        setBusiness(d.business);
        setProducts(d.products);
        setCustomers(d.customers);
        setSales(d.sales);
        setProformas(d.proformas);
        setPurchases(d.purchases);
        setReturns(d.returns);
        setExpenses(d.expenses);
        setSupplierPayments(d.supplierPayments);
        setSalePayments(d.salePayments);
        notify("Backup imported.");
      } catch {
        notifyError("Could not import this file. Choose a Billwise JSON backup.");
      }
    };
    r.readAsText(file);
  };
  const printSale = (s: Sale) => {
    setViewSale(s);
    const origTitle = document.title;
    document.title = `Invoice_${s.number}`;
    window.setTimeout(() => {
      window.print();
      document.title = origTitle;
    }, 150);
  };
  const printProforma = (proforma: Proforma) => {
    setViewProforma(proforma);
    const origTitle = document.title;
    document.title = `Proforma_${proforma.number}`;
    window.setTimeout(() => {
      window.print();
      document.title = origTitle;
    }, 150);
  };
  const statusClass = (s: string) => s.toLowerCase().replace("-", "");
  const openTab = (t: Tab) => {
    if (t === "New sale") {
      startSale();
      setQuery("");
      setMobile(false);
      return;
    }
    if (t === "New proforma") {
      startProforma();
      setMobile(false);
      return;
    }
    setTab(t);
    setQuery("");
    setMobile(false);
    setShowSale(false);
  };
  return (
    <div className="shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <ReceiptText size={21} />
          </div>
          <div>
            <b>billwise</b>
            <small>SMALL BUSINESS MANAGER</small>
          </div>
          <button className="mobile-close" onClick={() => setMobile(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace">
          <div className="workspace-logo">
            <Warehouse size={17} />
          </div>
          <div>
            <b>{business.name}</b>
            <small>Local workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-label">BUSINESS</p>
        <nav>
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-item ${tab === label ? "active" : ""}`}
              onClick={() => openTab(label as Tab)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Inventory" && lowStock.length > 0 && (
                <em>{lowStock.length}</em>
              )}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="local-card">
            <CheckCircle2 size={17} />
            <div>
              <b>Local-first workspace</b>
              <p>Your data is saved in this browser.</p>
            </div>
          </div>
          <div className="user-mini">
            <div className="user-avatar">BW</div>
            <div>
              <b>Business owner</b>
              <small>Administrator</small>
            </div>
          </div>
        </div>
      </aside>
      {mobile && <div className="overlay" onClick={() => setMobile(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="breadcrumbs">
            Workspace <span>/</span> <b>{tab}</b>
          </div>
          <div className="top-right">
            <div className="online">
              <i /> Local data
            </div>
            <button
              className="top-icon"
              onClick={() => openTab("Settings")}
              title="Settings"
            >
              <Settings size={17} />
            </button>
            <div className="user-avatar small">BW</div>
          </div>
        </header>
        <div className="content">
          {tab === "Overview" && (
            <>
              <div className="page-title-row">
                <div>
                  <div className="eyebrow">YOUR BUSINESS AT A GLANCE</div>
                  <h1>
                    Good business starts here<span>.</span>
                  </h1>
                  <p>Track sales, manage stock, and keep your day moving.</p>
                </div>
                <button className="btn primary" onClick={startSale}>
                  <Plus size={16} /> Create new sale
                </button>
              </div>
              <div className="metric-grid">
                <Metric
                  icon={<IndianRupee />}
                  tone="purple"
                  label="Total sales"
                  value={fmt(revenue)}
                  sub={`${sales.length} invoices created`}
                />
                <Metric
                  icon={<Wallet />}
                  tone="green"
                  label="Payments received"
                  value={fmt(received)}
                  sub="Collected so far"
                />
                <Metric
                  icon={<TrendingUp />}
                  tone="orange"
                  label="Outstanding"
                  value={fmt(outstanding)}
                  sub="Payments to follow up"
                />
                <Metric
                  icon={<Boxes />}
                  tone="blue"
                  label="Inventory items"
                  value={String(products.length)}
                  sub={`${lowStock.length} products low on stock`}
                />
              </div>
              <section className="business-pulse">
                <div className="pulse-heading">
                  <div className="pulse-heading-icon">
                    <CalendarDays size={17} />
                  </div>
                  <div>
                    <h2>Today’s business pulse</h2>
                    <p>{dateLabel(today())} · A quick view of what needs attention</p>
                  </div>
                </div>
                <div className="pulse-stats">
                  <div className="pulse-stat">
                    <span>Sales today</span>
                    <b>{fmt(todayRevenue)}</b>
                    <small>{todaySales.length} invoices</small>
                  </div>
                  <div className="pulse-stat">
                    <span>Estimated gross profit</span>
                    <b>{fmt(todayGrossProfit)}</b>
                    <small>Before overheads and tax</small>
                  </div>
                </div>
                <div className="pulse-alerts">
                  {paymentFollowUp ? (
                    <button
                      className="pulse-alert payment"
                      onClick={() => setViewSale(paymentFollowUp)}
                    >
                      <span className="pulse-alert-icon">
                        <Wallet size={16} />
                      </span>
                      <span className="pulse-alert-copy">
                        <b>Payment follow-up</b>
                        <small>
                          {paymentFollowUp.customerName} ·{" "}
                          {fmt(paymentFollowUp.total - paymentFollowUp.paid)}{" "}
                          outstanding
                        </small>
                      </span>
                      <ArrowUpRight size={15} />
                    </button>
                  ) : (
                    <div className="pulse-alert clear">
                      <span className="pulse-alert-icon">
                        <CheckCircle2 size={16} />
                      </span>
                      <span className="pulse-alert-copy">
                        <b>Payments up to date</b>
                        <small>No outstanding invoices to follow up.</small>
                      </span>
                    </div>
                  )}
                  {lowStock.length > 0 ? (
                    <button
                      className="pulse-alert inventory"
                      onClick={() => {
                        const product = lowStock[0];
                        setShowAdjust(product);
                        setAdjustQty("");
                      }}
                    >
                      <span className="pulse-alert-icon">
                        <Package size={16} />
                      </span>
                      <span className="pulse-alert-copy">
                        <b>
                          {lowStock.length} low-stock product
                          {lowStock.length === 1 ? "" : "s"}
                        </b>
                        <small>
                          {lowStock[0].name} · {lowStock[0].stock} left
                        </small>
                      </span>
                      <ArrowUpRight size={15} />
                    </button>
                  ) : (
                    <div className="pulse-alert clear">
                      <span className="pulse-alert-icon">
                        <CheckCircle2 size={16} />
                      </span>
                      <span className="pulse-alert-copy">
                        <b>Stock looks healthy</b>
                        <small>No products below their stock threshold.</small>
                      </span>
                    </div>
                  )}
                </div>
              </section>
              <div className="dash-grid">
                <section className="panel sales-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Recent sales</h2>
                      <p>Your latest invoices and payments</p>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => openTab("Sales invoices")}
                    >
                      View all <ArrowUpRight size={14} />
                    </button>
                  </div>
                  {sales.length === 0 ? (
                    <Empty
                      icon={<ReceiptText />}
                      title="Your sales will show up here"
                      text="Create your first invoice to start tracking revenue."
                      action="Create a sale"
                      onAction={startSale}
                    />
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>INVOICE</th>
                            <th>CUSTOMER</th>
                            <th>DATE</th>
                            <th>AMOUNT</th>
                            <th>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.slice(0, 5).map((s) => (
                            <tr
                              key={s.id}
                              onClick={() => setViewSale(s)}
                              className="click-row"
                            >
                              <td className="link-cell">{s.number}</td>
                              <td>{s.customerName}</td>
                              <td>{dateLabel(s.date)}</td>
                              <td className="strong">{fmt(s.total)}</td>
                              <td>
                                <Status status={s.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
                <section className="panel stock-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Stock watch</h2>
                      <p>Products to keep an eye on</p>
                    </div>
                    <button
                      className="icon-square"
                      onClick={() => openTab("Inventory")}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {lowStock.length === 0 ? (
                    <div className="good-stock">
                      <CheckCircle2 size={20} />
                      <b>Stock looks healthy</b>
                      <span>No low-stock items right now.</span>
                    </div>
                  ) : (
                    lowStock.slice(0, 5).map((p) => (
                      <div className="stock-row" key={p.id}>
                        <div className="product-symbol">
                          <Package size={17} />
                        </div>
                        <div className="stock-info">
                          <b>{p.name}</b>
                          <small>SKU {p.sku}</small>
                          <div className="stock-bar">
                            <i
                              style={{
                                width: `${Math.min(100, (p.stock / Math.max(p.minStock, 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="stock-count">
                          <b>{p.stock}</b>
                          <small>left</small>
                        </div>
                      </div>
                    ))
                  )}
                  <button
                    className="stock-link"
                    onClick={() => openTab("Inventory")}
                  >
                    Manage inventory <ArrowUpRight size={14} />
                  </button>
                </section>
              </div>
              <div className="quick-grid">
                <Quick
                  icon={<ShoppingCart />}
                  title="Record a sale"
                  text="Create a GST invoice and update stock automatically."
                  onClick={startSale}
                />
                <Quick
                  icon={<Package />}
                  title="Add a product"
                  text="Set prices, 18% default GST and stock levels."
                  onClick={startAddProduct}
                />
                <Quick
                  icon={<Users />}
                  title="Add a customer"
                  text="Keep billing details ready for your next sale."
                  onClick={() => setShowCustomer(true)}
                />
              </div>
            </>
          )}
          {(tab === "New sale" || tab === "New proforma") && (
            <>
              <div className="page-title-row">
                <div>
                  <div className="eyebrow">BILLING WORKSPACE</div>
                  <h1>
                    {tab === "New proforma" ? "Create a proforma" : "Create a sale"}<span>.</span>
                  </h1>
                  <p>
                    {tab === "New proforma"
                      ? "Prepare an estimate without changing stock."
                      : "Add items, confirm tax, and record payment."}
                  </p>
                </div>
                <button
                  className="btn light"
                  onClick={() =>
                    openTab(
                      tab === "New proforma" ? "Proforma invoices" : "Sales invoices",
                    )
                  }
                >
                  Cancel
                </button>
              </div>
              <SaleForm
                products={products}
                customers={customers}
                saleCustomer={saleCustomer}
                setSaleCustomer={setSaleCustomer}
                saleDate={saleDate}
                setSaleDate={setSaleDate}
                saleDue={saleDue}
                setSaleDue={setSaleDue}
                saleSupply={saleSupply}
                salePlace={salePlace}
                setSalePlace={setSalePlace}
                saleDiscount={saleDiscount}
                setSaleDiscount={setSaleDiscount}
                salePaid={salePaid}
                setSalePaid={setSalePaid}
                saleNotes={saleNotes}
                setSaleNotes={setSaleNotes}
                isProforma={tab === "New proforma"}
                validUntil={proformaValidUntil}
                setValidUntil={setProformaValidUntil}
                saleLines={saleLines}
                setSaleLines={setSaleLines}
                computed={computed}
                onAddLine={addLine}
                onAddProductManually={(productId: string) => {
                  const product = products.find((item) => item.id === productId);
                  if (product) {
                    if (tab === "New proforma") addProductToProforma(product);
                    else addProductToSale(product);
                  }
                }}
                onScanBarcode={
                  tab === "New proforma"
                    ? scanProductIntoProforma
                    : scanProductIntoSale
                }
                onSave={tab === "New proforma" ? saveProforma : () => saveSale()}
              />
            </>
          )}
          {tab === "Proforma invoices" && (
            <>
              <PageHead
                title="Proforma invoices"
                subtitle="Create estimates, share them with customers, and convert accepted quotes into sales."
                action={
                  <button className="btn primary" onClick={startProforma}>
                    <Plus size={16} /> New proforma
                  </button>
                }
              />
              <div className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>PROFORMA</th>
                        <th>CUSTOMER</th>
                        <th>DATE</th>
                        <th>VALID UNTIL</th>
                        <th>TOTAL</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proformas.map((proforma) => (
                        <tr key={proforma.id}>
                          <td className="link-cell">{proforma.number}</td>
                          <td>{proforma.customerName}</td>
                          <td>{dateLabel(proforma.date)}</td>
                          <td>{dateLabel(proforma.validUntil)}</td>
                          <td className="strong">{fmt(proforma.total)}</td>
                          <td><Status status={proforma.status} /></td>
                          <td>
                            <div className="row-actions">
                              <button
                                title="View proforma"
                                onClick={() => setViewProforma(proforma)}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                title="Print proforma"
                                onClick={() => printProforma(proforma)}
                              >
                                <Printer size={15} />
                              </button>
                              {proforma.status === "Open" && (
                                <button
                                  title="Convert to sale and deduct stock"
                                  onClick={() => convertProforma(proforma)}
                                >
                                  <ShoppingCart size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {proformas.length === 0 && (
                    <Empty
                      icon={<FileText />}
                      title="No proforma invoices yet"
                      text="Create a proforma estimate without reserving or reducing stock."
                      action="Create a proforma"
                      onAction={startProforma}
                    />
                  )}
                </div>
              </div>
            </>
          )}
          {tab === "Purchases" && (
            <PurchaseEntryPage
              products={products}
              purchases={purchases}
              onError={notifyError}
              onSave={(entry, updatedProducts) => {
                setPurchases((current) => [entry, ...current]);
                setProducts(updatedProducts);
                notify(
                  `Purchase ${entry.number} recorded. Stock and product costs updated.`,
                );
              }}
            />
          )}
          {tab === "Sales returns" && (
            <SalesReturnsPage
              sales={sales}
              returns={returns}
              products={products}
              onError={notifyError}
              onSave={recordReturn}
            />
          )}
          {tab === "Expenses & cashbook" && (
            <ExpensesCashbookPage
              expenses={expenses}
              sales={sales}
              salePayments={salePayments}
              returns={returns}
              supplierPayments={supplierPayments}
              purchases={purchases}
              onError={notifyError}
              onSave={(expense: Expense) => {
                setExpenses((current) => [expense, ...current]);
                notify("Expense recorded.");
              }}
            />
          )}
          {tab === "Payment reminders" && (
            <PaymentRemindersPage
              sales={sales}
              returns={returns}
              onStatusChange={updateFollowUp}
              onError={notifyError}
            />
          )}
          {tab === "Supplier payments" && (
            <SupplierPaymentsPage
              purchases={purchases}
              payments={supplierPayments}
              onError={notifyError}
              onSave={(payment: SupplierPayment) => {
                setSupplierPayments((current) => [payment, ...current]);
                notify("Supplier payment recorded.");
              }}
            />
          )}
          {tab === "Sales invoices" && (
            <>
              <PageHead
                title="Sales invoices"
                subtitle="All your bills, payments and customer balances."
                action={
                  <button className="btn primary" onClick={startSale}>
                    <Plus size={16} /> New sale
                  </button>
                }
              />
              <div className="toolbar">
                <div className="searchbox">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search invoice or customer..."
                  />
                </div>
                <button
                  className="btn light"
                  onClick={() => exportCSV("sales")}
                >
                  <Download size={15} /> Export CSV
                </button>
              </div>
              <div className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>INVOICE</th>
                        <th>CUSTOMER</th>
                        <th>INVOICE DATE</th>
                        <th>TOTAL</th>
                        <th>PAID</th>
                        <th>BALANCE</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceMatches.map((s) => {
                        const balance = getSaleBalance(s, returns);
                        const effectiveStatus =
                          balance.balance === 0
                            ? "Paid"
                            : balance.paid > 0
                              ? "Part-paid"
                              : "Unpaid";
                        return (
                        <tr key={s.id}>
                          <td className="link-cell">{s.number}</td>
                          <td>{s.customerName}</td>
                          <td>{dateLabel(s.date)}</td>
                          <td className="strong">{fmt(getSaleBalance(s, returns).total)}</td>
                          <td>{fmt(getSaleBalance(s, returns).paid)}</td>
                          <td>{fmt(getSaleBalance(s, returns).balance)}</td>
                          <td>
                            <Status status={effectiveStatus} />
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                title="View invoice"
                                onClick={() => setViewSale(s)}
                              >
                                <Eye size={15} />
                              </button>
                              {balance.balance > 0 && (
                                <button
                                  title="Record payment"
                                  onClick={() => beginPayment(s)}
                                >
                                  <Wallet size={15} />
                                </button>
                              )}
                              <button
                                title="Print invoice"
                                onClick={() => printSale(s)}
                              >
                                <Printer size={15} />
                              </button>
                              <button
                                title="Delete invoice and restore stock"
                                onClick={() => deleteSale(s)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {invoiceMatches.length === 0 && (
                    <Empty
                      icon={<ReceiptText />}
                      title="No invoices found"
                      text="Create a sale to see invoices here."
                      action="Create a sale"
                      onAction={startSale}
                    />
                  )}
                </div>
              </div>
            </>
          )}
          {tab === "Products" && (
            <div className="products-page">
              <PageHead
                title="Products & services"
                subtitle="A clear view of your catalogue, GST-inclusive prices, tax rates and stock."
                action={
                  <button
                    className="btn primary"
                    onClick={startAddProduct}
                  >
                    <Plus size={16} /> Add product
                  </button>
                }
              />
              <section className="product-overview">
                <div className="product-overview-copy">
                  <span className="product-overview-kicker">PRODUCT CATALOGUE</span>
                  <h2>Everything in one place.</h2>
                  <p>
                    New products default to 18% GST. Intra-state: 9% CGST + 9%
                    SGST · Inter-state: 18% IGST.
                  </p>
                </div>
                <div className="product-overview-stats">
                  <div>
                    <span>Products</span>
                    <b>{products.length}</b>
                  </div>
                  <div>
                    <span>Units in stock</span>
                    <b>{productStockCount}</b>
                  </div>
                  <div>
                    <span>Retail stock value</span>
                    <b>{fmt(productRetailValue)}</b>
                  </div>
                  <div className={productLowStockCount ? "attention" : ""}>
                    <span>Low stock</span>
                    <b>{productLowStockCount}</b>
                  </div>
                </div>
                <div className="product-gst-chip">
                  <span>DEFAULT GST</span>
                  <b>18%</b>
                </div>
              </section>
              <div className="toolbar">
                <div className="searchbox">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, SKU, barcode or HSN..."
                  />
                </div>
                <button
                  className="btn light"
                  onClick={() => exportCSV("products")}
                >
                  <Download size={15} /> Export CSV
                </button>
              </div>
              <div className="panel product-catalogue-panel">
                <div className="product-list-heading">
                  <div>
                    <h2>Your products</h2>
                    <p>
                      {productMatches.length}{" "}
                      {productMatches.length === 1 ? "item" : "items"}
                      {query ? " matching your search" : " in your catalogue"}
                    </p>
                  </div>
                  <span className="product-price-hint">
                    Selling prices include GST
                  </span>
                </div>
                <div className="table-wrap">
                  <table
                    className={`product-table${productMatches.length ? " has-products" : ""}`}
                  >
                    <thead>
                      <tr>
                        <th>PRODUCT</th>
                        <th>SKU</th>
                        <th>BARCODE</th>
                        <th>HSN/SAC</th>
                        <th>COST</th>
                        <th>SELLING PRICE (INCL. GST)</th>
                        <th>MIN MARGIN</th>
                        <th>GST</th>
                        <th>STOCK</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productMatches.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="product-cell">
                              <div className="product-symbol">
                                <Package size={16} />
                              </div>
                              <div>
                                <b>{p.name}</b>
                                <small>{p.unit || "Product"}</small>
                              </div>
                            </div>
                          </td>
                          <td>{p.sku}</td>
                          <td>{p.barcode || "—"}</td>
                          <td>{p.hsn || "—"}</td>
                          <td>{fmt(p.cost)}</td>
                          <td className="strong">
                            <div className="product-price-cell">
                              <b>{fmt(p.price)}</b>
                            </div>
                          </td>
                          <td>{p.minMarginPct ? `${p.minMarginPct}%` : "Not set"}</td>
                          <td>
                            <span className="product-tax-badge">{p.gst}%</span>
                            <small className="product-tax-split">
                              CGST {p.gst / 2}% · SGST {p.gst / 2}%
                            </small>
                          </td>
                          <td>
                            <span
                              className={
                                p.stock <= p.minStock ? "stock-low" : "stock-ok"
                              }
                            >
                              {p.stock} {p.unit}
                            </span>
                            {(p.batches?.length ?? 0) > 0 && (
                              <small className="product-tax-split">
                                {p.batches?.filter((batch) => batch.quantity > 0).length} tracked lots
                              </small>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                title="Adjust stock"
                                onClick={() => {
                                  setShowAdjust(p);
                                  setAdjustQty("");
                                }}
                              >
                                <RotateCcw size={15} />
                              </button>
                              <button
                                title="Delete product"
                                onClick={() => {
                                  if (window.confirm(`Delete ${p.name}?`)) {
                                    setProducts((v) =>
                                      v.filter((x) => x.id !== p.id),
                                    );
                                    notify("Product deleted.");
                                  }
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {productMatches.length === 0 && (
                    <Empty
                      icon={<Package />}
                      title="No products found"
                      text="Add a product to begin building your catalogue."
                      action="Add product"
                      onAction={startAddProduct}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === "Customers" && (
            <>
              <PageHead
                title="Customers"
                subtitle="Customer details are ready when it's time to bill."
                action={
                  <button
                    className="btn primary"
                    onClick={() => setShowCustomer(true)}
                  >
                    <Plus size={16} /> Add customer
                  </button>
                }
              />
              <div className="toolbar">
                <div className="searchbox">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search customers..."
                  />
                </div>
                <span className="count-label">
                  {customers.length} customers
                </span>
              </div>
              <div className="metric-grid customer-insight-metrics">
                <Metric
                  icon={<Users />}
                  tone="blue"
                  label="Customer lifetime value"
                  value={fmt(customerInsights.lifetimeValue)}
                  sub="Total billed across your customer list"
                />
                <Metric
                  icon={<ReceiptText />}
                  tone="purple"
                  label="Repeat customers"
                  value={String(customerInsights.repeatCustomerCount)}
                  sub={`Of ${customers.length} saved customers`}
                />
                <Metric
                  icon={<Wallet />}
                  tone="orange"
                  label="Overdue balances"
                  value={fmt(customerInsights.overdueTotal)}
                  sub="Unpaid invoices past their due date"
                />
              </div>
              <div className="customer-grid">
                {customerMatches.map((c) => {
                  const insight = customerInsights.byCustomerId.get(c.id);
                  if (!insight) return null;
                  return (
                    <div className="panel customer-card" key={c.id}>
                      <div className="customer-top">
                        <div className="customer-avatar">
                          {c.name
                            .split(" ")
                            .slice(0, 2)
                            .map((x) => x[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="customer-actions">
                          <span
                            className={`customer-segment ${insight.segment.toLowerCase().replace(" ", "-")}`}
                          >
                            {insight.segment}
                          </span>
                          <button
                            className="row-icon"
                            onClick={() => {
                              if (window.confirm(`Delete customer ${c.name}?`))
                                setCustomers((v) => v.filter((x) => x.id !== c.id));
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <h3>{c.name}</h3>
                      <p>{c.gstin || "Unregistered / GSTIN not provided"}</p>
                      <div className="customer-meta">
                        <span>
                          <Users size={14} />
                          {c.phone || "No phone"}
                        </span>
                        <span>
                          <FileText size={14} />
                          {insight.invoiceCount} invoices
                        </span>
                      </div>
                      <div className="customer-address">
                        {c.address || "No address provided"} · {c.state}
                      </div>
                      <div className="customer-insight-grid">
                        <div>
                          <span>Lifetime billed</span>
                          <b>{fmt(insight.lifetimeValue)}</b>
                        </div>
                        <div>
                          <span>Average invoice</span>
                          <b>{fmt(insight.averageInvoiceValue)}</b>
                        </div>
                        <div className={insight.outstanding > 0 ? "has-balance" : ""}>
                          <span>Outstanding</span>
                          <b>{fmt(insight.outstanding)}</b>
                        </div>
                        <div>
                          <span>Last purchase</span>
                          <b>
                            {insight.lastPurchase
                              ? dateLabel(insight.lastPurchase)
                              : "No invoices"}
                          </b>
                        </div>
                      </div>
                      {insight.overdue > 0 && (
                        <button
                          className="customer-overdue"
                          onClick={() => setViewSale(insight.overdueInvoices[0])}
                        >
                          {fmt(insight.overdue)} overdue · Review oldest unpaid invoice
                        </button>
                      )}
                      <button
                        className="customer-bill"
                        onClick={() => {
                          setSaleCustomer(c.id);
                          startSale();
                          setSaleCustomer(c.id);
                        }}
                      >
                        <Plus size={14} /> Create sale for customer
                      </button>
                    </div>
                  );
                })}
              </div>
              {customerMatches.length === 0 && (
                <Empty
                  icon={<Users />}
                  title="No customers found"
                  text="Add a customer to speed up your billing."
                  action="Add customer"
                  onAction={() => setShowCustomer(true)}
                />
              )}
            </>
          )}
          {tab === "Inventory" && (
            <>
              <PageHead
                title="Inventory management"
                subtitle="Monitor on-hand quantities and adjust stock as goods arrive or are corrected."
                action={
                  <button
                    className="btn primary"
                    onClick={() => {
                      setShowAdjust(products[0] || null);
                      setAdjustQty("");
                    }}
                  >
                    <Plus size={16} /> Adjust stock
                  </button>
                }
              />
              <div className="metric-grid inventory-metrics">
                <Metric
                  icon={<Boxes />}
                  tone="purple"
                  label="Total units on hand"
                  value={String(productStockCount)}
                  sub="Across all products"
                />
                <Metric
                  icon={<AlertTriangle />}
                  tone="orange"
                  label="Low-stock products"
                  value={String(lowStock.length)}
                  sub="At or below threshold"
                />
                <Metric
                  icon={<IndianRupee />}
                  tone="green"
                  label="Stock cost value"
                  value={fmt(productStockCostValue)}
                  sub="Estimated at cost"
                />
                <Metric
                  icon={<TrendingUp />}
                  tone="blue"
                  label="Retail value"
                  value={fmt(productRetailValue)}
                  sub="Estimated at selling price"
                />
                <Metric
                  icon={<CalendarDays />}
                  tone="orange"
                  label="Expiring batches"
                  value={String(expiringBatches.length)}
                  sub="Expired or due in the next 30 days"
                />
              </div>
              {expiringBatches.length > 0 && (
                <section className="panel expiry-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Expiry watch</h2>
                      <p>Batches with an expiry date within 30 days or already expired.</p>
                    </div>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>PRODUCT</th><th>BATCH</th><th>EXPIRY</th><th>QTY LEFT</th><th>STATUS</th></tr></thead>
                      <tbody>{expiringBatches.map(({ product, batch }) => (
                        <tr key={batch.id}>
                          <td>{product.name}</td>
                          <td>{batch.code || "—"}</td>
                          <td>{dateLabel(batch.expiryDate)}</td>
                          <td>{batch.quantity} {product.unit}</td>
                          <td><span className="stock-low">{batch.expiryDate < today() ? "Expired" : "Expiring soon"}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}
              <section className="panel restock-panel">
                <div className="panel-head">
                  <div>
                    <h2>Smart restock planner</h2>
                    <p>
                      Estimates based on units sold in the last 30 days, for
                      roughly 30 days of future cover.
                    </p>
                  </div>
                  <span className="restock-window">LAST 30 DAYS</span>
                </div>
                {restockRecommendations.length ? (
                  <div className="restock-list">
                    {restockRecommendations.map(
                      ({
                        product,
                        unitsSold,
                        targetStock,
                        suggestedQuantity,
                        daysOfStock,
                      }) => (
                        <div className="restock-row" key={product.id}>
                          <div className="restock-product">
                            <div className="restock-icon">
                              <Package size={16} />
                            </div>
                            <div>
                              <b>{product.name}</b>
                              <small>
                                {unitsSold} sold · {product.stock} in stock
                              </small>
                            </div>
                          </div>
                          <div className="restock-cover">
                            <b>
                              {Number.isFinite(daysOfStock)
                                ? `${Math.floor(daysOfStock)} days`
                                : "—"}
                            </b>
                            <small>estimated cover</small>
                          </div>
                          <div className="restock-quantity">
                            <b>
                              {suggestedQuantity} {product.unit}
                            </b>
                            <small>to reach {targetStock} target stock</small>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="restock-empty">
                    <CheckCircle2 size={18} />
                    <div>
                      <b>No restock suggestions yet</b>
                      <p>
                        Recent sales are not outpacing current stock. Products
                        without recent sales may still need a manual stock
                        check.
                      </p>
                    </div>
                  </div>
                )}
                <p className="restock-disclaimer">
                  Planning estimate only—not a purchase order. Actual demand may
                  change.
                </p>
              </section>
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Stock levels</h2>
                    <p>Sales automatically reduce available stock.</p>
                  </div>
                  <div className="legend">
                    <span className="legend-low" /> Low stock
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>PRODUCT</th>
                        <th>SKU</th>
                        <th>ON HAND</th>
                        <th>REORDER AT</th>
                        <th>STOCK STATUS</th>
                        <th>STOCK VALUE</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id}>
                          <td className="strong">{p.name}</td>
                          <td>{p.sku}</td>
                          <td className="strong">
                            {p.stock} {p.unit}
                          </td>
                          <td>{p.minStock}</td>
                          <td>
                            {p.stock <= p.minStock ? (
                              <span className="stock-low">
                                <AlertTriangle size={12} /> Reorder needed
                              </span>
                            ) : (
                              <span className="stock-ok">
                                <CheckCircle2 size={12} /> In stock
                              </span>
                            )}
                          </td>
                          <td>{fmt(p.stock * p.cost)}</td>
                          <td>
                            <button
                              className="btn tiny light"
                              onClick={() => {
                                setShowAdjust(p);
                                setAdjustQty("");
                              }}
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          {tab === "Reports" && (
            <>
              <PageHead
                title="Sales reports"
                subtitle="A quick view of sales, collections and product performance."
                action={
                  <div className="report-export-actions">
                    <button
                      className="btn light"
                      onClick={downloadReportPDF}
                      disabled={!hasReportData}
                      title={!hasReportData ? "Add sales or products before downloading a report." : undefined}
                    >
                      <FileText size={15} /> PDF
                    </button>
                    <button
                      className="btn light"
                      onClick={downloadReportExcel}
                      disabled={!hasReportData}
                      title={!hasReportData ? "Add sales or products before downloading a report." : undefined}
                    >
                      <FileSpreadsheet size={15} /> Excel
                    </button>
                    <button
                      className="btn primary"
                      onClick={downloadReportCSV}
                      disabled={!hasReportData}
                      title={!hasReportData ? "Add sales or products before downloading a report." : undefined}
                    >
                      <Download size={15} /> CSV
                    </button>
                  </div>
                }
              />
              <div className="metric-grid">
                <Metric
                  icon={<IndianRupee />}
                  tone="purple"
                  label="Gross sales"
                  value={fmt(revenue)}
                  sub="All recorded invoices"
                />
                <Metric
                  icon={<Wallet />}
                  tone="green"
                  label="Collected"
                  value={fmt(received)}
                  sub="Payments received"
                />
                <Metric
                  icon={<TrendingUp />}
                  tone="orange"
                  label="Receivables"
                  value={fmt(outstanding)}
                  sub="Outstanding balance"
                />
                <Metric
                  icon={<Package />}
                  tone="blue"
                  label="Units sold"
                  value={String(unitsSold)}
                  sub="Across all invoices"
                />
              </div>
              <div className="report-grid">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Sales by invoice</h2>
                      <p>Recorded sales totals</p>
                    </div>
                  </div>
                  {sales.length === 0 ? (
                    <Empty
                      icon={<ChartNoAxesCombined />}
                      title="No sales data yet"
                      text="Your sales report will populate when you create invoices."
                      action="Create a sale"
                      onAction={startSale}
                    />
                  ) : (
                    <div className="report-bars">
                      {sales.slice(0, 8).map((s) => (
                        <div className="report-bar-row" key={s.id}>
                          <span>{s.number}</span>
                          <div className="bar-track">
                            <i
                              style={{
                                width: `${Math.max(3, (s.total / Math.max(...sales.map((x) => x.total), 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <b>{fmt(s.total)}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Top products by units sold</h2>
                      <p>Quantity across all invoices</p>
                    </div>
                  </div>
                  {topProductsBySales.length > 0 ? (
                    topProductsBySales.map((product) => (
                      <div className="top-product" key={product.sku}>
                        <div className="product-symbol">
                          <Package size={15} />
                        </div>
                        <span>{product.name}</span>
                        <b>{product.unitsSold} sold</b>
                      </div>
                    ))
                  ) : (
                    <div className="empty-lines">
                      No products sold yet. Sales will appear here once invoices are created.
                    </div>
                  )}
                </div>
              </div>
              <section className="panel basket-dna-panel">
                <div className="panel-head">
                  <div>
                    <span className="basket-dna-kicker">LOCAL RECEIPT PATTERNS</span>
                    <h2>Basket DNA</h2>
                    <p>
                      Product pairs that show up together in real invoices—use
                      the pattern to prompt a relevant add-on.
                    </p>
                  </div>
                  <div className="basket-dna-symbol">
                    <ShoppingCart size={19} />
                  </div>
                </div>
                {basketAffinities.length ? (
                  <div className="basket-pair-list">
                    {basketAffinities.map((pair) => {
                      const firstInStock =
                        products.find((product) => product.id === pair.firstId)
                          ?.stock ?? 0;
                      const secondInStock =
                        products.find((product) => product.id === pair.secondId)
                          ?.stock ?? 0;
                      const canStartSale = firstInStock > 0 && secondInStock > 0;
                      return (
                        <div
                          className="basket-pair"
                          key={`${pair.firstId}\u0000${pair.secondId}`}
                        >
                          <div className="basket-pair-products">
                            <span>{pair.firstName}</span>
                            <b>+</b>
                            <span>{pair.secondName}</span>
                          </div>
                          <div className="basket-pair-insight">
                            <b>{pair.affinity}%</b>
                            <span>
                              of {pair.anchorName} invoices also include{" "}
                              {pair.otherName}
                            </span>
                            <small>
                              Seen in {pair.invoiceCount} of{" "}
                              {pair.anchorInvoiceCount} {pair.anchorName}{" "}
                              {pair.anchorInvoiceCount === 1
                                ? "invoice"
                                : "invoices"}
                            </small>
                          </div>
                          <button
                            className="btn light basket-pair-action"
                            disabled={!canStartSale}
                            title={
                              canStartSale
                                ? "Start a sale with both products"
                                : "Both products need stock to start a sale"
                            }
                            onClick={() =>
                              startPairSale([pair.firstId, pair.secondId])
                            }
                          >
                            <Plus size={14} /> Add both to sale
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="basket-dna-empty">
                    <ShoppingCart size={18} />
                    <div>
                      <b>No product pair patterns yet</b>
                      <p>
                        When invoices contain multiple products, Billwise will
                        surface the combinations customers choose together.
                      </p>
                    </div>
                  </div>
                )}
                <p className="basket-dna-note">
                  Based on invoice co-occurrence, not a guarantee of future
                  demand. Each invoice counts a product once, even when its
                  quantity is greater than one.
                </p>
              </section>
              <div className="panel report-footnote">
                <AlertTriangle size={16} />
                <p>
                  <b>Reporting note:</b> Reports reflect the records currently
                  saved in this browser. Export a backup regularly to keep your
                  business records safe.
                </p>
              </div>
            </>
          )}
          {tab === "Settings" && (
            <>
              <PageHead
                title="Business settings"
                subtitle="Set up the business details used on your invoices."
                action={
                  <button
                    className="btn primary"
                    onClick={() => notify("Business details saved locally.")}
                  >
                    <Save size={15} /> Save settings
                  </button>
                }
              />
              <div className="settings-grid">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Business profile</h2>
                      <p>Shown on invoice documents</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    <Field label="Business name">
                      <input
                        value={business.name}
                        onChange={(e) =>
                          setBusiness({ ...business, name: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="GSTIN">
                      <input
                        value={business.gstin}
                        onChange={(e) =>
                          setBusiness({ ...business, gstin: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Phone">
                      <input
                        value={business.phone}
                        onChange={(e) =>
                          setBusiness({ ...business, phone: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        value={business.email}
                        onChange={(e) =>
                          setBusiness({ ...business, email: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Business address">
                      <input
                        value={business.address}
                        onChange={(e) =>
                          setBusiness({ ...business, address: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Invoice number prefix">
                      <input
                        value={business.prefix}
                        onChange={(e) =>
                          setBusiness({ ...business, prefix: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="State">
                      <select
                        value={business.state}
                        onChange={(e) =>
                          setBusiness({ ...business, state: e.target.value })
                        }>
                        <option value="">Select state</option>
                        {business.state &&
                          !INDIAN_STATES.some(
                            (state) => state === business.state,
                          ) && (
                            <option value={business.state}>
                              {business.state}
                            </option>
                          )}
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Data & backup</h2>
                      <p>Manage your local business data</p>
                    </div>
                  </div>
                  <div className="backup-row">
                    <div className="backup-icon">
                      <Download />
                    </div>
                    <div>
                      <b>Export backup</b>
                      <p>
                        Download all local records, including returns, expenses
                        and payment tracking, as a JSON file.
                      </p>
                    </div>
                    <button className="btn light" onClick={backup}>
                      Download
                    </button>
                  </div>
                  <div className="backup-row">
                    <div className="backup-icon">
                      <Upload />
                    </div>
                    <div>
                      <b>Restore backup</b>
                      <p>
                        Import a previous Billwise JSON backup. Current data
                        will be replaced.
                      </p>
                    </div>
                    <button
                      className="btn light"
                      onClick={() => fileRef.current?.click()}
                    >
                      Import
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".json,application/json"
                      hidden
                      onChange={(e) => restore(e.target.files?.[0])}
                    />
                  </div>
                  <div className="backup-row">
                    <div className="backup-icon danger">
                      <Trash2 />
                    </div>
                    <div>
                      <b>Clear all local data</b>
                      <p>
                        Remove all business records and settings from this
                        browser.
                      </p>
                    </div>
                    <button
                      className="btn danger-btn"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Permanently clear all Billwise data in this browser? Download a backup first if needed.",
                          )
                        ) {
                          setProducts([]);
                          setCustomers([]);
                          setSales([]);
                          setProformas([]);
                          setPurchases([]);
                          setReturns([]);
                          setExpenses([]);
                          setSupplierPayments([]);
                          setSalePayments([]);
                          setBusiness(emptyBusiness);
                          notify("Local data cleared.");
                        }
                      }}
                    >
                      Clear data
                    </button>
                  </div>
                  <div className="warning-note">
                    <AlertTriangle size={17} />
                    <p>
                      <b>Local storage limitation</b>
                      <br />
                      Data is saved only in this browser on this device.
                      Clearing browser storage or changing devices can remove
                      access. Export backups regularly. This prototype has no
                      user accounts or cloud sync.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <footer className="footer">
          <span>Billwise Small Business Manager</span>
          <span>
            <i /> Local data · No server connected
          </span>
          <span>GST calculations are estimates; verify before filing.</span>
        </footer>
      </main>
      {showProduct && (
        <Modal
          title="Add a product"
          subtitle="New products use 18% GST by default. Selling price includes GST."
          onClose={() => setShowProduct(false)}
        >
          <div className="form-grid two product-entry-form">
            <Field label="Product name *">
              <input
                autoFocus
                value={productForm.name || ""}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
              />
            </Field>
            <Field label="SKU / item code *">
              <input
                value={productForm.sku || ""}
                onChange={(e) =>
                  setProductForm({ ...productForm, sku: e.target.value })
                }
              />
            </Field>
            <Field label="Barcode (optional)">
              <input
                value={productForm.barcode || ""}
                onChange={(e) =>
                  setProductForm({ ...productForm, barcode: e.target.value })
                }
                placeholder="Scan or enter barcode"
              />
            </Field>
            <Field label="HSN / SAC">
              <input
                value={productForm.hsn || ""}
                onChange={(e) =>
                  setProductForm({ ...productForm, hsn: e.target.value })
                }
              />
            </Field>
            <Field label="Selling price (₹)">
              <input
                type="text"
                inputMode="decimal"
                value={productNumbers.price}
                onChange={(e) =>
                  setProductNumbers({ ...productNumbers, price: e.target.value })
                }
              />
            </Field>
            <Field label="GST rate (%)">
              <select
                value={productForm.gst ?? ""}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    gst:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }>
                {GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Opening stock">
              <input
                type="text"
                inputMode="decimal"
                value={productNumbers.stock}
                onChange={(e) =>
                  setProductNumbers({ ...productNumbers, stock: e.target.value })
                }
              />
            </Field>
          </div>
          <details className="product-advanced-fields">
            <summary>More details <span>Unit, cost and stock threshold</span></summary>
            <div className="form-grid two product-entry-form">
              <Field label="Cost price (₹)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={productNumbers.cost}
                  onChange={(e) =>
                    setProductNumbers({
                      ...productNumbers,
                      cost: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Low-stock threshold">
                <input
                  type="text"
                  inputMode="decimal"
                  value={productNumbers.minStock}
                  onChange={(e) =>
                    setProductNumbers({
                      ...productNumbers,
                      minStock: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Unit">
                <select
                  value={productForm.unit || ""}
                  onChange={(e) =>
                    setProductForm({ ...productForm, unit: e.target.value })
                  }
                >
                  <option value="">Select unit</option>
                  {PRODUCT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Minimum margin alert (%)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={productForm.minMarginPct ?? ""}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      minMarginPct: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  placeholder="0 = alert only below cost"
                />
              </Field>
            </div>
          </details>
          <p className="product-gst-note">
            <AlertTriangle size={15} />
            Sales tax is calculated using this product's selected GST rate.
            Rates are applied per product, including on invoices with mixed
            rates. Verify the applicable rate before billing.
          </p>
          <div className="modal-actions">
            <button className="btn light" onClick={() => setShowProduct(false)}>
              Cancel
            </button>
            <button className="btn primary" onClick={saveProduct}>
              <Plus size={15} /> Add product
            </button>
          </div>
        </Modal>
      )}
      {showCustomer && (
        <Modal
          title="Add a customer"
          subtitle="Save billing information for faster checkout."
          onClose={() => setShowCustomer(false)}
        >
          <div className="form-grid two">
            <Field label="Customer / business name *">
              <input
                autoFocus
                value={customerForm.name || ""}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, name: e.target.value })
                }
                placeholder="Customer name"
              />
            </Field>
            <Field label="GSTIN (optional)">
              <input
                value={customerForm.gstin || ""}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, gstin: e.target.value })
                }
              />
            </Field>
            <Field label="Phone">
              <input
                value={customerForm.phone || ""}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, phone: e.target.value })
                }
              />
            </Field>
            <Field label="Email">
              <input
                value={customerForm.email || ""}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, email: e.target.value })
                }
              />
            </Field>
            <Field label="Address">
              <input
                value={customerForm.address || ""}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, address: e.target.value })
                }
              />
            </Field>
            <Field label="State">
              <select
                value={customerForm.state || ""}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, state: e.target.value })
                }>
                <option value="">Select state</option>
                {customerForm.state &&
                  !INDIAN_STATES.some(
                    (state) => state === customerForm.state,
                  ) && (
                    <option value={customerForm.state}>
                      {customerForm.state}
                    </option>
                  )}
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="modal-actions">
            <button
              className="btn light"
              onClick={() => setShowCustomer(false)}
            >
              Cancel
            </button>
            <button className="btn primary" onClick={saveCustomer}>
              <Plus size={15} /> Add customer
            </button>
          </div>
        </Modal>
      )}
      {showAdjust && (
        <Modal
          title="Adjust stock"
          subtitle={`${showAdjust.name} · Current stock: ${showAdjust.stock} ${showAdjust.unit}`}
          onClose={() => setShowAdjust(null)}
        >
          <div className="form-grid">
            <Field label="Quantity to add / remove">
              <input
                type="text"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
              />
            </Field>
          </div>
          <p className="helper-text">
            Use a positive number to add stock. Use a negative number to reduce
            stock. Sales already reduce stock automatically.
          </p>
          <div className="modal-actions">
            <button className="btn light" onClick={() => setShowAdjust(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const result = adjustProductStock(showAdjust, Number(adjustQty));
                if (!result.ok) {
                  notifyError(result.message);
                  return;
                }
                setProducts((v) =>
                  v.map((p) =>
                    p.id === showAdjust.id ? result.product : p,
                  ),
                );
                setShowAdjust(null);
                notify("Stock adjusted.");
              }}
            >
              <Save size={15} /> Apply adjustment
            </button>
          </div>
        </Modal>
      )}
      {paymentSale && (
        <Modal
          title="Record payment"
          subtitle={`${paymentSale.number} · ${paymentSale.customerName}`}
          onClose={() => {
            setPaymentSale(null);
            setPaymentAmount("");
          }}
        >
          <div className="payment-balance-note">
            Outstanding balance:{" "}
            <b>{fmt(getSaleBalance(paymentSale, returns).balance)}</b>
          </div>
          <div className="form-grid">
            <Field label="Payment received (₹)">
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="Enter amount"
              />
            </Field>
          </div>
          <div className="modal-actions">
            <button
              className="btn light"
              onClick={() => {
                setPaymentSale(null);
                setPaymentAmount("");
              }}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => recordPayment(paymentSale)}
            >
              <Wallet size={15} /> Save payment
            </button>
          </div>
        </Modal>
      )}
      {viewSale && (
        <Modal
          title={viewSale.number}
          subtitle={`Invoice preview · ${viewSale.customerName}`}
          onClose={() => setViewSale(null)}
          wide
          printable
        >
          <InvoiceView
            sale={viewSale}
            business={business}
            onPrint={() => printSale(viewSale)}
          />
          <div className="modal-actions">
            <button className="btn light" onClick={() => deleteSale(viewSale)}>
              <Trash2 size={15} /> Delete invoice
            </button>
            {viewSale.paid < viewSale.total && (
              <button
                className="btn light"
                onClick={() => beginPayment(viewSale)}
              >
                <Wallet size={15} /> Record payment
              </button>
            )}
            <button className="btn primary" onClick={() => printSale(viewSale)}>
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        </Modal>
      )}
      {viewProforma && (
        <Modal
          title={viewProforma.number}
          subtitle={`Proforma estimate · ${viewProforma.customerName}`}
          onClose={() => setViewProforma(null)}
          wide
          printable
        >
          <InvoiceView
            sale={viewProforma}
            business={business}
            proforma
            validUntil={viewProforma.validUntil}
            onPrint={() => printProforma(viewProforma)}
          />
          <div className="modal-actions">
            {viewProforma.status === "Open" && (
              <button
                className="btn light"
                onClick={() => convertProforma(viewProforma)}
              >
                <ShoppingCart size={15} /> Convert to sale
              </button>
            )}
            <button
              className="btn primary"
              onClick={() => printProforma(viewProforma)}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        </Modal>
      )}
      <Chatbot
        revenue={revenue}
        outstanding={outstanding}
        sales={sales}
        products={products}
        customers={customers}
        onNavigate={openTab}
        onOpenResult={(result: ChatResult) => {
          setMobile(false);
          setShowSale(false);
          if (result.sale) {
            setTab("Sales invoices");
            setViewSale(result.sale);
          } else if (result.product) {
            setQuery(result.product.name);
            setTab("Products");
          } else if (result.customer) {
            setQuery(result.customer.name);
            setTab("Customers");
          }
        }}
      />
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {errorPopup && (
        <Modal
          title="Something went wrong"
          subtitle="Please review the details below and try again."
          onClose={() => setErrorPopup("")}
        >
          <div className="error-popup-message" role="alert">
            <AlertTriangle size={20} />
            <p>{errorPopup}</p>
          </div>
          <div className="modal-actions">
            <button
              className="btn primary"
              onClick={() => setErrorPopup("")}
              autoFocus
            >
              Close
            </button>
          </div>
        </Modal>
      )}
      {marginWarnings.length > 0 && (
        <Modal
          title="Low margin warning"
          subtitle="One or more items are below cost or their configured minimum margin."
          onClose={() => setMarginWarnings([])}
        >
          <div className="margin-warning-list">
            {marginWarnings.map((warning) => (
              <p key={warning}><AlertTriangle size={15} />{warning}</p>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn light" onClick={() => setMarginWarnings([])}>Cancel sale</button>
            <button
              className="btn primary"
              onClick={() => {
                setMarginWarnings([]);
                saveSale(true);
              }}
            >
              Continue sale
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

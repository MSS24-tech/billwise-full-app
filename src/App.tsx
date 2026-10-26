import { useEffect, useMemo, useRef, useState } from "react";
import {
  dateLabel,
  calculateSaleTotals,
  emptyBusiness,
  fmt,
  id,
  priceWithGst,
  read,
  saleQuantitiesByProduct,
  today,
  updateStockForSale,
} from "./domain";
import type { Customer, Product, Sale, SaleLine, Tab } from "./domain";
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
import { Chatbot } from "./components/Chatbot";
import type { ChatResult } from "./components/Chatbot";
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
  ShoppingCart,
  RotateCcw,
  Upload,
  Save,
  Boxes,
  Wallet,
  CalendarDays,
  Eye,
  Minus,
  Filter,
} from "lucide-react";

export default function App() {
  const [tab, setTab] = useState<Tab>("Overview"),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [toast, setToast] = useState("");
  const [products, setProducts] = useState<Product[]>(() => {
    const savedProducts = read<Product[]>("bw-products", []);
    if (localStorage.getItem("bw-prices-include-gst") === "true") {
      return savedProducts;
    }
    return savedProducts.map((product) => ({
      ...product,
      price: priceWithGst(product.price, product.gst),
    }));
  });
  const [customers, setCustomers] = useState<Customer[]>(() =>
    read("bw-customers", []),
  );
  const [sales, setSales] = useState<Sale[]>(() => read("bw-sales", []));
  const [business, setBusiness] = useState(() =>
    read("bw-business", emptyBusiness),
  );
  const [showProduct, setShowProduct] = useState(false),
    [showCustomer, setShowCustomer] = useState(false),
    [showAdjust, setShowAdjust] = useState<Product | null>(null),
    [showSale, setShowSale] = useState(false),
    [viewSale, setViewSale] = useState<Sale | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: "",
    sku: "",
    barcode: "",
    hsn: "",
    unit: "",
    gst: 18,
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
    [salePlace, setSalePlace] = useState(""),
    [saleDiscount, setSaleDiscount] = useState(""),
    [salePaid, setSalePaid] = useState(""),
    [saleNotes, setSaleNotes] = useState(""),
    [saleLines, setSaleLines] = useState<{ productId: string; qty: number }[]>(
      [],
    );
  const fileRef = useRef<HTMLInputElement>(null);
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
    localStorage.setItem("bw-business", JSON.stringify(business));
  }, [business]);
  const notify = (s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(""), 2600);
  };
  const nav = [
    ["Overview", LayoutDashboard],
    ["New sale", ShoppingCart],
    ["Sales invoices", ReceiptText],
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
  const productStockCount = products.reduce((sum, product) => sum + product.stock, 0);
  const productRetailValue = products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0,
  );
  const productLowStockCount = products.filter(
    (product) => product.stock <= product.minStock,
  ).length;
  const saleSupply: Sale["supply"] =
    business.state.trim() &&
    salePlace.trim() &&
    business.state.trim().toLowerCase() === salePlace.trim().toLowerCase()
      ? "Intra-state"
      : "Inter-state";
  const computed = useMemo(() => {
    const lines = saleLines
      .map((l) => {
        const p = products.find((p) => p.id === l.productId);
        return p
          ? {
              productId: p.id,
              name: p.name,
              hsn: p.hsn,
              qty: Math.max(0, Number(l.qty) || 0),
              rate: p.price,
              gst: p.gst,
              cost: p.cost,
              amount: p.price * Math.max(0, Number(l.qty) || 0),
            }
          : null;
      })
      .filter(Boolean) as (SaleLine & { amount: number })[];
    return {
      lines,
      ...calculateSaleTotals(
        lines,
        Number(saleDiscount) || 0,
        saleSupply,
      ),
    };
  }, [saleLines, products, saleDiscount, saleSupply]);
  const revenue = sales.reduce((a, s) => a + s.total, 0),
    received = sales.reduce((a, s) => a + s.paid, 0),
    outstanding = sales.reduce((a, s) => a + Math.max(0, s.total - s.paid), 0),
    lowStock = products.filter((p) => p.stock <= p.minStock);
  const todaySales = sales.filter((sale) => sale.date === today());
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const todayGrossProfit = todaySales.reduce(
    (sum, sale) =>
      sum +
      sale.lines.reduce(
        (lineProfit, line) =>
          lineProfit +
          (line.rate / (1 + line.gst / 100) *
            (1 - Math.min(100, Math.max(0, sale.discount)) / 100) -
            line.cost) *
            line.qty,
        0,
      ),
    0,
  );
  const paymentFollowUp = sales
    .filter((sale) => sale.total > sale.paid)
    .sort((a, b) => b.total - b.paid - (a.total - a.paid))[0];
  const demandWindowEnd = today();
  const demandWindowStartDate = new Date();
  demandWindowStartDate.setDate(demandWindowStartDate.getDate() - 29);
  const demandWindowStart = [
    demandWindowStartDate.getFullYear(),
    String(demandWindowStartDate.getMonth() + 1).padStart(2, "0"),
    String(demandWindowStartDate.getDate()).padStart(2, "0"),
  ].join("-");
  const recentUnitsSold = new Map<string, number>();
  for (const sale of sales) {
    if (sale.date < demandWindowStart || sale.date > demandWindowEnd) continue;
    for (const line of sale.lines) {
      recentUnitsSold.set(
        line.productId,
        (recentUnitsSold.get(line.productId) ?? 0) + line.qty,
      );
    }
  }
  const restockRecommendations = products
    .map((product) => {
      const unitsSold = recentUnitsSold.get(product.id) ?? 0;
      const targetStock = Math.max(Math.ceil(unitsSold), product.minStock);
      const suggestedQuantity = Math.max(0, targetStock - product.stock);
      return {
        product,
        unitsSold,
        targetStock,
        suggestedQuantity,
        daysOfStock: unitsSold > 0 ? (product.stock / unitsSold) * 30 : Infinity,
      };
    })
    .filter((item) => item.suggestedQuantity > 0)
    .sort((a, b) => a.daysOfStock - b.daysOfStock)
    .slice(0, 5);
  const resetSaleForm = () => {
    setSaleCustomer("");
    setSaleDate("");
    setSalePlace("");
    setSaleDiscount("");
    setSalePaid("");
    setSaleNotes("");
    setSaleLines([]);
  };
  const startSale = () => {
    setSaleCustomer(customers[0]?.id || "");
    setSaleDate(today());
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
  const saveSale = () => {
    if (!business.name.trim() || !business.state.trim()) {
      notify("Enter your business name and state in Settings before creating an invoice.");
      return;
    }
    if (!saleDate || !salePlace.trim()) {
      notify("Enter the invoice date and place of supply.");
      return;
    }
    if (!saleCustomer || !computed.lines.length) {
      notify("Select a customer and add at least one item.");
      return;
    }
    const requestedQuantities = saleQuantitiesByProduct(computed.lines);
    for (const [productId, quantity] of requestedQuantities) {
      const product = products.find((item) => item.id === productId);
      if (
        !product ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > product.stock
      ) {
        notify(
          `Not enough stock for ${product?.name ?? "a selected product"}. Available: ${product?.stock ?? 0}; requested: ${quantity}.`,
        );
        return;
      }
    }
    const c = customers.find((c) => c.id === saleCustomer)!;
    const paid = Math.min(computed.total, Math.max(0, Number(salePaid) || 0));
    const number = business.prefix + String(sales.length + 1).padStart(4, "0");
    const sale: Sale = {
      id: id(),
      number,
      date: saleDate,
      due: "",
      customerId: c.id,
      customerName: c.name,
      customerGstin: c.gstin,
      place: salePlace,
      supply: saleSupply,
      lines: computed.lines,
      discount: computed.discount,
      discountAmount: computed.discountAmount,
      subtotal: computed.subtotal,
      taxableSubtotal: computed.taxableSubtotal,
      tax: computed.tax,
      cgst: computed.cgst,
      sgst: computed.sgst,
      igst: computed.igst,
      roundingAdjustment: computed.roundingAdjustment,
      total: computed.total,
      paid,
      status:
        paid >= computed.total ? "Paid" : paid > 0 ? "Part-paid" : "Unpaid",
      notes: saleNotes,
      pricesIncludeGst: true,
    };
    setSales((v) => [sale, ...v]);
    setProducts((v) => updateStockForSale(v, computed.lines, -1));
    resetSaleForm();
    setShowSale(false);
    setTab("Sales invoices");
    setQuery("");
    notify(`Invoice ${number} created and stock updated.`);
  };
  const recordPayment = (s: Sale) => {
    const amt = Number(
      window.prompt(
        `Outstanding: ${fmt(Math.max(0, s.total - s.paid))}\nEnter payment received (₹):`,
        String(Math.max(0, s.total - s.paid)),
      ),
    );
    if (!Number.isFinite(amt) || amt <= 0) return;
    setSales((v) =>
      v.map((x) =>
        x.id === s.id
          ? {
              ...x,
              paid: Math.min(x.total, x.paid + amt),
              status:
                Math.min(x.total, x.paid + amt) >= x.total
                  ? "Paid"
                  : "Part-paid",
            }
          : x,
      ),
    );
    notify("Payment recorded.");
  };
  const deleteSale = (s: Sale) => {
    if (
      !window.confirm(
        `Delete ${s.number}? Stock will be returned to inventory.`,
      )
    )
      return;
    setSales((v) => v.filter((x) => x.id !== s.id));
    setProducts((v) => updateStockForSale(v, s.lines, 1));
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
    setShowProduct(true);
  };
  const saveProduct = () => {
    if (!productForm.name?.trim() || !productForm.sku?.trim()) {
      notify("Product name and SKU are required.");
      return;
    }
    if (
      products.some(
        (p) => p.sku.toLowerCase() === productForm.sku!.toLowerCase(),
      )
    ) {
      notify("SKU already exists. Use a unique SKU.");
      return;
    }
    const barcode = productForm.barcode?.trim() || "";
    if (
      barcode &&
      products.some(
        (p) => p.barcode?.trim().toLowerCase() === barcode.toLowerCase(),
      )
    ) {
      notify("Barcode already exists. Use a unique barcode.");
      return;
    }
    const gst = Number(productForm.gst ?? 0);
    const price = Number(productForm.price ?? 0);
    const cost = Number(productForm.cost ?? 0);
    const openingStock = Number(productForm.stock ?? 0);
    const minStock = Number(productForm.minStock ?? 0);
    if (
      !Number.isFinite(gst) ||
      gst < 0 ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(cost) ||
      cost < 0 ||
      !Number.isFinite(openingStock) ||
      openingStock < 0 ||
      !Number.isFinite(minStock) ||
      minStock < 0
    ) {
      notify("Price, cost, opening stock, and threshold must be valid non-negative numbers.");
      return;
    }
    setProducts((v) => [
      {
        id: id(),
        name: productForm.name!.trim(),
        sku: productForm.sku!.trim(),
        barcode,
        hsn: productForm.hsn || "",
        unit: productForm.unit || "",
        cost,
        price,
        gst,
        stock: openingStock,
        minStock,
      },
      ...v,
    ]);
    setShowProduct(false);
    setProductForm({
      name: "",
      sku: "",
      barcode: "",
      hsn: "",
      unit: "",
      gst: 18,
    });
    notify("Product added.");
  };
  const addProductToSale = (product: Product) => {
    const currentQty = saleLines.reduce(
      (quantity, line) =>
        line.productId === product.id ? quantity + line.qty : quantity,
      0,
    );
    if (currentQty >= product.stock) {
      notify(`No more stock available for ${product.name}.`);
      return;
    }
    setSaleLines((lines) => {
      const existing = lines.find((line) => line.productId === product.id);
      return existing
        ? lines.map((line) =>
            line.productId === product.id
              ? { ...line, qty: line.qty + 1 }
              : line,
          )
        : [...lines, { productId: product.id, qty: 1 }];
    });
    notify(`${product.name} added to sale.`);
  };
  const scanProductIntoSale = (scannedCode: string) => {
    const code = scannedCode.trim().toLowerCase();
    if (!code) return;
    const product =
      products.find((item) => item.barcode?.trim().toLowerCase() === code) ??
      products.find((item) => item.sku.trim().toLowerCase() === code);
    if (!product) {
      notify(`No product found for barcode "${scannedCode.trim()}".`);
      return;
    }
    addProductToSale(product);
  };
  const saveCustomer = () => {
    if (!customerForm.name?.trim()) {
      notify("Customer name is required.");
      return;
    }
    setCustomers((v) => [
      {
        id: id(),
        name: customerForm.name!.trim(),
        gstin: customerForm.gstin || "",
        phone: customerForm.phone || "",
        email: customerForm.email || "",
        address: customerForm.address || "",
        state: customerForm.state || "",
      },
      ...v,
    ]);
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
    const p = products.find(
      (p) => p.stock > 0 && !saleLines.some((l) => l.productId === p.id),
    );
    if (!p) {
      notify("No additional in-stock products available.");
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
              s.total.toFixed(2),
              s.paid.toFixed(2),
              (s.total - s.paid).toFixed(2),
              s.status,
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
  const backup = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            business,
            products,
            customers,
            sales,
            version: 2,
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
        const d = JSON.parse(String(r.result));
        if (
          !Array.isArray(d.products) ||
          !Array.isArray(d.customers) ||
          !Array.isArray(d.sales)
        )
          throw new Error("Invalid backup");
        if (!window.confirm("Import backup and replace current data?")) return;
        setBusiness(d.business || business);
        setProducts(
          d.products.map((product: Product) => ({
            ...product,
            price:
              d.pricesIncludeGst === true
                ? product.price
                : priceWithGst(product.price, product.gst),
          })),
        );
        setCustomers(d.customers);
        setSales(d.sales);
        notify("Backup imported.");
      } catch {
        notify("Could not import this file. Choose a Billwise JSON backup.");
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
  const statusClass = (s: string) => s.toLowerCase().replace("-", "");
  const openTab = (t: Tab) => {
    if (t === "New sale") {
      startSale();
      setQuery("");
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
              <i /> Offline-ready
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
          {tab === "New sale" && (
            <>
              <div className="page-title-row">
                <div>
                  <div className="eyebrow">BILLING WORKSPACE</div>
                  <h1>
                    Create a sale<span>.</span>
                  </h1>
                  <p>Add items, confirm tax, and record payment.</p>
                </div>
                <button
                  className="btn light"
                  onClick={() => openTab("Sales invoices")}
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
                saleSupply={saleSupply}
                salePlace={salePlace}
                setSalePlace={setSalePlace}
                saleDiscount={saleDiscount}
                setSaleDiscount={setSaleDiscount}
                salePaid={salePaid}
                setSalePaid={setSalePaid}
                saleNotes={saleNotes}
                setSaleNotes={setSaleNotes}
                saleLines={saleLines}
                setSaleLines={setSaleLines}
                computed={computed}
                onAddLine={addLine}
                onAddProductManually={(productId: string) => {
                  const product = products.find((item) => item.id === productId);
                  if (product) addProductToSale(product);
                }}
                onScanBarcode={scanProductIntoSale}
                onSave={saveSale}
              />
            </>
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
                      {invoiceMatches.map((s) => (
                        <tr key={s.id}>
                          <td className="link-cell">{s.number}</td>
                          <td>{s.customerName}</td>
                          <td>{dateLabel(s.date)}</td>
                          <td className="strong">{fmt(s.total)}</td>
                          <td>{fmt(s.paid)}</td>
                          <td>{fmt(Math.max(0, s.total - s.paid))}</td>
                          <td>
                            <Status status={s.status} />
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                title="View invoice"
                                onClick={() => setViewSale(s)}
                              >
                                <Eye size={15} />
                              </button>
                              {s.paid < s.total && (
                                <button
                                  title="Record payment"
                                  onClick={() => recordPayment(s)}
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
                      ))}
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
              <div className="customer-grid">
                {customerMatches.map((c) => (
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
                    <h3>{c.name}</h3>
                    <p>{c.gstin || "Unregistered / GSTIN not provided"}</p>
                    <div className="customer-meta">
                      <span>
                        <Users size={14} />
                        {c.phone || "No phone"}
                      </span>
                      <span>
                        <FileText size={14} />
                        {sales.filter((s) => s.customerId === c.id).length}{" "}
                        invoices
                      </span>
                    </div>
                    <div className="customer-address">
                      {c.address || "No address provided"} · {c.state}
                    </div>
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
                ))}
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
                  value={String(products.reduce((a, p) => a + p.stock, 0))}
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
                  value={fmt(
                    products.reduce((a, p) => a + p.stock * p.cost, 0),
                  )}
                  sub="Estimated at cost"
                />
                <Metric
                  icon={<TrendingUp />}
                  tone="blue"
                  label="Retail value"
                  value={fmt(
                    products.reduce((a, p) => a + p.stock * p.price, 0),
                  )}
                  sub="Estimated at selling price"
                />
              </div>
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
                  <button
                    className="btn primary"
                    onClick={() => exportCSV("sales")}
                  >
                    <Download size={15} /> Export sales CSV
                  </button>
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
                  value={String(
                    sales.reduce(
                      (a, s) => a + s.lines.reduce((b, l) => b + l.qty, 0),
                      0,
                    ),
                  )}
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
                  {products.map((p) => {
                    const qty = sales.reduce(
                      (a, s) =>
                        a +
                        s.lines
                          .filter((l) => l.productId === p.id)
                          .reduce((b, l) => b + l.qty, 0),
                      0,
                    );
                    return (
                      <div className="top-product" key={p.id}>
                        <div className="product-symbol">
                          <Package size={15} />
                        </div>
                        <span>{p.name}</span>
                        <b>{qty} sold</b>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                      <textarea
                        rows={2}
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
                      <input
                        value={business.state}
                        onChange={(e) =>
                          setBusiness({ ...business, state: e.target.value })
                        }
                      />
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
                        Download products, customers, invoices and business
                        settings as a JSON file.
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
                        Remove all invoices, products and customers from this
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
            <Field label="Unit">
              <input
                value={productForm.unit || ""}
                onChange={(e) =>
                  setProductForm({ ...productForm, unit: e.target.value })
                }
              />
            </Field>
            <Field label="Cost price (₹)">
              <input
                type="number"
                min="0"
                value={productForm.cost ?? ""}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    cost:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Selling price (₹)">
              <input
                type="number"
                min="0"
                value={productForm.price ?? ""}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    price:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="GST rate (%)">
              <input
                type="number"
                min="0"
                step="any"
                value={productForm.gst ?? ""}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    gst:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
              <small className="field-hint">
                Default 18%. GST is included in the selling price and shown
                separately on the invoice.
              </small>
            </Field>
            <Field label="Opening stock">
              <input
                type="number"
                min="0"
                step="any"
                value={productForm.stock ?? ""}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    stock:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Low-stock threshold">
              <input
                type="number"
                min="0"
                step="any"
                value={productForm.minStock ?? ""}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    minStock:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>
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
              <input
                value={customerForm.state || ""}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, state: e.target.value })
                }
              />
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
                type="number"
                step="any"
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
                const n = Number(adjustQty);
                if (!Number.isFinite(n) || n === 0) {
                  notify("Enter a non-zero quantity.");
                  return;
                }
                if (showAdjust.stock + n < 0) {
                  notify("Stock cannot be negative.");
                  return;
                }
                setProducts((v) =>
                  v.map((p) =>
                    p.id === showAdjust.id ? { ...p, stock: p.stock + n } : p,
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
                onClick={() => recordPayment(viewSale)}
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
    </div>
  );
}

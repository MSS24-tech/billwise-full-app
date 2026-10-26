import { useEffect, useMemo, useRef, useState } from "react";
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

type Product = {
  id: string;
  name: string;
  sku: string;
  hsn: string;
  unit: string;
  cost: number;
  price: number;
  gst: number;
  stock: number;
  minStock: number;
};
type Customer = {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
};
type SaleLine = {
  productId: string;
  name: string;
  hsn: string;
  qty: number;
  rate: number;
  gst: number;
  cost: number;
};
type Sale = {
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
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  status: "Paid" | "Part-paid" | "Unpaid";
  notes: string;
};
type Tab =
  | "Overview"
  | "New sale"
  | "Sales invoices"
  | "Products"
  | "Customers"
  | "Inventory"
  | "Reports"
  | "Settings";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
const id = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (d: string) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const seedProducts: Product[] = [
  {
    id: "p1",
    name: "Cotton T-Shirt",
    sku: "APP-001",
    hsn: "610910",
    unit: "pcs",
    cost: 180,
    price: 399,
    gst: 5,
    stock: 85,
    minStock: 15,
  },
  {
    id: "p2",
    name: "Denim Jeans",
    sku: "APP-002",
    hsn: "620342",
    unit: "pcs",
    cost: 650,
    price: 1199,
    gst: 12,
    stock: 24,
    minStock: 8,
  },
  {
    id: "p3",
    name: "Canvas Tote Bag",
    sku: "ACC-001",
    hsn: "420292",
    unit: "pcs",
    cost: 95,
    price: 249,
    gst: 18,
    stock: 7,
    minStock: 10,
  },
  {
    id: "p4",
    name: "Water Bottle",
    sku: "HOM-001",
    hsn: "392410",
    unit: "pcs",
    cost: 110,
    price: 299,
    gst: 18,
    stock: 42,
    minStock: 10,
  },
  {
    id: "p5",
    name: "Notebook A5",
    sku: "STA-001",
    hsn: "482010",
    unit: "pcs",
    cost: 35,
    price: 89,
    gst: 12,
    stock: 4,
    minStock: 12,
  },
];
const seedCustomers: Customer[] = [
  {
    id: "c1",
    name: "Acme Retail Pvt. Ltd.",
    gstin: "29AAACA1234A1ZP",
    phone: "+91 98765 43210",
    email: "accounts@acme.example",
    address: "Indiranagar, Bengaluru",
    state: "Karnataka",
  },
  {
    id: "c2",
    name: "Priya Sharma",
    gstin: "",
    phone: "+91 99887 66554",
    email: "priya@example.com",
    address: "Jayanagar, Bengaluru",
    state: "Karnataka",
  },
  {
    id: "c3",
    name: "Northstar Stores",
    gstin: "27AABCN1234C1Z9",
    phone: "+91 91234 56789",
    email: "billing@northstar.example",
    address: "Pune, Maharashtra",
    state: "Maharashtra",
  },
];
const read = <T,>(key: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};
export default function App() {
  const [tab, setTab] = useState<Tab>("Overview"),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [toast, setToast] = useState("");
  const [products, setProducts] = useState<Product[]>(() =>
    read("bw-products", seedProducts),
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    read("bw-customers", seedCustomers),
  );
  const [sales, setSales] = useState<Sale[]>(() => read("bw-sales", []));
  const [business, setBusiness] = useState(() =>
    read("bw-business", {
      name: "My Small Business",
      gstin: "29ABCDE1234F1Z5",
      phone: "+91 98765 43210",
      email: "hello@mybusiness.example",
      address: "Bengaluru, Karnataka",
      state: "Karnataka",
      prefix: "INV-26-27-",
    }),
  );
  const [showProduct, setShowProduct] = useState(false),
    [showCustomer, setShowCustomer] = useState(false),
    [showAdjust, setShowAdjust] = useState<Product | null>(null),
    [showSale, setShowSale] = useState(false),
    [viewSale, setViewSale] = useState<Sale | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: "",
    sku: "",
    hsn: "",
    unit: "pcs",
    cost: 0,
    price: 0,
    gst: 18,
    stock: 0,
    minStock: 5,
  });
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    name: "",
    gstin: "",
    phone: "",
    email: "",
    address: "",
    state: "Karnataka",
  });
  const [adjustQty, setAdjustQty] = useState("1"),
    [adjustNote, setAdjustNote] = useState("Stock received");
  const [saleCustomer, setSaleCustomer] = useState(""),
    [saleDate, setSaleDate] = useState(today()),
    [saleDue, setSaleDue] = useState(today()),
    [saleSupply, setSaleSupply] = useState<"Intra-state" | "Inter-state">(
      "Intra-state",
    ),
    [salePlace, setSalePlace] = useState("Karnataka"),
    [saleDiscount, setSaleDiscount] = useState("0"),
    [salePaid, setSalePaid] = useState("0"),
    [saleNotes, setSaleNotes] = useState("Thank you for your business."),
    [saleLines, setSaleLines] = useState<{ productId: string; qty: number }[]>(
      [],
    );
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    localStorage.setItem("bw-products", JSON.stringify(products));
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
    (p.name + " " + p.sku + " " + p.hsn)
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
  const computed = useMemo(() => {
    const lines = saleLines
      .map((l) => {
        const p = products.find((p) => p.id === l.productId);
        return p
          ? {
              productId: p.id,
              name: p.name,
              hsn: p.hsn,
              qty: Math.max(1, l.qty),
              rate: p.price,
              gst: p.gst,
              cost: p.cost,
              amount: p.price * Math.max(1, l.qty),
            }
          : null;
      })
      .filter(Boolean) as (SaleLine & { amount: number })[];
    const subtotal = lines.reduce((a, l) => a + l.amount, 0);
    const discount = Math.min(100, Math.max(0, Number(saleDiscount) || 0));
    const discounted = subtotal * (1 - discount / 100);
    const tax = lines.reduce(
      (a, l) => a + (l.amount * (1 - discount / 100) * l.gst) / 100,
      0,
    );
    return {
      lines,
      subtotal,
      discount,
      discountAmount: (subtotal * discount) / 100,
      tax,
      total: discounted + tax,
    };
  }, [saleLines, products, saleDiscount]);
  const revenue = sales.reduce((a, s) => a + s.total, 0),
    received = sales.reduce((a, s) => a + s.paid, 0),
    outstanding = sales.reduce((a, s) => a + Math.max(0, s.total - s.paid), 0),
    lowStock = products.filter((p) => p.stock <= p.minStock);
  const startSale = () => {
    setSaleCustomer(customers[0]?.id || "");
    setSaleDate(today());
    setSaleDue(today());
    setSaleSupply("Intra-state");
    setSalePlace(customers[0]?.state || "Karnataka");
    setSaleDiscount("0");
    setSalePaid("0");
    setSaleNotes("Thank you for your business.");
    setSaleLines(
      products.length ? [{ productId: products[0].id, qty: 1 }] : [],
    );
    setTab("New sale");
    setShowSale(true);
  };
  const saveSale = () => {
    if (!saleCustomer || !computed.lines.length) {
      notify("Select a customer and add at least one item.");
      return;
    }
    for (const l of computed.lines) {
      const p = products.find((p) => p.id === l.productId);
      if (!p || l.qty > p.stock) {
        notify(`Not enough stock for ${l.name}. Available: ${p?.stock ?? 0}`);
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
      due: saleDue,
      customerId: c.id,
      customerName: c.name,
      customerGstin: c.gstin,
      place: salePlace,
      supply: saleSupply,
      lines: computed.lines,
      discount: computed.discount,
      subtotal: computed.subtotal,
      tax: computed.tax,
      total: computed.total,
      paid,
      status:
        paid >= computed.total ? "Paid" : paid > 0 ? "Part-paid" : "Unpaid",
      notes: saleNotes,
    };
    setSales((v) => [sale, ...v]);
    setProducts((v) =>
      v.map((p) => {
        const l = computed.lines.find((l) => l.productId === p.id);
        return l ? { ...p, stock: p.stock - l.qty } : p;
      }),
    );
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
    setProducts((v) =>
      v.map((p) => {
        const line = s.lines.find((l) => l.productId === p.id);
        return line ? { ...p, stock: p.stock + line.qty } : p;
      }),
    );
    setViewSale(null);
    notify("Invoice deleted and stock restored.");
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
    setProducts((v) => [
      {
        id: id(),
        name: productForm.name!.trim(),
        sku: productForm.sku!.trim(),
        hsn: productForm.hsn || "",
        unit: productForm.unit || "pcs",
        cost: Number(productForm.cost) || 0,
        price: Number(productForm.price) || 0,
        gst: Number(productForm.gst) || 0,
        stock: Number(productForm.stock) || 0,
        minStock: Number(productForm.minStock) || 0,
      },
      ...v,
    ]);
    setShowProduct(false);
    setProductForm({
      name: "",
      sku: "",
      hsn: "",
      unit: "pcs",
      cost: 0,
      price: 0,
      gst: 18,
      stock: 0,
      minStock: 5,
    });
    notify("Product added.");
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
        state: customerForm.state || "Karnataka",
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
      state: "Karnataka",
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
              "HSN/SAC",
              "Cost",
              "Selling price",
              "GST %",
              "Stock",
              "Low stock threshold",
            ],
            ...products.map((p) => [
              p.name,
              p.sku,
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
          { business, products, customers, sales, version: 1 },
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
        setProducts(d.products);
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
    setTab(t);
    setQuery("");
    setMobile(false);
    if (t !== "New sale") setShowSale(false);
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
                  text="Set prices, tax rates and reorder thresholds."
                  onClick={() => {
                    setProductForm({
                      name: "",
                      sku: "",
                      hsn: "",
                      unit: "pcs",
                      cost: 0,
                      price: 0,
                      gst: 18,
                      stock: 0,
                      minStock: 5,
                    });
                    setShowProduct(true);
                  }}
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
                saleDue={saleDue}
                setSaleDue={setSaleDue}
                saleSupply={saleSupply}
                setSaleSupply={setSaleSupply}
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
            <>
              <PageHead
                title="Products & services"
                subtitle="Manage your catalogue, pricing, tax rates and stock."
                action={
                  <button
                    className="btn primary"
                    onClick={() => {
                      setProductForm({
                        name: "",
                        sku: "",
                        hsn: "",
                        unit: "pcs",
                        cost: 0,
                        price: 0,
                        gst: 18,
                        stock: 0,
                        minStock: 5,
                      });
                      setShowProduct(true);
                    }}
                  >
                    <Plus size={16} /> Add product
                  </button>
                }
              />
              <div className="toolbar">
                <div className="searchbox">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, SKU or HSN..."
                  />
                </div>
                <button
                  className="btn light"
                  onClick={() => exportCSV("products")}
                >
                  <Download size={15} /> Export CSV
                </button>
              </div>
              <div className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>PRODUCT</th>
                        <th>SKU</th>
                        <th>HSN/SAC</th>
                        <th>COST</th>
                        <th>SELLING PRICE</th>
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
                              <b>{p.name}</b>
                            </div>
                          </td>
                          <td>{p.sku}</td>
                          <td>{p.hsn || "—"}</td>
                          <td>{fmt(p.cost)}</td>
                          <td className="strong">{fmt(p.price)}</td>
                          <td>{p.gst}%</td>
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
                                  setAdjustQty("1");
                                  setAdjustNote("Stock received");
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
                      onAction={() => setShowProduct(true)}
                    />
                  )}
                </div>
              </div>
            </>
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
                      setAdjustQty("1");
                      setAdjustNote("Stock received");
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
                                setAdjustQty("1");
                                setAdjustNote("Stock received");
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
                      <select
                        value={business.state}
                        onChange={(e) =>
                          setBusiness({ ...business, state: e.target.value })
                        }
                      >
                        {[
                          "Karnataka",
                          "Maharashtra",
                          "Tamil Nadu",
                          "Telangana",
                          "Kerala",
                          "Delhi",
                          "Other state",
                        ].map((s) => (
                          <option key={s}>{s}</option>
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
          subtitle="Create a catalogue item for your sales invoices."
          onClose={() => setShowProduct(false)}
        >
          <div className="form-grid two">
            <Field label="Product name *">
              <input
                autoFocus
                value={productForm.name || ""}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                placeholder="e.g. Cotton T-Shirt"
              />
            </Field>
            <Field label="SKU / item code *">
              <input
                value={productForm.sku || ""}
                onChange={(e) =>
                  setProductForm({ ...productForm, sku: e.target.value })
                }
                placeholder="e.g. APP-003"
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
              <select
                value={productForm.unit || "pcs"}
                onChange={(e) =>
                  setProductForm({ ...productForm, unit: e.target.value })
                }
              >
                {[
                  "pcs",
                  "kg",
                  "g",
                  "litre",
                  "box",
                  "pack",
                  "hour",
                  "service",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Cost price (₹)">
              <input
                type="number"
                min="0"
                value={productForm.cost ?? 0}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    cost: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Selling price (₹)">
              <input
                type="number"
                min="0"
                value={productForm.price ?? 0}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    price: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="GST rate">
              <select
                value={productForm.gst ?? 18}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    gst: Number(e.target.value),
                  })
                }
              >
                {[0, 5, 12, 18, 28].map((x) => (
                  <option value={x} key={x}>
                    {x}%
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Opening stock">
              <input
                type="number"
                min="0"
                value={productForm.stock ?? 0}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    stock: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Low-stock threshold">
              <input
                type="number"
                min="0"
                value={productForm.minStock ?? 5}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    minStock: Number(e.target.value),
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
              <select
                value={customerForm.state || "Karnataka"}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, state: e.target.value })
                }
              >
                {[
                  "Karnataka",
                  "Maharashtra",
                  "Tamil Nadu",
                  "Telangana",
                  "Kerala",
                  "Delhi",
                  "Other state",
                ].map((s) => (
                  <option key={s}>{s}</option>
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
            <Field label="Adjustment type">
              <select
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              >
                <option>Stock received</option>
                <option>Stock correction</option>
                <option>Damaged / lost</option>
                <option>Opening balance</option>
              </select>
            </Field>
            <Field label="Quantity to add / remove">
              <input
                type="number"
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
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Metric({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: any;
  tone: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="metric">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <small>{sub}</small>
      </div>
    </div>
  );
}
function Status({ status }: { status: string }) {
  return <span className={`status ${statusClassName(status)}`}>{status}</span>;
}
function statusClassName(s: string) {
  return s.toLowerCase().replace("-", "");
}
function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: any;
}) {
  return (
    <div className="page-title-row">
      <div>
        <div className="eyebrow">BUSINESS WORKSPACE</div>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function Quick({
  icon,
  title,
  text,
  onClick,
}: {
  icon: any;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button className="quick-card" onClick={onClick}>
      <div className="quick-icon">{icon}</div>
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
      <ArrowUpRight size={16} className="quick-arrow" />
    </button>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: any;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <b>{title}</b>
      <p>{text}</p>
      <button className="btn light" onClick={onAction}>
        <Plus size={14} />
        {action}
      </button>
    </div>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  printable = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: any;
  wide?: boolean;
  printable?: boolean;
}) {
  return (
    <div
      className={`modal-backdrop${printable ? " print-invoice" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? "wide" : ""}`}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function SaleForm(props: any) {
  const {
    products,
    customers,
    saleCustomer,
    setSaleCustomer,
    saleDate,
    setSaleDate,
    saleDue,
    setSaleDue,
    saleSupply,
    setSaleSupply,
    salePlace,
    setSalePlace,
    saleDiscount,
    setSaleDiscount,
    salePaid,
    setSalePaid,
    saleNotes,
    setSaleNotes,
    saleLines,
    setSaleLines,
    computed,
    onAddLine,
    onSave,
  } = props;
  const selected = customers.find((c: Customer) => c.id === saleCustomer);
  const setLine = (idx: number, key: string, val: any) =>
    setSaleLines((v: any[]) =>
      v.map((l, i) => (i === idx ? { ...l, [key]: val } : l)),
    );
  return (
    <div className="sale-layout">
      <div className="sale-main">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                <span className="num-badge">01</span> Customer & invoice
              </h2>
              <p>Who is this sale for?</p>
            </div>
          </div>
          <div className="form-grid two">
            <Field label="Customer *">
              <select
                value={saleCustomer}
                onChange={(e: any) => {
                  setSaleCustomer(e.target.value);
                  const c = customers.find(
                    (x: Customer) => x.id === e.target.value,
                  );
                  if (c) setSalePlace(c.state);
                }}
              >
                <option value="">Select customer</option>
                {customers.map((c: Customer) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Invoice date">
              <input
                type="date"
                value={saleDate}
                onChange={(e: any) => setSaleDate(e.target.value)}
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={saleDue}
                onChange={(e: any) => setSaleDue(e.target.value)}
              />
            </Field>
            <Field label="Customer GSTIN">
              <input
                value={selected?.gstin || ""}
                readOnly
                placeholder="Not provided"
              />
            </Field>
          </div>
          {selected && (
            <div className="selected-customer">
              <Users size={15} />
              <span>
                {selected.address || "No address"} · {selected.state}
              </span>
              <span>{selected.phone}</span>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                <span className="num-badge">02</span> Products & quantities
              </h2>
              <p>Choose products from your inventory.</p>
            </div>
            <button className="btn light tiny" onClick={onAddLine}>
              <Plus size={14} /> Add item
            </button>
          </div>
          <div className="sale-items">
            {saleLines.map((l: any, idx: number) => {
              const p = products.find((x: Product) => x.id === l.productId);
              return (
                <div className="sale-item" key={idx}>
                  <div className="sale-item-name">
                    <Field label="Product">
                      <select
                        value={l.productId}
                        onChange={(e: any) =>
                          setLine(idx, "productId", e.target.value)
                        }
                      >
                        {products
                          .filter(
                            (x: Product) => x.stock > 0 || x.id === l.productId,
                          )
                          .map((x: Product) => (
                            <option key={x.id} value={x.id}>
                              {x.name} · {x.stock} in stock
                            </option>
                          ))}
                      </select>
                    </Field>
                    <small>
                      {p?.sku} · HSN {p?.hsn || "—"} · GST {p?.gst}%
                    </small>
                  </div>
                  <Field label="Qty">
                    <input
                      type="number"
                      min="1"
                      max={p?.stock || 1}
                      value={l.qty}
                      onChange={(e: any) =>
                        setLine(idx, "qty", Math.max(1, Number(e.target.value)))
                      }
                    />
                  </Field>
                  <div className="sale-item-rate">
                    <span>Rate</span>
                    <b>{fmt(p?.price || 0)}</b>
                  </div>
                  <div className="sale-item-amount">
                    <span>Amount</span>
                    <b>{fmt((p?.price || 0) * l.qty)}</b>
                  </div>
                  <button
                    className="remove-line"
                    onClick={() =>
                      setSaleLines((v: any[]) => v.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
            {saleLines.length === 0 && (
              <div className="empty-lines">
                No items yet. Use “Add item” to choose a product.
              </div>
            )}
          </div>
          <div className="stock-hint">
            <Warehouse size={14} /> Stock is checked before saving and reduced
            automatically when the sale is completed.
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                <span className="num-badge">03</span> Tax & payment
              </h2>
              <p>Set the supply type and amount received.</p>
            </div>
          </div>
          <div className="form-grid two">
            <Field label="Supply type">
              <select
                value={saleSupply}
                onChange={(e: any) => setSaleSupply(e.target.value)}
              >
                <option>Intra-state</option>
                <option>Inter-state</option>
              </select>
            </Field>
            <Field label="Place of supply">
              <select
                value={salePlace}
                onChange={(e: any) => setSalePlace(e.target.value)}
              >
                {[
                  "Karnataka",
                  "Maharashtra",
                  "Tamil Nadu",
                  "Telangana",
                  "Kerala",
                  "Delhi",
                  "Other state",
                ].map((s: string) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Discount (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={saleDiscount}
                onChange={(e: any) => setSaleDiscount(e.target.value)}
              />
            </Field>
            <Field label="Payment received (₹)">
              <input
                type="number"
                min="0"
                value={salePaid}
                onChange={(e: any) => setSalePaid(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Invoice notes / terms">
            <textarea
              rows={2}
              value={saleNotes}
              onChange={(e: any) => setSaleNotes(e.target.value)}
            />
          </Field>
        </section>
      </div>
      <aside className="sale-summary">
        <div className="summary-sticky">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Sale summary</h2>
                <p>Calculated live</p>
              </div>
              <span className="live-chip">LIVE</span>
            </div>
            <div className="summary-customer">
              <div className="customer-avatar">
                {selected?.name?.slice(0, 1) || "?"}
              </div>
              <div>
                <b>{selected?.name || "Select a customer"}</b>
                <small>
                  {selected?.gstin || "Customer GSTIN not provided"}
                </small>
              </div>
            </div>
            <div className="summary-lines">
              <div>
                <span>Subtotal</span>
                <b>{fmt(computed.subtotal)}</b>
              </div>
              {computed.discount > 0 && (
                <div>
                  <span>Discount ({computed.discount}%)</span>
                  <b>−{fmt(computed.discountAmount)}</b>
                </div>
              )}
              <div>
                <span>{saleSupply === "Intra-state" ? "CGST" : "IGST"}</span>
                <b>
                  {fmt(
                    saleSupply === "Intra-state"
                      ? computed.tax / 2
                      : computed.tax,
                  )}
                </b>
              </div>
              {saleSupply === "Intra-state" && (
                <div>
                  <span>SGST</span>
                  <b>{fmt(computed.tax / 2)}</b>
                </div>
              )}
              <div className="summary-total">
                <span>Total payable</span>
                <b>{fmt(computed.total)}</b>
              </div>
              <div>
                <span>Payment received</span>
                <b>
                  {fmt(
                    Math.min(
                      computed.total,
                      Math.max(0, Number(salePaid) || 0),
                    ),
                  )}
                </b>
              </div>
              <div className="balance">
                <span>Balance due</span>
                <b>
                  {fmt(
                    Math.max(
                      0,
                      computed.total - Math.max(0, Number(salePaid) || 0),
                    ),
                  )}
                </b>
              </div>
            </div>
            <button className="btn primary full" onClick={onSave}>
              <CheckCircle2 size={16} /> Complete sale & create invoice
            </button>
            <p className="summary-footnote">
              <CheckCircle2 size={13} /> Stock will update after successful
              save.
            </p>
          </div>
          <div className="gst-note">
            <AlertTriangle size={15} />
            <p>
              Tax shown is a basic estimate using each product's configured
              rate. Confirm the correct GST treatment before issuing.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
function InvoiceView({
  sale,
  business,
  onPrint,
}: {
  sale: Sale;
  business: any;
  onPrint: () => void;
}) {
  const intra = sale.supply === "Intra-state";
  return (
    <div className="invoice-view">
      <div className="invoice-head">
        <div>
          <div className="invoice-brand-icon">
            <ReceiptText />
          </div>
          <h3>{business.name}</h3>
          <p>{business.address}</p>
          <p>GSTIN: {business.gstin}</p>
          <p>
            {business.phone} · {business.email}
          </p>
        </div>
        <div className="invoice-number">
          <span>TAX INVOICE</span>
          <b>{sale.number}</b>
          <small>{dateLabel(sale.date)}</small>
        </div>
      </div>
      <hr />
      <div className="invoice-parties">
        <div>
          <small>BILL TO</small>
          <b>{sale.customerName}</b>
          <p>GSTIN: {sale.customerGstin || "Not provided"}</p>
          <p>Place of supply: {sale.place}</p>
        </div>
        <div>
          <small>PAYMENT STATUS</small>
          <Status status={sale.status} />
          <p>Due date: {dateLabel(sale.due)}</p>
        </div>
      </div>
      <table className="invoice-lines">
        <thead>
          <tr>
            <th>ITEM</th>
            <th>HSN/SAC</th>
            <th>QTY</th>
            <th>RATE</th>
            <th>GST</th>
            <th>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.name}</td>
              <td>{l.hsn || "—"}</td>
              <td>{l.qty}</td>
              <td>{fmt(l.rate)}</td>
              <td>{l.gst}%</td>
              <td>{fmt(l.qty * l.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="invoice-bottom">
        <div className="invoice-note">
          <b>Notes</b>
          <p>{sale.notes || "—"}</p>
          <small>Thank you for your business.</small>
        </div>
        <div className="invoice-totals">
          <div>
            <span>Subtotal</span>
            <b>{fmt(sale.subtotal)}</b>
          </div>
          {sale.discount > 0 && (
            <div>
              <span>Discount ({sale.discount}%)</span>
              <b>−{fmt((sale.subtotal * sale.discount) / 100)}</b>
            </div>
          )}
          <div>
            <span>{intra ? "CGST" : "IGST"}</span>
            <b>{fmt(intra ? sale.tax / 2 : sale.tax)}</b>
          </div>
          {intra && (
            <div>
              <span>SGST</span>
              <b>{fmt(sale.tax / 2)}</b>
            </div>
          )}
          <div className="invoice-grand">
            <span>Total</span>
            <b>{fmt(sale.total)}</b>
          </div>
          <div>
            <span>Paid</span>
            <b>{fmt(sale.paid)}</b>
          </div>
          <div>
            <span>Balance due</span>
            <b>{fmt(Math.max(0, sale.total - sale.paid))}</b>
          </div>
        </div>
      </div>
      <div className="invoice-sign">
        <span>Computer-generated invoice preview</span>
        <div>
          <i />
          <b>Authorised signatory</b>
        </div>
      </div>
    </div>
  );
}

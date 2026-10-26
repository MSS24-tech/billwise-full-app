import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  MessageCircle,
  Package,
  ReceiptText,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { fmt } from "../domain";
import type { Customer, Product, Sale, Tab } from "../domain";

export type ChatResult = {
  id: string;
  title: string;
  detail: string;
  kind: "product" | "customer" | "sale";
  product?: Product;
  customer?: Customer;
  sale?: Sale;
};

type ChatAction = { label: string; tab: Tab };

type Message = {
  role: "assistant" | "user";
  text: string;
  action?: ChatAction;
  results?: ChatResult[];
};

type ChatbotProps = {
  revenue: number;
  outstanding: number;
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  onNavigate: (tab: Tab) => void;
  onOpenResult: (result: ChatResult) => void;
};

const suggestions = [
  "Which products sold best?",
  "Who owes me money?",
  "Show low-stock products",
];
const ignoredSearchTerms = new Set([
  "a",
  "an",
  "and",
  "are",
  "all",
  "any",
  "best",
  "better",
  "by",
  "can",
  "cost",
  "customer",
  "customers",
  "did",
  "do",
  "does",
  "find",
  "for",
  "give",
  "has",
  "have",
  "highest",
  "how",
  "i",
  "in",
  "invoice",
  "invoices",
  "is",
  "item",
  "items",
  "last",
  "latest",
  "list",
  "lowest",
  "me",
  "much",
  "my",
  "owe",
  "owed",
  "owes",
  "paid",
  "payment",
  "of",
  "outstanding",
  "please",
  "price",
  "product",
  "products",
  "sell",
  "sold",
  "show",
  "sku",
  "stock",
  "tell",
  "the",
  "top",
  "total",
  "unit",
  "units",
  "what",
  "where",
  "which",
  "who",
  "with",
  "due",
  "unpaid",
]);

const moneyOwedForCustomer = (sales: Sale[], customerId: string) =>
  sales.reduce(
    (amount, sale) =>
      amount +
      (sale.customerId === customerId
        ? Math.max(0, sale.total - sale.paid)
        : 0),
    0,
  );

export function Chatbot({
  revenue,
  outstanding,
  sales,
  products,
  customers,
  onNavigate,
  onOpenResult,
}: ChatbotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I’m your Billwise copilot. Ask questions about your actual sales, invoices, customers, or stock. Your data stays in this browser.",
    },
  ]);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open, pendingAction]);

  const getReply = (question: string): Omit<Message, "role"> => {
    const text = question.toLowerCase().trim();
    const searchTerms = text
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((term) => term.length > 1 && !ignoredSearchTerms.has(term));
    const matchesTerms = (value: string) =>
      searchTerms.length > 0 &&
      searchTerms.every((term) => value.toLowerCase().includes(term));
    const matchingProducts = products.filter((product) =>
      matchesTerms(
        `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.hsn}`,
      ),
    );
    const matchingCustomers = customers.filter((customer) =>
      matchesTerms(`${customer.name} ${customer.phone} ${customer.gstin}`),
    );
    const matchingSales = sales.filter((sale) =>
      matchesTerms(
        `${sale.number} ${sale.customerName} ${sale.status} ${sale.notes}`,
      ),
    );

    if (/(top|best|popular|fastest).*(sell|product|item)|(sell|product|item).*(top|best|popular|fast)/.test(text)) {
      const quantities = new Map<string, number>();
      for (const sale of sales) {
        for (const line of sale.lines) {
          quantities.set(
            line.productId,
            (quantities.get(line.productId) ?? 0) + line.qty,
          );
        }
      }
      const bestSellers = [...quantities.entries()]
        .map(([productId, quantity]) => ({
          product: products.find((product) => product.id === productId),
          quantity,
        }))
        .filter(
          (entry): entry is { product: Product; quantity: number } =>
            Boolean(entry.product),
        )
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      return {
        text: bestSellers.length
          ? "Your best sellers by units sold:"
          : "There are no recorded product sales yet.",
        results: bestSellers.map(({ product, quantity }) => ({
          id: product.id,
          title: product.name,
          detail: `${quantity} sold · ${product.stock} in stock`,
          kind: "product",
          product,
        })),
        action: { label: "View all products", tab: "Products" },
      };
    }

    if (/(who|which|customer|client).*(owe|unpaid|outstanding|due)|(owe|unpaid|outstanding|due).*(who|customer|client)/.test(text)) {
      const debtors = customers
        .map((customer) => ({
          customer,
          amount: moneyOwedForCustomer(sales, customer.id),
        }))
        .filter(({ amount }) => amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      return {
        text: debtors.length
          ? `There is ${fmt(outstanding)} outstanding in total. Customers with the largest balances:`
          : "No customer balances are outstanding.",
        results: debtors.map(({ customer, amount }) => ({
          id: customer.id,
          title: customer.name,
          detail: `${fmt(amount)} outstanding`,
          kind: "customer",
          customer,
        })),
        action: { label: "Review invoices", tab: "Sales invoices" },
      };
    }

    if (/(low|running out|reorder|short).*(stock|product|item)|(stock|product|item).*(low|running out|reorder|short)/.test(text)) {
      const lowStock = products
        .filter((product) => product.stock <= product.minStock)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);
      return {
        text: lowStock.length
          ? `${lowStock.length} products need attention (showing up to five):`
          : "No products are currently below their low-stock threshold.",
        results: lowStock.map((product) => ({
          id: product.id,
          title: product.name,
          detail: `${product.stock} ${product.unit} in stock · minimum ${product.minStock}`,
          kind: "product",
          product,
        })),
        action: { label: "Open inventory", tab: "Inventory" },
      };
    }

    if (/(create|new|make|start).*(sale|invoice|bill)|(sale|invoice|bill).*(create|new|make|start)/.test(text)) {
      return {
        text: "I can open a new sale form for you. You can review everything before saving the invoice.",
        action: { label: "Start a sale", tab: "New sale" },
      };
    }

    if (/(round|rounding|tax|gst)/.test(text)) {
      return {
        text: "Invoice totals include GST. The round-off adjusts the amount to the nearest rupee: below 50 paise rounds down, and 50 paise or more rounds up.",
      };
    }

    if (/(outstanding|unpaid|due|receivable|balance)/.test(text)) {
      const unpaidSales = sales.filter((sale) => sale.total > sale.paid);
      const openInvoices = unpaidSales
        .sort(
          (a, b) =>
            b.total - b.paid - (a.total - a.paid),
        )
        .slice(0, 5);
      return {
        text: `${fmt(outstanding)} is outstanding across ${unpaidSales.length} open invoice${unpaidSales.length === 1 ? "" : "s"}. Here are the largest balances:`,
        results: openInvoices.map((sale) => ({
          id: sale.id,
          title: `${sale.number} · ${sale.customerName}`,
          detail: `${fmt(Math.max(0, sale.total - sale.paid))} due`,
          kind: "sale",
          sale,
        })),
        action: { label: "Review all invoices", tab: "Sales invoices" },
      };
    }

    if (/(report|export|backup)/.test(text)) {
      return {
        text: "Open Reports to review business summaries. To save or restore your workspace data, use Settings and the backup options.",
        action: { label: "Open reports", tab: "Reports" },
      };
    }

    if (
      matchingCustomers.length &&
      /(owe|unpaid|outstanding|due|balance)/.test(text)
    ) {
      const debtors = matchingCustomers
        .map((customer) => ({
          customer,
          amount: moneyOwedForCustomer(sales, customer.id),
        }))
        .filter(({ amount }) => amount > 0);
      return {
        text: debtors.length
          ? "Outstanding balance for the matching customer:"
          : "The matching customer has no outstanding balance.",
        results: debtors.map(({ customer, amount }) => ({
          id: customer.id,
          title: customer.name,
          detail: `${fmt(amount)} outstanding`,
          kind: "customer",
          customer,
        })),
      };
    }

    if (/(sales?|revenue|income|total)/.test(text)) {
      const recentSales = [...sales]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
      return {
        text: `Recorded sales total ${fmt(revenue)} across ${sales.length} invoices. Here are your most recent invoices:`,
        results: recentSales.map((sale) => ({
          id: sale.id,
          title: `${sale.number} · ${sale.customerName}`,
          detail: `${fmt(sale.total)} · ${sale.date}`,
          kind: "sale",
          sale,
        })),
        action: { label: "Open reports", tab: "Reports" },
      };
    }

    if (matchingSales.length) {
      return {
        text: `Found ${matchingSales.length} matching invoice${matchingSales.length === 1 ? "" : "s"}:`,
        results: matchingSales.slice(0, 5).map((sale) => ({
          id: sale.id,
          title: `${sale.number} · ${sale.customerName}`,
          detail: `${fmt(sale.total)} · ${sale.status}`,
          kind: "sale",
          sale,
        })),
      };
    }

    if (matchingProducts.length) {
      return {
        text: `Found ${matchingProducts.length} matching product${matchingProducts.length === 1 ? "" : "s"}:`,
        results: matchingProducts.slice(0, 5).map((product) => ({
          id: product.id,
          title: product.name,
          detail: `${fmt(product.price)} incl. GST · ${product.stock} ${product.unit} in stock`,
          kind: "product",
          product,
        })),
      };
    }

    if (matchingCustomers.length) {
      return {
        text: `Found ${matchingCustomers.length} matching customer${matchingCustomers.length === 1 ? "" : "s"}:`,
        results: matchingCustomers.slice(0, 5).map((customer) => ({
          id: customer.id,
          title: customer.name,
          detail: `${fmt(moneyOwedForCustomer(sales, customer.id))} outstanding`,
          kind: "customer",
          customer,
        })),
      };
    }

    if (/(invoice|bill)/.test(text)) {
      return {
        text: `You have ${sales.length} invoice${sales.length === 1 ? "" : "s"} recorded. Ask for a customer or invoice number to find a specific one.`,
        action: { label: "Open invoices", tab: "Sales invoices" },
      };
    }
    if (/(customer|client)/.test(text)) {
      return {
        text: `You have ${customers.length} customers saved. Ask for a name to find a specific customer.`,
        action: { label: "View customers", tab: "Customers" },
      };
    }
    if (/(product|item)/.test(text)) {
      return {
        text: `You have ${products.length} products in your catalog. Ask for a product name to look up its price and stock.`,
        action: { label: "View products", tab: "Products" },
      };
    }
    if (/(hello|hi|help|hey)/.test(text)) {
      return {
        text: "Ask me which products sell best, who owes you money, or to find a product, customer, or invoice by name.",
      };
    }
    return {
      text: "I can answer questions about your best sellers, outstanding balances, low stock, sales, customers, and products. Try a name, SKU, or invoice number to find a record.",
    };
  };

  const sendMessage = (value: string) => {
    const question = value.trim();
    if (!question) return;
    setPendingAction(null);
    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "assistant", ...getReply(question) },
    ]);
    setInput("");
  };

  return (
    <div className="chatbot-widget">
      {open && (
        <section className="chatbot-panel" aria-label="Billwise help chat">
          <header className="chatbot-header">
            <div className="chatbot-avatar">
              <Bot size={19} />
            </div>
            <div>
              <b>Billwise copilot</b>
              <small>
                <i /> Private · On this device
              </small>
            </div>
            <button
              className="chatbot-close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>
          <div
            className="chatbot-messages"
            ref={messageListRef}
            role="log"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={index}>
                <p>{message.text}</p>
                {message.results?.map((result) => {
                  const Icon =
                    result.kind === "product"
                      ? Package
                      : result.kind === "customer"
                        ? Users
                        : ReceiptText;
                  return (
                    <button
                      className="chat-result"
                      key={`${result.kind}-${result.id}`}
                      onClick={() => onOpenResult(result)}
                    >
                      <Icon size={15} />
                      <span>
                        <b>{result.title}</b>
                        <small>{result.detail}</small>
                      </span>
                      <ArrowUpRight size={13} />
                    </button>
                  );
                })}
                {message.action && (
                  <div className="chat-action-group">
                    {pendingAction === message.action ? (
                      <div className="chat-confirm">
                        <span>Open {message.action.tab}?</span>
                        <button
                          onClick={() => {
                            onNavigate(message.action!.tab);
                            setPendingAction(null);
                            setOpen(false);
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          className="chat-cancel"
                          onClick={() => setPendingAction(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="chat-action"
                        onClick={() => setPendingAction(message.action!)}
                      >
                        {message.action.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 1 && (
              <div className="chat-suggestions">
                <span>
                  <Sparkles size={12} /> Try asking
                </span>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="chatbot-form"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              aria-label="Ask Billwise copilot"
              placeholder="Ask about your business..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim()}
            >
              <Send size={16} />
            </button>
          </form>
          <p className="chatbot-privacy">Offline help · Your data stays here</p>
        </section>
      )}
      <button
        className={`chatbot-launcher${open ? " active" : ""}`}
        aria-label={open ? "Close help chat" : "Open help chat"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={21} /> : <MessageCircle size={21} />}
        {!open && <span>Copilot</span>}
      </button>
    </div>
  );
}

import { useState } from "react";
import { BellRing, Clipboard, Plus, Save, Undo2, Wallet } from "lucide-react";
import { dateLabel, fmt, today } from "../domain";
import type {
  Expense,
  Product,
  PurchaseEntry,
  Sale,
  SalePayment,
  SalesReturn,
  SupplierPayment,
} from "../domain";
import {
  createExpense,
  createSalesReturn,
  createSupplierPayment,
  getSaleBalance,
} from "../business/operations";
import { Field, PageHead } from "./Ui";

type ReturnProps = {
  sales: Sale[];
  returns: SalesReturn[];
  products: Product[];
  onError: (message: string) => void;
  onSave: (entry: SalesReturn, products: Product[]) => void;
};

export function SalesReturnsPage({
  sales,
  returns,
  products,
  onError,
  onSave,
}: ReturnProps) {
  const [saleId, setSaleId] = useState("");
  const [date, setDate] = useState(today());
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [refund, setRefund] = useState("");
  const [notes, setNotes] = useState("");
  const sale = sales.find((item) => item.id === saleId);
  const groupedSaleLines = sale
    ? sale.lines
        .filter(
          (line, index, lines) =>
            lines.findIndex((candidate) => candidate.productId === line.productId) ===
            index,
        )
        .map((line) => ({
          ...line,
          qty: sale.lines
            .filter((candidate) => candidate.productId === line.productId)
            .reduce((sum, candidate) => sum + candidate.qty, 0),
        }))
    : [];
  const returned = new Map<string, number>();
  returns
    .filter((entry) => entry.saleId === saleId)
    .flatMap((entry) => entry.lines)
    .forEach((line) =>
      returned.set(line.productId, (returned.get(line.productId) ?? 0) + line.qty),
    );
  const selectableSales = sales.filter((item) =>
    item.lines.some((line) => {
      const sold = item.lines
        .filter((candidate) => candidate.productId === line.productId)
        .reduce((sum, candidate) => sum + candidate.qty, 0);
      return (
        sold >
        returns
          .filter((entry) => entry.saleId === item.id)
          .flatMap((entry) => entry.lines)
          .filter((candidate) => candidate.productId === line.productId)
          .reduce((sum, candidate) => sum + candidate.qty, 0)
      );
    }),
  );
  const availableRefund = Math.max(
    0,
    (sale?.paid ?? 0) -
      returns
        .filter((entry) => entry.saleId === saleId)
        .reduce((sum, entry) => sum + entry.refundAmount, 0),
  );
  const submit = () => {
    const result = createSalesReturn({
      sale,
      returns,
      products,
      date,
      quantities: Object.fromEntries(
        Object.entries(quantities).map(([id, value]) => [id, Number(value) || 0]),
      ),
      refundAmount: Number(refund) || 0,
      notes,
    });
    if (!result.ok) {
      onError(result.message);
      return;
    }
    onSave(result.entry, result.products);
    setQuantities({});
    setRefund("");
    setNotes("");
  };
  return (
    <>
      <PageHead
        title="Sales returns"
        subtitle="Record returned items against an invoice, restock them, and track customer refunds."
      />
      <section className="panel operations-form">
        <div className="form-grid two">
          <Field label="Invoice">
            <select
              value={saleId}
              onChange={(event) => {
                setSaleId(event.target.value);
                setQuantities({});
                setRefund("");
              }}
            >
              <option value="">Select an invoice</option>
              {selectableSales.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.number} · {item.customerName} · {fmt(item.total)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Return date">
            <input value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>
        {sale && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>ITEM</th><th>SOLD</th><th>RETURNED</th><th>RETURN QTY</th></tr>
                </thead>
                <tbody>
                  {groupedSaleLines.map((line) => {
                    const max = line.qty;
                    const remaining = Math.max(
                      0,
                      max - (returned.get(line.productId) ?? 0),
                    );
                    return (
                      <tr key={line.productId}>
                        <td>{line.name}</td>
                        <td>{max}</td>
                        <td>{returned.get(line.productId) ?? 0}</td>
                        <td>
                          <input
                            className="operation-qty"
                            aria-label={`Return quantity for ${line.name}`}
                            inputMode="decimal"
                            max={remaining}
                            value={quantities[line.productId] ?? ""}
                            placeholder="0"
                            onChange={(event) =>
                              setQuantities((current) => ({
                                ...current,
                                [line.productId]: event.target.value,
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="form-grid two operations-payment">
              <Field label={`Refund amount (up to ${fmt(availableRefund)} paid)`}>
                <input
                  value={refund}
                  onChange={(event) => setRefund(event.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Notes">
                <input value={notes} onChange={(event) => setNotes(event.target.value)} />
              </Field>
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={submit}>
                <Undo2 size={15} /> Record return & restock
              </button>
            </div>
          </>
        )}
      </section>
      <section className="panel operations-history">
        <h2>Return history</h2>
        {returns.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>RETURN</th><th>DATE</th><th>INVOICE</th><th>CUSTOMER</th><th>REFUND</th></tr></thead>
            <tbody>{returns.map((item) => <tr key={item.id}>
              <td className="strong">{item.number}</td><td>{dateLabel(item.date)}</td>
              <td>{item.saleNumber}</td><td>{item.customerName}</td><td>{fmt(item.refundAmount)}</td>
            </tr>)}</tbody>
          </table></div>
        ) : <p className="operations-empty">Recorded returns will appear here.</p>}
      </section>
    </>
  );
}

type CashProps = {
  expenses: Expense[];
  sales: Sale[];
  salePayments: SalePayment[];
  returns: SalesReturn[];
  supplierPayments: SupplierPayment[];
  purchases: PurchaseEntry[];
  onError: (message: string) => void;
  onSave: (expense: Expense) => void;
};

export function ExpensesCashbookPage({
  expenses,
  sales,
  salePayments,
  returns,
  supplierPayments,
  purchases,
  onError,
  onSave,
}: CashProps) {
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const save = () => {
    const result = createExpense({
      expenses,
      date,
      category,
      description,
      amount: Number(amount),
      paymentMethod,
    });
    if (!result.ok) {
      onError(result.message);
      return;
    }
    onSave(result.expense);
    setCategory("");
    setDescription("");
    setAmount("");
  };
  const payments = sales.flatMap((sale) => {
    const events = salePayments.filter((payment) => payment.saleId === sale.id);
    const recorded = events.map((payment) => ({
        id: payment.id,
        date: payment.date,
        label: `Payment · ${sale.number} · ${sale.customerName}`,
        incoming: payment.amount,
        outgoing: 0,
      }));
    const legacyRemainder = Math.max(
      0,
      sale.paid - events.reduce((sum, payment) => sum + payment.amount, 0),
    );
    return legacyRemainder > 0
      ? [{
          id: `legacy-${sale.id}`,
          date: sale.date,
          label: `Payment · ${sale.number} · ${sale.customerName}`,
          incoming: legacyRemainder,
          outgoing: 0,
        }, ...recorded]
      : recorded;
  });
  const entries = [
    ...payments,
    ...expenses.map((item) => ({
      id: item.id,
      date: item.date,
      label: `${item.category} · ${item.description}`,
      incoming: 0,
      outgoing: item.amount,
    })),
    ...returns.map((item) => ({
      id: item.id,
      date: item.date,
      label: `Refund · ${item.saleNumber}`,
      incoming: 0,
      outgoing: item.refundAmount,
    })),
    ...supplierPayments.map((item) => ({
      id: item.id,
      date: item.date,
      label: `Supplier payment · ${item.supplier} · ${item.purchaseNumber}`,
      incoming: 0,
      outgoing: item.amount,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const totalIn = entries.reduce((sum, item) => sum + item.incoming, 0);
  const totalOut = entries.reduce((sum, item) => sum + item.outgoing, 0);
  const grossProfit = sales.reduce(
    (sum, sale) =>
      sum +
      sale.lines.reduce(
        (lineTotal, line) =>
          lineTotal +
          ((line.rate / (1 + line.gst / 100) - line.cost) *
            line.qty *
            (1 - sale.discount / 100)),
        0,
      ),
    0,
  );
  const returnedProfit = returns.reduce((sum, entry) => {
    const sale = sales.find((item) => item.id === entry.saleId);
    if (!sale) return sum;
    return (
      sum +
      entry.lines.reduce((lineSum, line) => {
        const saleLine = sale.lines.find((item) => item.productId === line.productId);
        if (!saleLine) return lineSum;
        return (
          lineSum +
          (saleLine.rate / (1 + saleLine.gst / 100) - saleLine.cost) *
            line.qty *
            (1 - sale.discount / 100)
        );
      }, 0)
    );
  }, 0);
  const profitAfterExpenses =
    grossProfit -
    returnedProfit -
    expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return (
    <>
      <PageHead title="Expenses & cashbook" subtitle="Record expenses and review recorded incoming and outgoing cash movements." />
      <div className="metric-grid">
        <div className="metric"><div className="metric-icon green"><Wallet /></div><div><span>Money in</span><b>{fmt(totalIn)}</b><small>Recorded customer payments</small></div></div>
        <div className="metric"><div className="metric-icon red"><Wallet /></div><div><span>Money out</span><b>{fmt(totalOut)}</b><small>Expenses, refunds and supplier payments</small></div></div>
        <div className="metric"><div className="metric-icon purple"><Wallet /></div><div><span>Net movement</span><b>{fmt(totalIn - totalOut)}</b><small>Based on recorded cashbook entries</small></div></div>
        <div className="metric"><div className="metric-icon orange"><Wallet /></div><div><span>Profit after expenses</span><b>{fmt(profitAfterExpenses)}</b><small>Estimated gross margin less returns and expenses</small></div></div>
      </div>
      <section className="panel operations-form">
        <h2>Record an expense</h2>
        <div className="form-grid two">
          <Field label="Date"><input value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          <Field label="Category"><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Rent, utilities, travel..." /></Field>
          <Field label="Description"><input value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
          <Field label="Amount"><input value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Payment method"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash</option><option>Bank transfer</option><option>UPI</option><option>Card</option><option>Other</option></select></Field>
        </div>
        <div className="modal-actions"><button className="btn primary" onClick={save}><Plus size={15} /> Add expense</button></div>
      </section>
      <section className="panel operations-history"><h2>Cashbook</h2>
        {entries.length ? <div className="table-wrap"><table>
          <thead><tr><th>DATE</th><th>DESCRIPTION</th><th>MONEY IN</th><th>MONEY OUT</th></tr></thead>
          <tbody>{entries.map((item) => <tr key={item.id}><td>{dateLabel(item.date)}</td><td>{item.label}</td><td>{item.incoming ? fmt(item.incoming) : "—"}</td><td>{item.outgoing ? fmt(item.outgoing) : "—"}</td></tr>)}</tbody>
        </table></div> : <p className="operations-empty">Record payments or expenses to build your cashbook.</p>}
      </section>
      <p className="operations-footnote">Cashbook includes {purchases.length} purchase records for reference; only supplier payments are treated as cash outflow.</p>
    </>
  );
}

export function SupplierPaymentsPage({
  purchases,
  payments,
  onError,
  onSave,
}: {
  purchases: PurchaseEntry[];
  payments: SupplierPayment[];
  onError: (message: string) => void;
  onSave: (payment: SupplierPayment) => void;
}) {
  const [purchaseId, setPurchaseId] = useState("");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const purchase = purchases.find((item) => item.id === purchaseId);
  const paid = payments.filter((item) => item.purchaseId === purchaseId).reduce((sum, item) => sum + item.amount, 0);
  const balance = Math.max(0, (purchase?.total ?? 0) - paid);
  const submit = () => {
    const result = createSupplierPayment({ purchase, payments, date, amount: Number(amount), notes });
    if (!result.ok) {
      onError(result.message);
      return;
    }
    onSave(result.payment);
    setAmount("");
    setNotes("");
  };
  return (
    <>
      <PageHead title="Supplier payments" subtitle="Allocate payments to purchase entries and track balances owed." />
      <section className="panel operations-form">
        <div className="form-grid two">
          <Field label="Purchase entry"><select value={purchaseId} onChange={(event) => setPurchaseId(event.target.value)}><option value="">Select a purchase</option>
            {purchases.map((item) => {
              const outstanding = item.total - payments.filter((payment) => payment.purchaseId === item.id).reduce((sum, payment) => sum + payment.amount, 0);
              return outstanding > 0 ? <option key={item.id} value={item.id}>{item.number} · {item.supplier} · balance {fmt(outstanding)}</option> : null;
            })}
          </select></Field>
          <Field label="Payment date"><input value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          <Field label={`Amount${purchase ? ` · balance ${fmt(balance)}` : ""}`}><input value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Notes"><input value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        </div>
        <div className="modal-actions"><button className="btn primary" onClick={submit}><Save size={15} /> Record supplier payment</button></div>
      </section>
      <section className="panel operations-history"><h2>Outstanding purchases</h2>
        <div className="table-wrap"><table><thead><tr><th>ENTRY</th><th>SUPPLIER</th><th>TOTAL</th><th>PAID</th><th>BALANCE</th></tr></thead>
          <tbody>{purchases.map((item) => {
            const paidAmount = payments.filter((payment) => payment.purchaseId === item.id).reduce((sum, payment) => sum + payment.amount, 0);
            return <tr key={item.id}><td>{item.number}</td><td>{item.supplier}</td><td>{fmt(item.total)}</td><td>{fmt(paidAmount)}</td><td className="strong">{fmt(Math.max(0, item.total - paidAmount))}</td></tr>;
          })}</tbody></table></div>
      </section>
    </>
  );
}

export function PaymentRemindersPage({
  sales,
  returns,
  onStatusChange,
  onError,
}: {
  sales: Sale[];
  returns: SalesReturn[];
  onStatusChange: (sale: Sale, status: NonNullable<Sale["followUpStatus"]>) => void;
  onError: (message: string) => void;
}) {
  const openSales = sales.filter(
    (sale) => getSaleBalance(sale, returns).balance > 0,
  );
  const copyMessage = async (sale: Sale) => {
    const balance = fmt(Math.max(0, sale.total - sale.paid));
    const message = `Hello ${sale.customerName}, invoice ${sale.number} has an outstanding balance of ${balance}. Please let us know when we can expect payment. Thank you.`;
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      onError("Could not copy the reminder. Check clipboard permissions and try again.");
    }
  };
  return (
    <>
      <PageHead title="Payment reminders" subtitle="Review outstanding invoices, track follow-ups, and copy a ready-to-send reminder." />
      <section className="panel operations-history">
        {openSales.length ? <div className="table-wrap"><table>
          <thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>DUE DATE</th><th>BALANCE</th><th>FOLLOW-UP</th><th>ACTION</th></tr></thead>
          <tbody>{openSales.map((sale) => {
            const balance = getSaleBalance(sale, returns).balance;
            const overdue = Boolean(sale.due && sale.due < today());
            const status = sale.followUpStatus ?? "Not contacted";
            return <tr key={sale.id}>
              <td className="strong">{sale.number}</td><td>{sale.customerName}</td>
              <td><span className={overdue ? "stock-low" : ""}>{sale.due ? dateLabel(sale.due) : "Not set"}{overdue ? " · overdue" : ""}</span></td>
              <td>{fmt(balance)}</td>
              <td><select value={status} onChange={(event) => onStatusChange(sale, event.target.value as NonNullable<Sale["followUpStatus"]>)}><option>Not contacted</option><option>Contacted</option><option>Promised</option></select></td>
              <td><button className="btn light tiny" onClick={() => void copyMessage(sale)}><Clipboard size={14} /> Copy reminder</button></td>
            </tr>;
          })}</tbody>
        </table></div> : <p className="operations-empty"><BellRing size={16} /> No outstanding invoice balances.</p>}
      </section>
      <p className="operations-footnote">A due date defaults to 30 days after the invoice date. Follow-up status is saved with each invoice.</p>
    </>
  );
}

import { useState } from "react";
import { Plus, Save, Trash2, Truck } from "lucide-react";
import { dateLabel, fmt, today } from "../domain";
import type { Product, PurchaseEntry } from "../domain";
import { GST_RATES } from "../business/formOptions";
import { createPurchaseEntry } from "../business/transactions";
import { Field, PageHead } from "./Ui";

type Props = {
  products: Product[];
  purchases: PurchaseEntry[];
  onError: (message: string) => void;
  onSave: (entry: PurchaseEntry, products: Product[]) => void;
};

type PurchaseLineDraft = {
  productId: string;
  qty: string;
  unitCost: string;
  gst: number;
  batchCode: string;
  expiryDate: string;
};

const blankLine = (product?: Product): PurchaseLineDraft => ({
  productId: product?.id ?? "",
  qty: "1",
  unitCost: product ? String(product.cost) : "",
  gst: product?.gst ?? 18,
  batchCode: "",
  expiryDate: "",
});

export function PurchaseEntryPage({
  products,
  purchases,
  onError,
  onSave,
}: Props) {
  const [supplier, setSupplier] = useState("");
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLineDraft[]>([
    blankLine(products[0]),
  ]);
  const updateLine = (
    index: number,
    changes: Partial<PurchaseLineDraft>,
  ) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...changes } : line,
      ),
    );
  };
  const submit = () => {
    const result = createPurchaseEntry({
      products,
      purchases,
      date,
      supplier,
      supplierInvoice,
      notes,
      lines: lines.map((line) => ({
        productId: line.productId,
        qty: Number(line.qty),
        unitCost: Number(line.unitCost),
        gst: line.gst,
        batchCode: line.batchCode,
        expiryDate: line.expiryDate,
      })),
    });
    if (!result.ok) {
      onError(result.message);
      return;
    }
    onSave(result.entry, result.products);
    setSupplier("");
    setSupplierInvoice("");
    setDate(today());
    setNotes("");
    setLines([blankLine(result.products[0])]);
  };

  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.qty) || 0) * (Number(line.unitCost) || 0),
    0,
  );
  const tax = lines.reduce(
    (sum, line) =>
      sum +
      ((Number(line.qty) || 0) *
        (Number(line.unitCost) || 0) *
        line.gst) /
        100,
    0,
  );

  return (
    <>
      <PageHead
        title="Purchase entries"
        subtitle="Record supplier purchases to receive stock and update product costs."
      />
      {products.length === 0 ? (
        <div className="panel purchase-empty">
          Add a product before recording a purchase.
        </div>
      ) : (
        <section className="panel purchase-form">
          <div className="panel-head">
            <div>
              <h2>New purchase entry</h2>
              <p>
                Purchase costs are exclusive of GST; GST is calculated per
                item. Product cost is updated to the latest unit purchase cost.
              </p>
            </div>
            <Truck size={20} />
          </div>
          <div className="form-grid two">
            <Field label="Supplier name *">
              <input
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                placeholder="Supplier or vendor"
              />
            </Field>
            <Field label="Supplier invoice number">
              <input
                value={supplierInvoice}
                onChange={(event) => setSupplierInvoice(event.target.value)}
                placeholder="Optional reference"
              />
            </Field>
            <Field label="Purchase date">
              <input
                type="text"
                inputMode="numeric"
                value={date}
                placeholder="YYYY-MM-DD"
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label="Notes">
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </div>
          <div className="purchase-lines">
            <div className="purchase-lines-head">
              <h3>Purchased items</h3>
              <button
                className="btn light tiny"
                onClick={() => setLines((current) => [...current, blankLine(products[0])])}
              >
                <Plus size={14} /> Add item
              </button>
            </div>
            {lines.map((line, index) => (
              <div className="purchase-line" key={index}>
                <Field label="Product">
                  <select
                    value={line.productId}
                    onChange={(event) => {
                      const product = products.find(
                        (item) => item.id === event.target.value,
                      );
                      updateLine(index, {
                        ...blankLine(product),
                      });
                    }}
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · current stock {product.stock}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={line.qty}
                    onChange={(event) =>
                      updateLine(index, { qty: event.target.value })
                    }
                  />
                </Field>
                <Field label="Unit cost (₹)">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={line.unitCost}
                    onChange={(event) =>
                      updateLine(index, { unitCost: event.target.value })
                    }
                  />
                </Field>
                <Field label="GST rate">
                  <select
                    value={line.gst}
                    onChange={(event) =>
                      updateLine(index, { gst: Number(event.target.value) })
                    }
                  >
                    {GST_RATES.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Batch / lot">
                  <input
                    value={line.batchCode}
                    onChange={(event) =>
                      updateLine(index, { batchCode: event.target.value })
                    }
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Expiry date">
                  <input
                    value={line.expiryDate}
                    onChange={(event) =>
                      updateLine(index, { expiryDate: event.target.value })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </Field>
                <div className="purchase-line-total">
                  {fmt(
                    (Number(line.qty) || 0) *
                      (Number(line.unitCost) || 0) *
                      (1 + line.gst / 100),
                  )}
                </div>
                <button
                  className="row-icon"
                  title="Remove item"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((_, lineIndex) => lineIndex !== index),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="purchase-total">
            <span>Subtotal {fmt(subtotal)}</span>
            <span>GST {fmt(tax)}</span>
            <b>Total {fmt(subtotal + tax)}</b>
          </div>
          <div className="modal-actions">
            <button className="btn primary" onClick={submit}>
              <Save size={15} /> Record purchase & update stock
            </button>
          </div>
        </section>
      )}
      <section className="panel purchase-history">
        <div className="panel-head">
          <div>
            <h2>Purchase history</h2>
            <p>{purchases.length} entries recorded on this device</p>
          </div>
        </div>
        {purchases.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ENTRY</th>
                  <th>DATE</th>
                  <th>SUPPLIER</th>
                  <th>SUPPLIER INVOICE</th>
                  <th>ITEMS</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="strong">{purchase.number}</td>
                    <td>{dateLabel(purchase.date)}</td>
                    <td>{purchase.supplier}</td>
                    <td>{purchase.supplierInvoice || "—"}</td>
                    <td>{purchase.lines.length}</td>
                    <td className="strong">{fmt(purchase.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="purchase-empty">
            Purchases you record will appear here.
          </div>
        )}
      </section>
    </>
  );
}

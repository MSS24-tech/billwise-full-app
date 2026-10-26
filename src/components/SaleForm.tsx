import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  ReceiptText,
  Trash2,
  Users,
  Warehouse,
} from "lucide-react";
import { fmt } from "../domain";
import type { Customer, Product } from "../domain";
import { Field } from "./Ui";

export function SaleForm(props: any) {
  const {
    products,
    customers,
    saleCustomer,
    setSaleCustomer,
    saleDate,
    setSaleDate,
    saleSupply,
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
    onAddProductManually,
    onSave,
  } = props;
  const [manualProductId, setManualProductId] = useState("");
  const selected = customers.find((c: Customer) => c.id === saleCustomer);
  const availableProducts = products.filter((product: Product) => product.stock > 0);
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
              <p>Add products manually or scan a barcode.</p>
            </div>
            <button className="btn light tiny" onClick={onAddLine}>
              <Plus size={14} /> Add item
            </button>
          </div>
          <div className="barcode-scan-row">
            <div className="manual-product-add">
              <Field label="Add product manually">
                <select
                  value={manualProductId}
                  onChange={(e) => setManualProductId(e.target.value)}
                >
                  <option value="">Choose a product</option>
                  {availableProducts.map((product: Product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {product.stock} in stock
                    </option>
                  ))}
                </select>
              </Field>
              <button
                className="btn light"
                disabled={!manualProductId}
                onClick={() => {
                  if (manualProductId) {
                    onAddProductManually(manualProductId);
                    setManualProductId("");
                  }
                }}
              >
                <Plus size={14} /> Add product
              </button>
            </div>
            <div className="barcode-product-add">
              <Field label="Scan barcode or SKU">
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Scan here, then press Enter"
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      props.onScanBarcode(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </Field>
              <small>
                USB/Bluetooth scanners work like a keyboard and send Enter
                after a scan.
              </small>
            </div>
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
              <input value={saleSupply} readOnly />
            </Field>
            <Field label="Place of supply">
              <input
                value={salePlace}
                onChange={(e: any) => setSalePlace(e.target.value)}
              />
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
                <span>Taxable amount</span>
                <b>{fmt(computed.taxableSubtotal)}</b>
              </div>
              <div>
                <span>{saleSupply === "Intra-state" ? "CGST" : "IGST"}</span>
                <b>
                  {fmt(
                    saleSupply === "Intra-state"
                      ? computed.cgst
                      : computed.igst,
                  )}
                </b>
              </div>
              {saleSupply === "Intra-state" && (
                <div>
                  <span>SGST</span>
                  <b>{fmt(computed.sgst)}</b>
                </div>
              )}
              {computed.roundingAdjustment !== 0 && (
                <div>
                  <span>Rounding adjustment</span>
                  <b>
                    {computed.roundingAdjustment > 0 ? "+" : ""}
                    {fmt(computed.roundingAdjustment)}
                  </b>
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
              GST is calculated on the discounted, GST-exclusive selling price
              using each product's configured rate. Confirm rates and tax
              treatment before issuing.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

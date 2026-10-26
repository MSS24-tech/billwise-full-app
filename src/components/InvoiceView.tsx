import { ReceiptText } from "lucide-react";
import { calculateSaleTotals, dateLabel, fmt, roundMoney } from "../domain";
import type { Business, Sale } from "../domain";
import { Status } from "./Ui";

export function InvoiceView({
  sale,
  business,
  onPrint,
}: {
  sale: Sale;
  business: Business;
  onPrint: () => void;
}) {
  const intra = sale.supply === "Intra-state";
  const legacyCgst = intra ? roundMoney(sale.tax / 2) : 0;
  const legacySgst = intra ? roundMoney(sale.tax - legacyCgst) : 0;
  const cgst = sale.cgst ?? legacyCgst;
  const sgst = sale.sgst ?? legacySgst;
  const igst = sale.igst ?? (intra ? 0 : roundMoney(sale.tax));
  const taxableSubtotal =
    sale.taxableSubtotal ??
    calculateSaleTotals(sale.lines, sale.discount, sale.supply).taxableSubtotal;
  const roundingAdjustment =
    sale.roundingAdjustment ??
    roundMoney(sale.total - roundMoney(taxableSubtotal + sale.tax));
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
        </div>
      </div>
      <table className="invoice-lines">
        <thead>
          <tr>
            <th>ITEM</th>
            <th>HSN/SAC</th>
            <th>QTY</th>
            <th>RATE (BEFORE GST)</th>
            <th>GST</th>
            <th>AMOUNT (BEFORE GST)</th>
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
              <b>
                −
                {fmt(
                  sale.discountAmount ??
                    roundMoney(sale.subtotal - taxableSubtotal),
                )}
              </b>
            </div>
          )}
          <div>
            <span>Taxable amount</span>
            <b>{fmt(taxableSubtotal)}</b>
          </div>
          <div>
            <span>{intra ? "CGST" : "IGST"}</span>
            <b>{fmt(intra ? cgst : igst)}</b>
          </div>
          {intra && (
            <div>
              <span>SGST</span>
              <b>{fmt(sgst)}</b>
            </div>
          )}
          {roundingAdjustment !== 0 && (
            <div>
              <span>Rounding adjustment</span>
              <b>
                {roundingAdjustment > 0 ? "+" : ""}
                {fmt(roundingAdjustment)}
              </b>
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

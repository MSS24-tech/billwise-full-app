# Billwise — Small Business Manager

A local-first retail billing and inventory management MVP built with React + TypeScript + Vite.

## Features
- Dashboard with sales, receivables, stock alerts and recent invoices
- Product catalogue with SKU, HSN/SAC, price, cost, GST rate and stock
- Customer directory
- Create sales invoices with multiple items, quantities, discounts and GST
- Intra-state CGST/SGST split and inter-state IGST calculation (user-selected supply type)
- Stock deduction when a sale is completed; stock is restored if an invoice is deleted
- Payment status and record-payment action
- Inventory adjustments and low-stock alerts
- Sales report with CSV export
- Invoice printing / Save as PDF
- LocalStorage persistence (no database/API; records stay in this browser on this device)
- Export/import JSON backup

## Run
1. Install Node.js 20+.
2. Extract the ZIP and open terminal in this folder.
3. `npm install`
4. `npm run dev`
5. Open the local URL shown by Vite.

## Important
This is a prototype/MVP and not a certified GST accounting product. Sample data is included for demonstration and can be cleared. Verify GSTIN, HSN/SAC, tax rates, place-of-supply rules, invoice numbering, e-invoicing/e-way bill applicability, and statutory requirements with a qualified professional before production use. Browser LocalStorage is not a secure multi-user database; use regular backups and do not rely on one browser/device as the only copy of business records.

# Billwise — Small Business Manager

A local-first retail billing and inventory management MVP built with React + TypeScript + Vite.

## Features
- Dashboard with sales, receivables, stock alerts and recent invoices
- Product catalogue with SKU, HSN/SAC, price, cost, GST rate and stock
- Customer directory
- Create sales invoices with multiple items, quantities, discounts and GST; prices are GST-exclusive, discounts reduce the taxable amount, tax is rounded to paise, and the final payable total is rounded up to the next whole rupee
- Store product barcodes and scan them into a sale with USB/Bluetooth keyboard-wedge barcode readers (SKU scans are also supported)
- Intra-state CGST/SGST split and inter-state IGST calculation (user-selected supply type)
- Stock deduction when a sale is completed; stock is restored if an invoice is deleted
- Supplier purchase entries that increase stock and update product cost
- Purchase batches with optional lot codes and expiry dates, tracked by FEFO sales deduction and expiry alerts
- Invoice-linked sales returns that restock items and reduce the invoice balance; refunds are limited to payments received
- Expense tracking and a cashbook for sales payments, expenses, refunds and supplier payments, including estimated profit after expenses
- Payment reminders with due dates, follow-up status and copyable customer messages
- Supplier payments allocated to purchase entries with outstanding balance tracking
- Per-product minimum margin thresholds with a confirmation warning before below-margin sales
- Proforma estimates that do not reserve stock and can be converted into sales
- Payment status and record-payment action
- Inventory adjustments and low-stock alerts
- Sales report with CSV export
- Invoice printing / Save as PDF
- Local-only persistence in this browser on this device; no backend or network sync
- Export/import JSON backup

## Run
1. Install Node.js 20+.
2. Extract the ZIP and open terminal in this folder.
3. `npm install`
4. Start the app with `npm run dev`, then open the local URL shown by Vite.

## Important
This is a prototype/MVP and not a certified GST accounting product. Sample data is included for demonstration and can be cleared. Verify GSTIN, HSN/SAC, tax rates, place-of-supply rules, invoice numbering, e-invoicing/e-way bill applicability, and statutory requirements with a qualified professional before production use. Data is saved only in the current browser on this device; export backups regularly.

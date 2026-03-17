# Invoice Example

Commercial invoice sent from a supplier to a buyer. B2B exchange scenario.

## Why SDF here

Today an invoice travels as a PDF. The buyer's accounts payable team either
re-keys the data into their ERP or runs it through an OCR pipeline — both
introducing cost, delay, and error risk. With SDF, the buyer's system extracts
line items, totals, and payment details directly from `data.json`. The
`visual.pdf` layer serves as the legally compliant document for archival and
human review.

## Fields

| Field | Description |
|---|---|
| `invoice_number` | Issuer-scoped invoice identifier |
| `issue_date` | Date the invoice was issued |
| `due_date` | Payment due date |
| `issuer` | Supplying party — name, VAT ID, address, contact |
| `recipient` | Buying party — name, VAT ID, address |
| `line_items` | Goods or services billed — description, quantity, unit price, VAT, subtotal |
| `totals` | Net, VAT, and gross amounts |
| `payment` | IBAN, BIC, and payment reference |
| `order_ref` | Optional — reference to the order/sale this invoice relates to (e.g. PO number, sales order) |

## Matching

The `order_ref` field links this invoice to the originating order (purchase order, sales order, etc.) on the recipient side. When both parties use SDF, the recipient's ERP performs automated matching (PO → invoice) by reading this reference directly from `data.json` — no OCR, no manual lookup.

## Monetary amounts

All monetary values use the `{ "amount": "...", "currency": "..." }` object
pattern — never bare numbers. This avoids floating-point precision loss and
removes currency ambiguity. See `SDF_FORMAT.md` Section 4.4.2.
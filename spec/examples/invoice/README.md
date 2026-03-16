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
| `nomination_ref` | Optional — links this invoice to an internal nomination record |
| `purchase_order_ref` | Optional — links this invoice to the originating purchase order |

## Matching

The `nomination_ref` field links this invoice to a nomination record on the
recipient side. The `purchase_order_ref` field links it to the originating
purchase order. When both parties use SDF, the recipient's ERP performs
automated three-way matching (PO → delivery → invoice) by reading these
reference fields directly from `data.json` — no OCR, no manual lookup.

## Monetary amounts

All monetary values use the `{ "amount": "...", "currency": "..." }` object
pattern — never bare numbers. This avoids floating-point precision loss and
removes currency ambiguity. See `SDF_FORMAT.md` Section 4.4.2.
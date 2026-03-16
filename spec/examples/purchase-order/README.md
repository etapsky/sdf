# Purchase Order Example

Purchase order issued by a buyer to a supplier. B2B exchange scenario.

## Why SDF here

Purchase orders today travel as PDF attachments or through EDI systems. When a
supplier receives a PDF PO, they manually key the line items, delivery address,
and payment terms into their order management system. With SDF, the supplier's
system ingests `data.json` directly — automatic order creation, automatic
inventory reservation, zero re-keying.

## Fields

| Field | Description |
|---|---|
| `po_number` | Buyer-scoped purchase order identifier |
| `issue_date` | Date the PO was issued |
| `delivery_date` | Requested delivery date |
| `payment_terms` | Payment terms string — e.g. `Net 30` |
| `buyer` | Issuing party — name, ID, address, contact |
| `supplier` | Receiving party — name, ID, address |
| `line_items` | Ordered goods — line number, SKU, description, quantity, unit price, subtotal |
| `totals` | Net, VAT, and gross amounts |
| `delivery` | Delivery address, Incoterms, and special instructions |

## Three-way matching

When the supplier ships and sends an SDF invoice, the `purchase_order_ref`
field in the invoice `data.json` links back to this PO's `po_number`. The
buyer's ERP then performs automated three-way matching:

```
Purchase Order  →  Goods Receipt  →  Invoice
po_number          delivery_note     purchase_order_ref
```

All three documents can be SDF files, making the entire procurement cycle
machine-readable end to end.

## SKU field

The `sku` field on each line item carries the buyer's or supplier's internal
part number. Including it enables the supplier's warehouse system to pick and
pack without human interpretation of the description field.
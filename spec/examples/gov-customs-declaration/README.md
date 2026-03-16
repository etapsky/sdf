# Government Customs Declaration Example

Import customs declaration submitted by an importer or freight forwarder to
a customs authority. B2G and G2G exchange scenario.

## Why SDF here

Customs declarations today flow through government EDI systems (NCTS, AES,
ACER) or proprietary portals. Supporting documents — commercial invoices,
packing lists, certificates of origin — arrive as PDF attachments and are
manually verified by customs officers. With SDF, the structured data in
`data.json` is ingested directly by the customs system for automated tariff
calculation, origin verification, and risk assessment. The `visual.pdf` layer
serves as the legal declaration document.

## Fields

| Field | Description |
|---|---|
| `declaration_number` | Authority-issued declaration reference |
| `declaration_type` | `import`, `export`, or `transit` |
| `declaration_date` | Date of submission |
| `invoice_ref` | Reference to the commercial invoice SDF document |
| `declarant` | Party submitting — importer of record, customs broker, or freight forwarder |
| `importer` | Party receiving the goods |
| `exporter` | Party shipping the goods |
| `customs_office` | Receiving customs office — name, office code, address |
| `transport` | Mode, vehicle/vessel/flight ID, country of departure and destination |
| `goods` | Line items — HS code, origin, quantity, customs value, duty rate, duty amount |
| `totals` | Total customs value, total duty, VAT base, VAT amount |

## HS codes

Each goods line carries an `hs_code` field containing the Harmonized System
tariff classification code. This is the primary input for automated duty
calculation. Accurate HS classification is critical — misclassification is a
customs compliance risk.

## G2G extension

In a G2G scenario, the exporting country's customs authority generates an SDF
export declaration. The importing country's customs authority consumes it
directly — eliminating bilateral data re-keying between government systems.
The same `data.json` that fed the export system becomes the import declaration
input on the other side of the border.

## Transport modes

The `transport.mode` field supports: `road`, `rail`, `sea`, `air`,
`multimodal`. Each mode has its own relevant identity fields — `vehicle_id`
for road, `vessel_name` + `vessel_imo` for sea, `flight_number` for air.
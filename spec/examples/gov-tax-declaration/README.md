# Government Tax Declaration Example

Corporate tax declaration submitted by a company to a tax authority. B2G
exchange scenario.

## Why SDF here

Tax declarations today are submitted as PDF forms, through government portals,
or via proprietary XBRL/XML formats that require expensive specialist tooling.
The receiving tax authority re-keys or parses the data into their assessment
systems. With SDF, the `data.json` layer is ingested directly — zero re-keying,
zero OCR, zero reconciliation lag.

The `visual.pdf` layer satisfies the legal archival requirement. The `data.json`
layer feeds the authority's processing pipeline. Both travel in one file.

## Fields

| Field | Description |
|---|---|
| `declaration_type` | Tax category — e.g. `corporate_income_tax`, `vat_annual` |
| `tax_year` | Fiscal year being declared |
| `period` | Declaration period as ISO 8601 date range |
| `declaration_date` | Date of submission |
| `declaration_ref` | Reference number assigned by the tax authority |
| `taxpayer` | Declaring entity — name, tax ID, legal form, address, contact |
| `tax_authority` | Receiving authority — name, ID, address |
| `financials` | Revenue, expenses, taxable income, tax rate, tax due, prepayments, balance |
| `preparer` | External tax advisor or preparer, if applicable |

## Financial fields

All monetary values use the `{ "amount": "...", "currency": "..." }` object
pattern. The `tax_rate` field is a decimal string — `"0.1485"` represents
14.85%. This avoids floating-point ambiguity in legally sensitive figures.

## Automation potential

With SDF, a tax authority can:
- Automatically validate completeness at file ingestion
- Pre-populate the assessment with `data.json` values
- Flag discrepancies between declared revenue and third-party data
- Eliminate manual data entry for the majority of straightforward declarations
# @etapsky/demo-web

> SDF document producer — fill in a form, generate a `.sdf` file in the browser.

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo · F3 deliverable.

---

## What it does

`demo-web` is a browser-based SDF producer. It demonstrates the complete SDF production flow — from structured form input to a downloadable `.sdf` file — without any server involvement.

**Left panel — Form:**
- Select a document type (Invoice, Purchase Order, Tax Declaration, Customs Declaration, Health Report, Permit Application)
- Fill in the fields — grouped by logical section (Invoice details, PO details, Buyer, Supplier, Line item, Payment, etc.)
- Required fields marked with `*`

**Right panel — Live preview:**
- `data.json` updates in real time as you type
- Syntax-highlighted — keys in accent blue, strings in dark, numbers in teal, monetary amounts clearly visible
- Line count shown in the header

**Generate button:**
- Calls `buildSDF()` from `@etapsky/sdf-kit` directly in the browser
- Validates `data.json` against `schema.json` before producing the file
- Downloads the `.sdf` file to your machine
- The generated file can be opened in `demo-reader` for full inspection

No server. No upload. Everything runs client-side.

---

## Stack

| Technology | Role |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool |
| TypeScript | Strict mode |
| `@etapsky/sdf-kit` | SDF production — `buildSDF()` |
| IBM Plex Mono + Sans | Typography |

---

## Running locally

```bash
cd apps/demo-web
npm install
npm run dev
```

Open `http://localhost:5173`.

Fill in the form, click **↓ Generate .sdf file**, then open the downloaded file in `demo-reader`:

```bash
cd apps/demo-reader
npm run dev
# open http://localhost:5174
# drag and drop the .sdf file
```

---

## Architecture

### Document type system

Each document type is defined as a `DocTypeConfig` object in `src/schemas/`. A config contains:

- **`fields`** — ordered list of form fields with key, label, type, placeholder, required flag, and group name
- **`buildData(values)`** — pure function that transforms flat form values into nested `data.json` structure
- **`schema`** — JSON Schema Draft 2020-12 that `buildSDF()` validates against before producing the file
- **`issuer`, `recipient`, `schemaId`** — metadata written to `meta.json`

Adding a new document type is a single file — create `src/schemas/mytype.ts`, implement `DocTypeConfig`, add it to the `CONFIGS` array in `App.tsx`.

### Component structure

```
src/
├── App.tsx                      ← Layout, state, generate handler
├── types.ts                     ← DocTypeConfig, FormField, GenerateState
├── index.css                    ← CSS variables, global reset, form element styles
├── main.tsx                     ← React entry point
├── schemas/
│   ├── invoice.ts               ← Invoice form config + JSON Schema
│   ├── purchase-order.ts        ← Purchase Order form config + JSON Schema
│   ├── gov-tax-declaration.ts   ← Tax declaration sample
│   ├── gov-customs-declaration.ts  ← Customs declaration sample
│   ├── gov-health-report.ts     ← Health report sample
│   ├── gov-permit-application.ts   ← Permit application sample
│   └── nomination.ts            ← Kept for future display (currently not rendered)
└── components/
    ├── DocTypeSelector.tsx      ← Pill buttons for document type selection
    ├── FormRenderer.tsx         ← Dynamic form — renders any DocTypeConfig.fields
    └── JsonPreview.tsx          ← Live syntax-highlighted JSON preview
```

### State machine

```
App state
├── docTypeId       string              — selected document type
├── values          Record<string, string>  — flat form field values
└── genState
    ├── idle        — waiting for user input
    ├── generating  — buildSDF() running, button disabled
    ├── done        — file downloaded, filename shown
    └── error       — buildSDF() threw, message shown
```

### Form field types

| Type | Input element | Notes |
|---|---|---|
| `text` | `<input type="text">` | Default |
| `date` | `<input type="date">` | Browser date picker |
| `number` | `<input type="number">` | min=0, step=any |
| `email` | `<input type="email">` | Browser validation |
| `money` | `<input type="text">` | Monospace font, decimal input |
| `textarea` | `<textarea>` | Resizable, rows=3 |

### buildData() — form values to data.json

Each document type's `buildData(values)` function transforms flat key-value form state into the nested JSON structure that `data.json` requires. Example for invoice:

```
values = {
  invoice_number:  'INV-2026-001',
  issue_date:      '2026-03-16',
  issuer_name:     'Acme Supplies GmbH',
  recipient_name:  'Global Logistics AG',
  item_unit_price: '24.00',
  item_currency:   'EUR',
  item_quantity:   '50',
  ...
}
```

Becomes:

```json
{
  "document_type": "invoice",
  "invoice_number": "INV-2026-001",
  "issue_date": "2026-03-16",
  "issuer": { "name": "Acme Supplies GmbH" },
  "recipient": { "name": "Global Logistics AG" },
  "line_items": [{
    "unit_price": { "amount": "24.00", "currency": "EUR" },
    "quantity": 50,
    "subtotal": { "amount": "1200.00", "currency": "EUR" }
  }],
  "totals": {
    "net":   { "amount": "1200.00", "currency": "EUR" },
    "gross": { "amount": "1200.00", "currency": "EUR" }
  }
}
```

Monetary amounts always follow the `{ amount, currency }` pattern — never bare numbers. Subtotals and totals are calculated from quantity × unit price inside `buildData()`.

### JsonPreview — live syntax highlighting

`JsonPreview` uses a single regex pass over `JSON.stringify(data, null, 2)` to apply inline `style` color tags — no external syntax highlighting library. Colors:

| Token | Color |
|---|---|
| JSON keys | accent blue (`var(--accent)`) |
| String values | text dark |
| Numbers | teal (`var(--teal)`) |
| `true` / `false` | amber |
| `null` | muted gray |

The preview updates on every keystroke via `useMemo` — `buildData(values)` is called on every render but is a pure synchronous function with no side effects.

---

## SDF production flow

When the user clicks **↓ Generate .sdf file**:

1. `buildData(values)` — constructs `data.json` from form state
2. `buildSDF({ data, schema, issuer, ... })` — called from `@etapsky/sdf-kit/producer`
   - Validates `data` against `schema` (ajv, JSON Schema 2020-12)
   - Generates `visual.pdf` via `pdf-lib`
   - Assembles `meta.json` with a fresh UUID v4 `document_id`
   - Packs `visual.pdf` + `data.json` + `schema.json` + `meta.json` into a ZIP archive
3. Returns a `Buffer` — wrapped in a `Blob`, downloaded via a temporary `<a>` element
4. The downloaded `.sdf` file is a valid ZIP — inspect with `unzip -l` or open in `demo-reader`

If validation fails (required fields missing, wrong types), `buildSDF()` throws `SDFError` with code `SDF_ERROR_SCHEMA_MISMATCH` and the error message is shown below the button. No file is written.

---

## Browser compatibility

| Browser | Support |
|---|---|
| Chrome / Edge (latest) | Full |
| Firefox (latest) | Full |
| Safari (latest) | Full |
| Mobile browsers | Layout not optimized |

**Node polyfills:** `@etapsky/sdf-kit` uses Node's `Buffer` internally. The `vite.config.ts` uses `define: { global: 'globalThis' }` and the `buffer` npm package to provide a browser-compatible `Buffer`. Node's `crypto` module is resolved via the browser's native `globalThis.crypto` (Web Crypto API) — no additional polyfill needed in Vite 8+.

---

## Adding a new document type

1. Create `src/schemas/mytype.ts`
2. Implement and export a `DocTypeConfig` object:
   - Define `fields[]` — the form fields
   - Implement `buildData(values)` — transform flat values to nested JSON
   - Define `schema` — JSON Schema Draft 2020-12
   - Set `issuer`, `recipient`, `schemaId`
3. Add the config to `CONFIGS` in `App.tsx`:

```typescript
import { mytypeConfig } from './schemas/mytype'
const CONFIGS = [invoiceConfig, purchaseOrderConfig, govTaxDeclarationConfig, mytypeConfig]
```

The form, live preview, and generate flow all work automatically — no other changes needed.

---

## Design decisions

**Light theme.** `demo-reader` is dark (terminal tool for developers). `demo-web` is light — it's a document production tool. Documents are white. The tool should feel like the document.

**No form library.** Form state is a flat `Record<string, string>`. No React Hook Form, no Formik. The form structure is simple enough that a library would add indirection without value.

**No routing.** Single page, single state machine. Document type switching resets form state entirely.

**Sticky right panel.** The JSON preview panel is sticky — it stays in view as the form scrolls. The relationship between form input and JSON output is always visible.

---

## Known limitations

- Single line item only. Adding multiple line items requires extending `buildData()` and the form fields — intentionally left simple for the demo.
- No form persistence. Refreshing the page clears all form state — no localStorage.
- Mobile layout not optimized. The two-column grid requires a wide viewport.

---

*@etapsky/demo-web · F3 · Etapsky Inc. · github.com/etapsky/sdf*
# @etapsky/demo-reader

> SDF file inspector — drag & drop `.sdf` or `.pdf` files to view the visual and data layers side by side.

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo · F3 deliverable.

---

## What it does

`demo-reader` is a browser-based SDF and PDF inspector. Drop any `.sdf` or `.pdf` file onto the page.

### SDF mode

Drop a `.sdf` file and instantly see:

- **Left panel** — `visual.pdf` rendered in an iframe. The human-readable layer, exactly as a PDF-only consumer would see it.
- **Right panel** — three tabs:
  - `data.json` — MetaCard (document identity) + DataTree (collapsible JSON tree, color-coded by value type)
  - `schema.json` — field list with required markers, types, and descriptions
  - `meta.json` — raw JSON of the SDF identity layer
- **Header** — filename, `document_type` badge, SDF version, `valid ✓` indicator, `↓ pdf` download button

### Plain PDF mode

Drop a plain `.pdf` file (no SDF structured data):

- **Left panel** — PDF rendered as normal
- **Right panel** — "PLAIN PDF — NO STRUCTURED DATA" notice with:
  - Explanation of missing layers
  - CLI hint: `sdf wrap document.pdf --issuer "..." --out document.sdf`
- **Header** — `plain pdf` badge, `↓ sdf` button that wraps the PDF into a `.sdf` archive directly in the browser

### Download actions

| File type | Header button | Action |
|---|---|---|
| `.sdf` | `↓ pdf` | Downloads `visual.pdf` extracted from the archive |
| `.pdf` | `↓ sdf` | Wraps the PDF into a valid `.sdf` and downloads it |

No server. No upload. Everything runs in the browser — files never leave your machine.

---

## Stack

| Technology | Role |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool |
| TypeScript | Strict mode |
| `@etapsky/sdf-kit` | SDF parsing — `parseSDF()` |
| JSZip | Browser-side `.sdf` wrapping (plain PDF mode) |
| IBM Plex Mono + Sans | Typography |

---

## Running locally

```bash
cd apps/demo-reader
npm install
npm run dev
```

Open `http://localhost:5173` and drop a `.sdf` or `.pdf` file.

To generate test `.sdf` files:

```bash
cd spec/poc
npm run build:all
# output/ now contains 7 .sdf files
```

---

## Component structure

```
src/
├── App.tsx                  ← State machine: idle → loading → ready / error
│                               Plain PDF mode handled inline — no parseSDF() call
├── types.ts                 ← SDFMeta, SDFParseResult, AppState
├── index.css                ← CSS variables, global reset, scrollbar
└── components/
    ├── DropZone.tsx         ← Landing screen — accepts .sdf and .pdf
    ├── Header.tsx           ← Top bar — filename, badges, download button, theme toggle
    ├── PDFViewer.tsx        ← iframe PDF renderer with Blob URL lifecycle
    ├── MetaCard.tsx         ← meta.json identity card — all fields, color-coded
    └── DataTree.tsx         ← Recursive JSON tree — collapsible, value coloring
```

### App states

```
idle     → DropZone shown — waiting for file (.sdf or .pdf)
loading  → spinner — file being processed
error    → SDFError code + message + retry button  (SDF files only)
ready    → split layout: PDFViewer (left) + panel tabs (right)
           isPlainPDF flag switches right panel to PlainPDFNotice
```

### Header download button — context-aware

```
SDF file open  →  [ ↓ pdf ]  downloads visual.pdf
PDF file open  →  [ ↓ sdf ]  wraps PDF in-browser, downloads .sdf
```

The `saveAsSDF` function in `Header.tsx` runs entirely client-side using JSZip. It produces a valid SDF `0.1` file with a stub `data.json` and `meta.json`. The resulting `.sdf` can be re-opened in the reader to verify.

### Plain PDF mode

When a `.pdf` file is dropped, `App.tsx` bypasses `parseSDF()` entirely and constructs a synthetic `SDFParseResult` with:
- `pdfBytes` — the raw PDF bytes
- `meta` — stub values (`sdf_version: '—'`, `document_type: 'plain_pdf'`)
- `data` — notice fields (`_notice`, `_filename`, `_size_kb`, `_hint`)
- `schema` — empty object

The right panel detects `isPlainPDF` and renders `PlainPDFNotice` instead of `MetaCard` + `DataTree`.

### DataTree value coloring

| Value type | Color |
|---|---|
| UUID | magenta |
| ISO date / timestamp | amber |
| Decimal number string | teal |
| Monetary `{ amount, currency }` | teal amount + amber currency (inline) |
| Boolean | amber |
| Number | teal |
| String | white |

### PDFViewer

Creates a `Blob` URL from `pdfBytes` (`Uint8Array`) on mount and on prop change. Revokes the previous URL before creating a new one to prevent memory leaks. Renders inside an `<iframe>` — the browser's native PDF renderer handles the rest.

### Theme

Dark and light themes supported. Toggle in the header. Theme persisted to `localStorage` under key `sdf-reader-theme`.

---

## Design decisions

**No external UI library.** All styling is inline CSS with CSS variables. Dark theme by default — designed for developer use.

**No file upload to server.** Everything runs in the browser. `.sdf` parsing uses `parseSDF()` from `@etapsky/sdf-kit`. Plain PDF wrapping uses JSZip directly. Neither operation touches a server.

**Context-aware download button.** A single download button in the header changes meaning based on what is open — `↓ pdf` for SDF files, `↓ sdf` for plain PDFs. This keeps the header clean and makes the round-trip workflow (PDF → SDF → inspect) discoverable.

**Buffer polyfill.** `@etapsky/sdf-kit` uses Node.js `Buffer` internally. The `vite.config.ts` uses `define: { global: 'globalThis' }` and the `buffer` npm package. Node's `crypto` module resolves via `globalThis.crypto` (Web Crypto API) — no additional polyfill needed in Vite 8+.

---

## Known limitations

- Single-page only — no multi-page PDF navigation controls (the iframe's native PDF viewer provides scroll and zoom).
- Large files (>10 MB) may be slow to parse or wrap in the browser — server-side processing is recommended for high-volume use.
- `visual.pdf` renders in an `<iframe>` — Safari on iOS may not inline-render PDFs; it will prompt a download instead.
- Plain PDF → SDF wrapping produces a stub `data.json` only. No text extraction or OCR is performed. For structured data extraction, use `sdf convert` with a manually prepared `data.json` and `schema.json`.

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

This software is licensed under the [Business Source License 1.1](../../LICENSE).
Non-production use is free. Commercial use requires a license from the author until the Change Date (2030-03-17), after which it converts to Apache License 2.0.

*@etapsky/demo-reader · F3 · © 2026 Yunus YILDIZ · github.com/etapsky/sdf*
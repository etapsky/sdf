# @etapsky/demo-reader

> SDF file inspector — drag & drop `.sdf` files to view the visual and data layers side by side.

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo · F3 deliverable.

---

## What it does

`demo-reader` is a browser-based SDF inspector. Drop any `.sdf` file onto the page and instantly see:

- **Left panel** — `visual.pdf` rendered in an iframe. The human-readable layer, exactly as a PDF-only consumer would see it.
- **Right panel** — three tabs:
  - `data.json` — MetaCard (document identity) + DataTree (collapsible JSON tree, color-coded by value type)
  - `schema.json` — field list with required markers, types, and descriptions
  - `meta.json` — raw JSON of the SDF identity layer

No server. No upload. Everything runs in the browser — the `.sdf` file never leaves your machine.

---

## Stack

| Technology | Role |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool |
| TypeScript | Strict mode |
| `@etapsky/sdf-kit` | SDF parsing — `parseSDF()` |
| IBM Plex Mono + Sans | Typography |

---

## Running locally

```bash
cd apps/demo-reader
npm install
npm run dev
```

Open `http://localhost:5173` and drop a `.sdf` file.

To generate test files:

```bash
cd spec/poc
npm run build:all
# output/ now contains 7 .sdf files
```

Then drop any of them into the reader.

---

## Component structure

```
src/
├── App.tsx                  ← State machine: idle → loading → ready / error
├── types.ts                 ← SDFMeta, SDFParseResult, AppState
├── index.css                ← CSS variables, global reset, scrollbar
└── components/
    ├── DropZone.tsx         ← Landing screen — drag & drop or click to browse
    ├── Header.tsx           ← Top bar — filename, document_type badge, valid ✓
    ├── PDFViewer.tsx        ← iframe PDF renderer with Blob URL lifecycle
    ├── MetaCard.tsx         ← meta.json identity card — all fields, color-coded
    └── DataTree.tsx         ← Recursive JSON tree — collapsible, value coloring
```

### App states

```
idle     → DropZone shown — waiting for file
loading  → spinner — parseSDF() running
error    → SDFError code + message + retry button
ready    → split layout: PDFViewer (left) + panel tabs (right)
```

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

---

## Design decisions

**No external UI library.** All styling is inline CSS with CSS variables. Dark theme by default — designed for developer use.

**No file upload to server.** `FileReader` + `ArrayBuffer` → `parseSDF()` runs entirely in the browser. The `.sdf` ZIP is unpacked client-side by JSZip (bundled with `@etapsky/sdf-kit`).

**Buffer polyfill.** `@etapsky/sdf-kit` uses Node.js `Buffer` internally. Vite 8 does not polyfill Node built-ins by default. The `vite.config.ts` uses `define: { global: 'globalThis' }` and the `buffer` npm package to provide a browser-compatible `Buffer`.

---

## Known limitations

- Single-page only — no multi-page PDF navigation controls (the iframe's native PDF viewer provides scroll and zoom).
- Large `.sdf` files (>10 MB) may be slow to parse in the browser — server-side `parseSDF()` is recommended for high-volume use.
- `visual.pdf` renders in an `<iframe>` — Safari on iOS may not inline-render PDFs; it will prompt a download instead.

---

*@etapsky/demo-reader · F3 · Etapsky Inc. · github.com/etapsky/sdf*

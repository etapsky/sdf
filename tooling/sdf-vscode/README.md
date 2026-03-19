# SDF — VS Code Extension

> Inspect, validate, and preview `.sdf` (Smart Document Format) files in VS Code.

[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](../../LICENSE)

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo.

---

## Features

| Feature | Description |
|--------|-------------|
| **Custom editor** | Double-click `.sdf` → visual PDF preview (or meta/data/schema fallback) |
| **Inspect** | Full inspection report — meta, schema summary, data tree |
| **Validate** | Structural + schema validation |
| **Tree view** | Explorer panel — meta, schema, data layers |
| **Status bar** | Document info (version, type, signed status) when a .sdf file is active |

---

## Commands

| Command | Description |
|---------|-------------|
| `SDF: Inspect File` | Parse and show meta/schema/data summary |
| `SDF: Validate File` | Validate .sdf structure and schema |
| `SDF: Open Preview` | Open custom editor with PDF or JSON preview |

---

## Usage

1. **Open a .sdf file** — Uses the custom editor by default (PDF or fallback).
2. **Right-click in Explorer** — `.sdf` files show SDF menu: Inspect, Validate, Preview.
3. **SDF Document view** — After running Inspect, the Explorer shows meta/schema/data tree.

---

## Development

```bash
cd tooling/sdf-vscode
npm install
npm run build
```

Then press `F5` in VS Code to launch the Extension Development Host.

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `sdf.statusBar.enabled` | `true` | Show SDF info in status bar when a .sdf file is active |

---

## Requirements

- VS Code 1.89+
- Node.js 18+
- `@etapsky/sdf-kit` (bundled)

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

See [LICENSE](../../LICENSE). Non-production use is free. Commercial use requires a license until 2030-03-17, after which it converts to Apache 2.0.

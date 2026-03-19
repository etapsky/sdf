# SDF — Tooling

> Build-time and development tools for the SDF (Smart Document Format) ecosystem.

[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](../LICENSE)

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo.

---

## Directory structure

```
tooling/
├── README.md
├── os-integration/          # Register .sdf as a known file type
│   ├── README.md
│   ├── macos/               # Quick Look plugin, install script, icon generator
│   └── windows/             # Registry entries, install script, test script
└── sdf-vscode/              # VS Code extension
    ├── README.md
    ├── src/                 # extension, commands, providers, webview
    └── test/                # extension tests
```

---

## Subdirectories

| Directory | Description |
|-----------|-------------|
| [**os-integration/**](os-integration/README.md) | Registers `.sdf` as a known file type on macOS and Windows — custom icons, Quick Look preview, right-click menu, MIME type |
| [**sdf-vscode/**](sdf-vscode/README.md) | VS Code extension — inspect, validate, preview `.sdf` files in the editor |

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

This software is licensed under the [Business Source License 1.1](../LICENSE).
Non-production use is free. Commercial use requires a license from the author until the Change Date (2030-03-17), after which it converts to Apache License 2.0.

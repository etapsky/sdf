# @etapsky/sdf-schema-registry

> SDF Schema Registry — versioned schema publication, structural diff, and data migration.

[![npm](https://img.shields.io/npm/v/@etapsky/sdf-schema-registry)](https://www.npmjs.com/package/@etapsky/sdf-schema-registry)
[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](../../LICENSE)

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo.

---

## What it does

`@etapsky/sdf-schema-registry` provides three capabilities:

**Registry** — local schema store with remote resolution. Register schemas by version, resolve them by `$id` URI, list and query by document type. Designed for use in server-side applications and ERP connectors that maintain a catalog of known SDF schemas.

**Diff** — structural comparison between two JSON Schema versions. Classifies every change as breaking or non-breaking per SDF_FORMAT.md Section 7.2. Integrated into `sdf schema diff` CLI command — exits 1 on breaking changes, enabling CI gating of schema releases.

**Migration** — rule-based data transformation from one schema version to another. Define explicit transformation rules for breaking changes. Auto-handles safe structural changes (optional new fields, fields made optional, schema `$id` updates, title changes). The engine produces a plan first, then applies it — plan and migrate are separate operations.

---

## Installation

```bash
npm install @etapsky/sdf-schema-registry
```

---

## Quick start

### Registry — register and resolve schemas

```typescript
import { SchemaRegistry } from '@etapsky/sdf-schema-registry/registry';

const registry = new SchemaRegistry();

registry.register(invoiceSchemaV01, {
  documentType: 'invoice',
  major:        0,
  minor:        1,
  version:      '0.1',
  publishedAt:  '2026-03-01T00:00:00Z',
  latest:       false,
  deprecated:   false,
  description:  'Initial invoice schema',
});

registry.register(invoiceSchemaV02, {
  documentType: 'invoice',
  major:        0,
  minor:        2,
  version:      '0.2',
  publishedAt:  '2026-03-15T00:00:00Z',
  latest:       true,
  deprecated:   false,
  description:  'Added required currency field',
});

// Resolve by $id
const entry  = await registry.resolve('https://etapsky.github.io/sdf/schemas/invoice/v0.1.json');
const latest = registry.resolveLatest('invoice');
const v01    = registry.resolveVersion('invoice', '0.1');

// Validate data against a registered schema
const result = await registry.validate(invoiceData, 'https://etapsky.github.io/sdf/schemas/invoice/v0.1.json');
if (!result.valid) console.error(result.errors);

// List all registered schemas
const list = registry.list();           // all document types
const inv  = registry.list('invoice');  // invoice only
```

### Remote schema resolution

When a schema is not found locally and `allowRemote: true` (the default), the registry fetches it from the `$id` URI:

```typescript
const registry = new SchemaRegistry({ allowRemote: true, fetchTimeout: 5000 });

// Fetches from etapsky.github.io if not in local store
const entry = await registry.resolve('https://etapsky.github.io/sdf/schemas/invoice/v0.1.json');
```

Fetched schemas are cached locally for the lifetime of the registry instance.

---

### Diff — compare schema versions

```typescript
import { diffSchemas } from '@etapsky/sdf-schema-registry/diff';

const result = diffSchemas(invoiceSchemaV01, invoiceSchemaV02);

console.log(result.breaking);            // true
console.log(result.summary.breaking);    // 2
console.log(result.summary.nonBreaking); // 1

for (const change of result.changes) {
  console.log(change.type, change.path, change.breaking, change.message);
}
```

**`SchemaDiffResult`:**

```typescript
interface SchemaDiffResult {
  breaking: boolean;
  changes:  SchemaChange[];
  summary: {
    total:       number;
    breaking:    number;
    nonBreaking: number;
  };
}
```

**`SchemaChange` types:**

| Type | Breaking | Description |
|---|---|---|
| `field_added` | if required | New field — breaking if required, safe if optional |
| `field_removed` | ✓ | Consumers relying on this field will fail |
| `field_type_changed` | ✓ | Existing data may not conform to new type |
| `field_required_added` | ✓ | Old producers may not send this field |
| `field_required_removed` | ✗ | Field becomes optional — safe |
| `field_constraint_tightened` | ✓ | `minLength` increased, `const` changed, format added |
| `field_constraint_relaxed` | ✗ | `minLength` decreased or removed |
| `additional_properties_changed` | if closed | Opening is safe; closing is breaking |
| `schema_id_changed` | ✓ | `$id` changed — breaks external URI references; auto-handled at the data level by `MigrationEngine` |
| `title_changed` | ✗ | Metadata only |

---

### Migration — transform data between versions

```typescript
import { MigrationEngine } from '@etapsky/sdf-schema-registry/migrate';

const engine = new MigrationEngine();

// Register explicit rules for breaking changes
engine.addRule({
  path:        'required[currency]',
  description: 'Add default currency EUR when missing',
  transform:   (data) => ({
    ...data,
    currency: (data.currency as string | undefined) ?? 'EUR',
  }),
});

// Build a plan
const plan = engine.plan(invoiceSchemaV01, invoiceSchemaV02, 'invoice');

console.log(plan.fromVersion);  // '0.1'
console.log(plan.toVersion);    // '0.2'
console.log(plan.safe);         // true — all breaking changes have rules
console.log(plan.unhandled);    // [] — no unhandled breaking changes

// Apply the plan to a data.json object
const result = engine.migrate(invoiceData, plan);

console.log(result.data);     // migrated data
console.log(result.applied);  // steps that were applied
console.log(result.warnings); // warnings for unhandled breaking changes
```

**Auto-handled changes** (no rule needed):
- Optional new fields — field is simply absent from existing data; no transformation required
- Fields made optional — consumers continue to work unchanged
- `schema_id` reference updates — if `data.schema_id` is present it is updated to the new URI; otherwise a no-op
- Title changes — metadata only; no data impact

Note: constraint relaxations (`minLength` lowered, `format` removed) are detected as non-breaking changes by `diffSchemas` but are not applied as data transformations — the existing data already satisfies the looser constraint.

**Unhandled breaking changes** produce warnings in `result.warnings` but do not throw — the migrated data is returned regardless. Inspect `plan.safe` before migrating to decide whether to proceed.

---

## API

### SchemaRegistry

```typescript
class SchemaRegistry {
  constructor(config?: Partial<RegistryConfig>)

  // Registration
  register(schema, meta): void
  registerAll(entries): void

  // Resolution
  resolve(schemaId): Promise<SchemaEntry>        // local + remote
  resolveLatest(documentType): SchemaEntry | undefined
  resolveVersion(documentType, version): SchemaEntry | undefined

  // Listing
  list(documentType?): RegistryListResult
  versions(documentType): SchemaVersion[]

  // Validation
  validate(data, schemaId): Promise<{ valid: boolean; errors: unknown[] }>

  // Utils
  buildSchemaId(documentType, version): string
  has(schemaId): boolean
  remove(schemaId): boolean
  clear(): void
  size: number
}
```

**`RegistryConfig`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | `https://etapsky.github.io/sdf/schemas` | Base URL for schema `$id` URIs |
| `allowRemote` | `boolean` | `true` | Whether to fetch schemas from remote URLs |
| `fetchTimeout` | `number` | `5000` | Remote fetch timeout in milliseconds |

### diffSchemas

```typescript
function diffSchemas(
  oldSchema: Record<string, unknown>,
  newSchema: Record<string, unknown>,
): SchemaDiffResult
```

Pure function — no side effects. Computes the structural diff between two JSON Schema objects. Both schemas must be JSON Schema Draft 2020-12 objects. Does not require network access.

### MigrationEngine

```typescript
class MigrationEngine {
  addRule(rule: MigrationRule): void
  addRules(rules: MigrationRule[]): void

  plan(oldSchema, newSchema, documentType): MigrationPlan
  migrate(data, plan): MigrationResult
}
```

**`MigrationRule`:**

```typescript
interface MigrationRule {
  path:        string;             // field path — e.g. "required[currency]"
  description: string;
  transform:   (
    data:   Record<string, unknown>,
    change: SchemaChange,
  ) => Record<string, unknown>;
}
```

**`MigrationPlan`:**

```typescript
interface MigrationPlan {
  fromVersion:  string;
  toVersion:    string;
  documentType: string;
  steps:        MigrationStep[];
  safe:         boolean;          // true = all breaking changes have rules
  unhandled:    SchemaChange[];   // breaking changes with no rule
}
```

---

## Integration with sdf-cli

`sdf schema diff` and `sdf schema validate` delegate to this package:

```bash
# Breaking change detection in CI
sdf schema diff --from v0.1.schema.json --to v0.2.schema.json

# Standalone data validation
sdf schema validate --data invoice.json --schema invoice.schema.json
```

---

## Server-side integration

`SchemaRegistry` is designed for use in server applications and ERP connectors. Instantiate one registry per process (or per tenant in multi-tenant environments), populate it with known schemas on startup, and resolve schemas by `$id` as SDF files arrive.

```typescript
// Resolve schema from an incoming SDF document's meta.json
const entry = await registry.resolve(meta.schema_id);
const result = await registry.validate(data, meta.schema_id);
```

---

## Design decisions

**Plan before migrate.** The engine separates `plan()` from `migrate()`. Inspect the plan first — check `plan.safe` and `plan.unhandled` — before committing to the migration. This makes the transformation auditable and reversible.

**Explicit rules, not inference.** The engine does not infer how to transform data for breaking changes. Every breaking change that requires data transformation needs an explicit `MigrationRule`. This is intentional — data migrations that lose or corrupt business data are worse than a warning.

**Pure diff function.** `diffSchemas()` is a pure function with no side effects and no registry dependency. It can be used standalone without instantiating a registry.

**Remote schema caching.** Fetched schemas are cached in the registry instance for the session. Each `SchemaRegistry` instance maintains its own cache — there is no global singleton cache to avoid cross-request contamination in server environments.

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

This software is licensed under the [Business Source License 1.1](../../LICENSE).
Non-production use is free. Commercial use requires a license from the author until the Change Date (2030-03-17), after which it converts to Apache License 2.0.

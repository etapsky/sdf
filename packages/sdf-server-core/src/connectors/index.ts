// ─── ERP Connectors — Public API ─────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Barrel export for all connector types, registry, and mapping utilities.
// registerConnectors() must be called once at server startup to make SAP and
// Oracle factories available for per-tenant configuration.

export * from './base/types.js'
export * from './base/registry.js'
export * from './base/mapper.js'
export { ERPHttpClient } from './base/http.js'
export { SAPConnector }    from './sap/connector.js'
export { OracleConnector } from './oracle/connector.js'

import { connectorRegistry } from './base/registry.js'
import { SAPConnector }      from './sap/connector.js'
import { OracleConnector }   from './oracle/connector.js'

/**
 * Register all built-in connector factories.
 * Call this once at server startup before handling requests.
 */
export function registerConnectors(): void {
  connectorRegistry.registerFactory('SAP',    (config) => new SAPConnector(config))
  connectorRegistry.registerFactory('Oracle', (config) => new OracleConnector(config))
  console.log('✓ ERP connector factories registered: SAP, Oracle')
}

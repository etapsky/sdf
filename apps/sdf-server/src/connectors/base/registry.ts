// ─── ConnectorRegistry ────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Maps tenant IDs to their active ERP connector instance.
// Connector factories are registered once at startup (registerConnectors()).
// Per-tenant instances are created on demand via configure() and cached in memory.

import type { IERPConnector, ERPConnectorConfig } from './types.js'
import { ERPConnectorError } from './types.js'

type ConnectorFactory = (config: ERPConnectorConfig) => IERPConnector

export class ConnectorRegistry {
  /** Registered connector factories — keyed by type string */
  private factories: Map<string, ConnectorFactory> = new Map()

  /** Tenant-to-connector instance cache — keyed by tenantId */
  private instances: Map<string, IERPConnector> = new Map()

  // ─── Factory registration ──────────────────────────────────────────────────

  /**
   * Register a connector factory.
   * Called at startup for each connector type.
   *
   * @example
   * registry.registerFactory('SAP', (config) => new SAPConnector(config))
   */
  registerFactory(type: string, factory: ConnectorFactory): void {
    this.factories.set(type.toUpperCase(), factory)
  }

  // ─── Tenant connector management ──────────────────────────────────────────

  /**
   * Configure a connector for a specific tenant.
   * The connector instance is created and cached.
   */
  configure(tenantId: string, config: ERPConnectorConfig): IERPConnector {
    const factory = this.factories.get(config.type.toUpperCase())
    if (!factory) {
      throw new ERPConnectorError(
        config.type,
        'UNKNOWN_CONNECTOR_TYPE',
        `No factory registered for connector type: ${config.type}. ` +
        `Registered types: ${[...this.factories.keys()].join(', ')}`,
      )
    }

    const instance = factory(config)
    this.instances.set(tenantId, instance)
    return instance
  }

  /**
   * Get the connector for a tenant.
   * Returns undefined if no connector is configured for this tenant.
   */
  get(tenantId: string): IERPConnector | undefined {
    return this.instances.get(tenantId)
  }

  /**
   * Get the connector for a tenant — throws if not configured.
   */
  getOrThrow(tenantId: string): IERPConnector {
    const connector = this.instances.get(tenantId)
    if (!connector) {
      throw new ERPConnectorError(
        'UNKNOWN',
        'CONNECTOR_NOT_CONFIGURED',
        `No ERP connector configured for tenant: ${tenantId}`,
      )
    }
    return connector
  }

  /**
   * Remove the connector for a tenant.
   */
  remove(tenantId: string): boolean {
    return this.instances.delete(tenantId)
  }

  /**
   * Check if a tenant has a connector configured.
   */
  has(tenantId: string): boolean {
    return this.instances.has(tenantId)
  }

  /**
   * Health check all registered tenant connectors.
   */
  async healthCheckAll(): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {}
    for (const [tenantId, connector] of this.instances.entries()) {
      try {
        results[tenantId] = await connector.healthCheck()
      } catch (err) {
        results[tenantId] = { connected: false, message: String(err) }
      }
    }
    return results
  }

  get size(): number {
    return this.instances.size
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const connectorRegistry = new ConnectorRegistry()
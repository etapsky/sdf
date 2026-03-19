// ─── SAP Connector ────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Implements IERPConnector for SAP S/4HANA OData APIs.
//
// Tested against:
//   SAP S/4HANA Cloud 2023 — SupplierInvoice API
//   SAP Fiori MM — Nomination / Scheduling Agreement
//
// Authentication: OAuth2 (recommended), Basic Auth (legacy)

import type {
    IERPConnector,
    ERPConnectorConfig,
    ERPPushResult,
    ERPMatchResult,
    ERPStatusResult,
    ERPHealthResult,
  } from '../base/types.js'
  import { ERPConnectorError } from '../base/types.js'
  import { ERPHttpClient }     from '../base/http.js'
  import { applyMappings, findMapping } from '../base/mapper.js'
  import { SAP_MAPPINGS }      from './mapper.js'
  import type { SDFMeta }      from '@etapsky/sdf-kit'

  // SAP OData status codes
  const SAP_STATUS_MAP: Record<string, string> = {
    'A': 'pending',
    'B': 'processing',
    'C': 'posted',
    'D': 'matched',
    'E': 'rejected',
    'Z': 'cancelled',
  }

  export class SAPConnector implements IERPConnector {
    readonly type = 'SAP'
    readonly config: ERPConnectorConfig
    private readonly http: ERPHttpClient

    constructor(config: ERPConnectorConfig) {
      this.config = config
      this.http   = new ERPHttpClient('SAP', config)
    }

    // ─── pushDocument ─────────────────────────────────────────────────────────

    async pushDocument(
      data:         Record<string, unknown>,
      meta:         SDFMeta,
      documentType: string,
    ): Promise<ERPPushResult> {
      const mapping = findMapping(
        this.config.fieldMappings
          ? this.mergeCustomMappings(SAP_MAPPINGS, this.config.fieldMappings)
          : SAP_MAPPINGS,
        documentType,
      )

      if (!mapping) {
        return {
          success:   false,
          erpRef:    '',
          erpSystem: 'SAP',
          message:   `No SAP mapping defined for document type: ${documentType}`,
        }
      }

      let erpFields: Record<string, unknown>
      try {
        erpFields = applyMappings(data, mapping.fields)
      } catch (err) {
        return {
          success:   false,
          erpRef:    '',
          erpSystem: 'SAP',
          message:   `Field mapping failed: ${String(err)}`,
        }
      }

      // Add SDF metadata fields
      erpFields.SDFDocumentId  = meta.document_id
      erpFields.SDFVersion     = meta.sdf_version
      erpFields.SDFIssuer      = meta.issuer
      erpFields.ExternalReference = meta.document_id

      const endpoint = this.getEndpoint(mapping.erpObjectType)

      try {
        const response = await this.http.request<{ d: { DocumentUUID?: string; SupplierInvoice?: string } }>({
          method: 'POST',
          path:   endpoint,
          body:   { d: erpFields },
          headers: {
            'sap-client': this.getSapClient(),
            'x-csrf-token': await this.fetchCSRFToken(),
          },
        })

        const erpRef =
          response.data.d?.DocumentUUID ??
          response.data.d?.SupplierInvoice ??
          `SAP-${meta.document_id.slice(0, 8)}`

        return {
          success:   true,
          erpRef,
          erpSystem: 'SAP',
          message:   `Document posted to SAP as ${mapping.erpObjectType}`,
          raw:       this.config.debug ? response.data : undefined,
        }
      } catch (err) {
        if (err instanceof ERPConnectorError) {
          return { success: false, erpRef: '', erpSystem: 'SAP', message: err.message, raw: err.raw }
        }
        return { success: false, erpRef: '', erpSystem: 'SAP', message: String(err) }
      }
    }

    // ─── matchNomination ──────────────────────────────────────────────────────

    async matchNomination(nominationRef: string): Promise<ERPMatchResult> {
      try {
        const response = await this.http.request<{ d: { results: Array<Record<string, unknown>> } }>({
          method: 'GET',
          path:   `/sap/opu/odata/sap/API_PURCHASE_ORDER_SRV/A_PurchaseOrder?$filter=PurchaseOrderType eq 'NB' and ExternalDocumentID eq '${nominationRef}'&$top=1`,
          headers: { 'sap-client': this.getSapClient() },
        })

        const results = response.data.d?.results ?? []

        if (results.length === 0) {
          return {
            matched:       false,
            nominationRef,
            erpSystem:     'SAP',
            reason:        `No SAP purchase order found with ExternalDocumentID: ${nominationRef}`,
          }
        }

        const record = results[0]
        return {
          matched:       true,
          nominationRef,
          erpRef:        record.PurchaseOrder as string,
          erpSystem:     'SAP',
          confidence:    1.0,
          fields: {
            purchaseOrder: record.PurchaseOrder,
            vendor:        record.Supplier,
            companyCode:   record.CompanyCode,
            currency:      record.DocumentCurrency,
          },
        }
      } catch (err) {
        return {
          matched:       false,
          nominationRef,
          erpSystem:     'SAP',
          reason:        String(err),
        }
      }
    }

    // ─── queryStatus ──────────────────────────────────────────────────────────

    async queryStatus(erpRef: string): Promise<ERPStatusResult> {
      try {
        const response = await this.http.request<{ d: Record<string, unknown> }>({
          method: 'GET',
          path:   `/sap/opu/odata/sap/API_SUPPLIER_INVOICE_PROCESS_SRV/A_SupplierInvoice('${erpRef}')`,
          headers: { 'sap-client': this.getSapClient() },
        })

        const raw       = response.data.d
        const sapStatus = raw.DocumentStatus as string ?? 'A'
        const status    = SAP_STATUS_MAP[sapStatus] ?? 'unknown'

        return {
          erpRef,
          erpSystem:   'SAP',
          status:      status as ERPStatusResult['status'],
          lastUpdated: raw.LastChangeDateTime as string,
          details: {
            sapStatus,
            postingDate:   raw.PostingDate,
            companyCode:   raw.CompanyCode,
            fiscalYear:    raw.FiscalYear,
          },
        }
      } catch (err) {
        return { erpRef, erpSystem: 'SAP', status: 'unknown', details: { error: String(err) } }
      }
    }

    // ─── healthCheck ──────────────────────────────────────────────────────────

    async healthCheck(): Promise<ERPHealthResult> {
      const start = Date.now()
      try {
        await this.http.request({
          method: 'GET',
          path:   '/sap/opu/odata/sap/API_SUPPLIER_INVOICE_PROCESS_SRV/$metadata',
          headers: { 'sap-client': this.getSapClient() },
          timeoutMs: 5_000,
        })
        return { connected: true, latencyMs: Date.now() - start, system: 'SAP' }
      } catch (err) {
        return { connected: false, latencyMs: Date.now() - start, system: 'SAP', message: String(err) }
      }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private getEndpoint(erpObjectType: string): string {
      const endpoints: Record<string, string> = {
        'SupplierInvoice': '/sap/opu/odata/sap/API_SUPPLIER_INVOICE_PROCESS_SRV/A_SupplierInvoice',
        'NominationItem':  '/sap/opu/odata/sap/API_PURCHASE_ORDER_SRV/A_PurchaseOrderItem',
      }
      return endpoints[erpObjectType] ?? `/sap/opu/odata/sap/CUSTOM/${erpObjectType}`
    }

    private getSapClient(): string {
      return (this.config as { sapClient?: string }).sapClient ?? '100'
    }

    private async fetchCSRFToken(): Promise<string> {
      try {
        const response = await this.http.request({
          method:  'GET',
          path:    '/sap/opu/odata/sap/API_SUPPLIER_INVOICE_PROCESS_SRV/',
          headers: { 'x-csrf-token': 'Fetch' },
        })
        return (response.headers['x-csrf-token'] as string) ?? ''
      } catch {
        return ''
      }
    }

    private mergeCustomMappings(
      base:    import('../base/types.js').DocumentTypeMapping[],
      custom:  Record<string, string>,
    ): import('../base/types.js').DocumentTypeMapping[] {
      return base.map(mapping => ({
        ...mapping,
        fields: mapping.fields.map(f => ({
          ...f,
          to: custom[f.from] ?? f.to,
        })),
      }))
    }
  }

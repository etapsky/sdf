// ─── Oracle Connector ─────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Implements IERPConnector for Oracle Fusion Cloud ERP REST APIs.
//
// Tested against:
//   Oracle Fusion Cloud 23D — Financials (AP, AR)
//   Oracle Fusion Cloud 23D — Supply Chain Management (SCM)
//
// Authentication: OAuth2 (recommended), Basic Auth

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
  import { ORACLE_MAPPINGS }   from './mapper.js'
  import type { SDFMeta }      from '@etapsky/sdf-kit'

  const ORACLE_STATUS_MAP: Record<string, string> = {
    'UNPAID':     'posted',
    'PARTIAL':    'processing',
    'PAID':       'paid',
    'CANCELLED':  'cancelled',
    'ON_HOLD':    'pending',
    'REJECTED':   'rejected',
  }

  export class OracleConnector implements IERPConnector {
    readonly type = 'Oracle'
    readonly config: ERPConnectorConfig
    private readonly http: ERPHttpClient

    constructor(config: ERPConnectorConfig) {
      this.config = config
      this.http   = new ERPHttpClient('Oracle', config)
    }

    // ─── pushDocument ─────────────────────────────────────────────────────────

    async pushDocument(
      data:         Record<string, unknown>,
      meta:         SDFMeta,
      documentType: string,
    ): Promise<ERPPushResult> {
      const mapping = findMapping(ORACLE_MAPPINGS, documentType)

      if (!mapping) {
        return {
          success:   false,
          erpRef:    '',
          erpSystem: 'Oracle',
          message:   `No Oracle mapping defined for document type: ${documentType}`,
        }
      }

      let erpFields: Record<string, unknown>
      try {
        erpFields = applyMappings(data, mapping.fields)
      } catch (err) {
        return { success: false, erpRef: '', erpSystem: 'Oracle', message: `Field mapping failed: ${String(err)}` }
      }

      // Add SDF traceability fields
      erpFields.Description  = erpFields.Description ?? `SDF ${documentType} - ${meta.document_id}`
      erpFields.Reference    = meta.document_id
      erpFields.Attribute1   = meta.sdf_version   // DFF (Descriptive Flex Field) — SDF version
      erpFields.Attribute2   = meta.issuer         // DFF — issuer name

      const path = `/fscmRestApi/resources/11.13.18.05/${mapping.erpObjectType}`

      try {
        const response = await this.http.request<{ InvoiceId?: string; OrderId?: string; links?: unknown[] }>({
          method: 'POST',
          path,
          body:   erpFields,
        })

        const erpRef =
          response.data.InvoiceId?.toString() ??
          response.data.OrderId?.toString() ??
          `Oracle-${meta.document_id.slice(0, 8)}`

        return {
          success:   true,
          erpRef,
          erpSystem: 'Oracle',
          message:   `Document posted to Oracle as ${mapping.erpObjectType}`,
          raw:       this.config.debug ? response.data : undefined,
        }
      } catch (err) {
        if (err instanceof ERPConnectorError) {
          return { success: false, erpRef: '', erpSystem: 'Oracle', message: err.message, raw: err.raw }
        }
        return { success: false, erpRef: '', erpSystem: 'Oracle', message: String(err) }
      }
    }

    // ─── matchNomination ──────────────────────────────────────────────────────

    async matchNomination(nominationRef: string): Promise<ERPMatchResult> {
      try {
        const response = await this.http.request<{ items: Array<Record<string, unknown>>; count: number }>({
          method: 'GET',
          path:   `/fscmRestApi/resources/11.13.18.05/purchaseOrders?q=PONumber=${nominationRef}&limit=1`,
        })

        const items = response.data.items ?? []

        if (items.length === 0) {
          return {
            matched:       false,
            nominationRef,
            erpSystem:     'Oracle',
            reason:        `No Oracle PO found with PONumber: ${nominationRef}`,
          }
        }

        const record = items[0]
        return {
          matched:       true,
          nominationRef,
          erpRef:        String(record.OrderId ?? record.PONumber),
          erpSystem:     'Oracle',
          confidence:    1.0,
          fields: {
            orderId:      record.OrderId,
            poNumber:     record.PONumber,
            supplier:     record.SupplierName,
            businessUnit: record.BuyingPartyName,
            currency:     record.CurrencyCode,
          },
        }
      } catch (err) {
        return { matched: false, nominationRef, erpSystem: 'Oracle', reason: String(err) }
      }
    }

    // ─── queryStatus ──────────────────────────────────────────────────────────

    async queryStatus(erpRef: string): Promise<ERPStatusResult> {
      try {
        const response = await this.http.request<Record<string, unknown>>({
          method: 'GET',
          path:   `/fscmRestApi/resources/11.13.18.05/supplierInvoices/${erpRef}`,
        })

        const raw          = response.data
        const oracleStatus = raw.PaymentStatus as string ?? 'UNPAID'
        const status       = ORACLE_STATUS_MAP[oracleStatus] ?? 'unknown'

        return {
          erpRef,
          erpSystem:   'Oracle',
          status:      status as ERPStatusResult['status'],
          lastUpdated: raw.LastUpdateDate as string,
          details: {
            oracleStatus,
            invoiceAmount:   raw.InvoiceAmount,
            currencyCode:    raw.InvoiceCurrencyCode,
            supplierName:    raw.SupplierName,
            paymentDueDate:  raw.PaymentDueDate,
          },
        }
      } catch (err) {
        return { erpRef, erpSystem: 'Oracle', status: 'unknown', details: { error: String(err) } }
      }
    }

    // ─── healthCheck ──────────────────────────────────────────────────────────

    async healthCheck(): Promise<ERPHealthResult> {
      const start = Date.now()
      try {
        await this.http.request({
          method:   'GET',
          path:     '/fscmRestApi/resources/11.13.18.05/supplierInvoices?limit=1',
          timeoutMs: 5_000,
        })
        return { connected: true, latencyMs: Date.now() - start, system: 'Oracle' }
      } catch (err) {
        return { connected: false, latencyMs: Date.now() - start, system: 'Oracle', message: String(err) }
      }
    }
  }

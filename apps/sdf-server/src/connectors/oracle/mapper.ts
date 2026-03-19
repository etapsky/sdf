// ─── Oracle Field Mappings ────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Maps SDF data.json fields to Oracle Fusion Cloud ERP fields.
//
// Oracle APIs used:
//   - Oracle Fusion AP: /fscmRestApi/resources/11.13.18.05/supplierInvoices
//   - Oracle Fusion SCM: /fscmRestApi/resources/11.13.18.05/purchaseOrders

import type { DocumentTypeMapping } from '../base/types.js'
import { formatMonetary, toOracleDate } from '../base/mapper.js'

// ─── Invoice mapping ──────────────────────────────────────────────────────────
// SDF invoice → Oracle AP (Accounts Payable) SupplierInvoice

export const ORACLE_INVOICE_MAPPING: DocumentTypeMapping = {
  documentType:  'invoice',
  erpObjectType: 'supplierInvoices',
  fields: [
    // Document header
    { from: 'invoice_number',    to: 'InvoiceNumber',         required: true },
    { from: 'issue_date',        to: 'InvoiceDate',           required: true,
      transform: toOracleDate },
    { from: 'due_date',          to: 'PaymentDueDate',        required: false,
      transform: (v) => v ? toOracleDate(v as string) : undefined },

    // Amounts
    { from: 'totals.gross',      to: 'InvoiceAmount',         required: true,
      transform: (v) => formatMonetary(v, false) },
    { from: 'totals.gross',      to: 'InvoiceCurrencyCode',   required: true,
      transform: (v) => (v as { currency?: string }).currency ?? '' },

    // Supplier (issuer)
    { from: 'issuer.name',       to: 'SupplierName',          required: true },
    { from: 'issuer.id',         to: 'SupplierNumber',        required: false },

    // Buyer (recipient)
    { from: 'recipient.name',    to: 'BusinessUnit',          required: false },

    // Matching
    { from: 'nomination_ref',    to: 'PONumber',              required: false },
    { from: 'payment.iban',      to: 'RemitToSupplierIBAN',   required: false },

    // Description
    { from: 'line_items.0.description', to: 'Description',   required: false },
  ],
}

// ─── Nomination mapping ───────────────────────────────────────────────────────
// SDF nomination → Oracle SCM PurchaseOrder / ScheduleAgreement

export const ORACLE_NOMINATION_MAPPING: DocumentTypeMapping = {
  documentType:  'nomination',
  erpObjectType: 'purchaseOrders',
  fields: [
    { from: 'nomination_number',  to: 'OrderNumber',          required: true },
    { from: 'issue_date',         to: 'OrderedDate',          required: true,
      transform: toOracleDate },
    { from: 'vessel.name',        to: 'ShipVesselName',       required: false },
    { from: 'vessel.imo',         to: 'ShipIMONumber',        required: false },
    { from: 'laycan.start',       to: 'ShipWindowStart',      required: true,
      transform: toOracleDate },
    { from: 'laycan.end',         to: 'ShipWindowEnd',        required: true,
      transform: toOracleDate },
    { from: 'port_of_loading.name',    to: 'LoadPort',        required: true },
    { from: 'port_of_discharge.name',  to: 'DischargePort',   required: true },
    { from: 'cargo.description',  to: 'ItemDescription',      required: true },
    { from: 'cargo.quantity',     to: 'OrderedQuantity',      required: true },
    { from: 'cargo.unit',         to: 'OrderedUOM',           required: false },
    { from: 'contract_ref',       to: 'ContractNumber',       required: false },
  ],
}

export const ORACLE_MAPPINGS: DocumentTypeMapping[] = [
  ORACLE_INVOICE_MAPPING,
  ORACLE_NOMINATION_MAPPING,
]
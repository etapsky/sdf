// ─── SAP Field Mappings ───────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Maps SDF data.json fields to SAP document fields.
// Based on SAP FI (Financial Accounting) and MM (Materials Management) modules.
//
// SAP APIs used:
//   - SAP S/4HANA OData API: /sap/opu/odata/sap/API_SUPPLIER_INVOICE_PROCESS_SRV
//   - SAP Fiori: SupplierInvoice, NominationItem

import type { DocumentTypeMapping } from '../base/types.js'
import { formatMonetary, toSAPDate } from '../base/mapper.js'

// ─── Invoice mapping ──────────────────────────────────────────────────────────
// SDF invoice → SAP SupplierInvoice (FI module)

export const SAP_INVOICE_MAPPING: DocumentTypeMapping = {
  documentType:  'invoice',
  erpObjectType: 'SupplierInvoice',
  fields: [
    // Document header
    { from: 'invoice_number',   to: 'InvoiceReceiptDate',    required: false },
    { from: 'issue_date',       to: 'DocumentDate',          required: true,
      transform: toSAPDate },
    { from: 'due_date',         to: 'PaymentDueDate',        required: false,
      transform: (v) => v ? toSAPDate(v as string) : undefined },

    // Amounts
    { from: 'totals.gross',     to: 'InvoiceGrossAmount',    required: true,
      transform: (v) => formatMonetary(v, false) },
    { from: 'totals.gross',     to: 'DocumentCurrency',      required: true,
      transform: (v) => (v as { currency?: string }).currency ?? '' },
    { from: 'totals.net',       to: 'InvoiceNetAmount',      required: false,
      transform: (v) => formatMonetary(v, false) },

    // Supplier (issuer)
    { from: 'issuer.name',      to: 'SupplierInvoicingPartyName', required: true },
    { from: 'issuer.id',        to: 'Supplier',              required: false },
    { from: 'issuer.vat_id',    to: 'SupplierVATRegistration', required: false },

    // Buyer (recipient)
    { from: 'recipient.name',   to: 'CompanyCode',           required: false },

    // Matching reference
    { from: 'nomination_ref',   to: 'PurchaseOrderReference', required: false },
    { from: 'payment.iban',     to: 'SupplierIBAN',          required: false },
    { from: 'payment.reference', to: 'PaymentReference',     required: false },
  ],
}

// ─── Nomination mapping ───────────────────────────────────────────────────────
// SDF nomination → SAP scheduling agreement line item (MM module)

export const SAP_NOMINATION_MAPPING: DocumentTypeMapping = {
  documentType:  'nomination',
  erpObjectType: 'NominationItem',
  fields: [
    { from: 'nomination_number', to: 'NominationNumber',     required: true },
    { from: 'issue_date',        to: 'NominationDate',       required: true,
      transform: toSAPDate },
    { from: 'vessel.name',       to: 'VesselName',           required: false },
    { from: 'vessel.imo',        to: 'IMONumber',            required: false },
    { from: 'laycan.start',      to: 'LaycanStart',          required: true,
      transform: toSAPDate },
    { from: 'laycan.end',        to: 'LaycanEnd',            required: true,
      transform: toSAPDate },
    { from: 'port_of_loading.name',   to: 'LoadingPort',     required: true },
    { from: 'port_of_discharge.name', to: 'DischargingPort', required: true },
    { from: 'cargo.description', to: 'MaterialDescription',  required: true },
    { from: 'cargo.quantity',    to: 'Quantity',             required: true },
    { from: 'cargo.unit',        to: 'QuantityUnit',         required: false },
    { from: 'contract_ref',      to: 'ContractNumber',       required: false },
  ],
}

export const SAP_MAPPINGS: DocumentTypeMapping[] = [
  SAP_INVOICE_MAPPING,
  SAP_NOMINATION_MAPPING,
]

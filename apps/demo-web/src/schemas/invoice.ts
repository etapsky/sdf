// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { DocTypeConfig } from '../types'

export const invoiceConfig: DocTypeConfig = {
  id:          'invoice',
  label:       'Invoice',
  description: 'Commercial invoice from supplier to buyer',
  scenario:    'B2B',

  issuer:      'Acme Supplies GmbH',
  issuerId:    'DE123456789',
  recipient:   'Global Logistics AG',
  recipientId: 'CH-123.456.789',
  schemaId:    'https://etapsky.github.io/sdf/schemas/invoice/v0.1.json',

  fields: [
    { key: 'invoice_number', label: 'Invoice number', type: 'text',   placeholder: 'INV-2026-001', required: true,  group: 'Invoice details', width: 'half' },
    { key: 'order_ref', label: 'Order ref', type: 'text',   placeholder: 'PO-2026-001',  required: false, group: 'Invoice details', width: 'half' },
    { key: 'issue_date',     label: 'Issue date',     type: 'date',                                 required: true,  group: 'Invoice details', width: 'half' },
    { key: 'due_date',       label: 'Due date',       type: 'date',                                 required: false, group: 'Invoice details', width: 'half' },

    { key: 'issuer_name',    label: 'Supplier name',  type: 'text',   placeholder: 'Acme Supplies GmbH', required: true, group: 'Supplier' },
    { key: 'issuer_id',      label: 'Supplier VAT ID',type: 'text',   placeholder: 'DE123456789',   required: false, group: 'Supplier', width: 'half' },
    { key: 'issuer_street',  label: 'Street',         type: 'text',   placeholder: 'Hauptstraße 12',required: false, group: 'Supplier', width: 'half' },
    { key: 'issuer_city',    label: 'City',           type: 'text',   placeholder: 'Berlin',        required: false, group: 'Supplier', width: 'half' },
    { key: 'issuer_country', label: 'Country code',   type: 'text',   placeholder: 'DE',            required: false, group: 'Supplier', width: 'half' },

    { key: 'recipient_name',   label: 'Buyer name',   type: 'text',   placeholder: 'Global Logistics AG', required: true, group: 'Buyer' },
    { key: 'recipient_id',     label: 'Buyer VAT ID', type: 'text',   placeholder: 'CH-123.456.789',required: false, group: 'Buyer', width: 'half' },
    { key: 'recipient_city',   label: 'City',         type: 'text',   placeholder: 'Zürich',        required: false, group: 'Buyer', width: 'half' },
    { key: 'recipient_country',label: 'Country code', type: 'text',   placeholder: 'CH',            required: false, group: 'Buyer', width: 'half' },

    { key: 'item_description', label: 'Item description', type: 'text',   placeholder: 'Industrial valve Type-A', required: true, group: 'Line item' },
    { key: 'item_quantity',    label: 'Quantity',          type: 'number', placeholder: '50',             required: true, group: 'Line item', width: 'half' },
    { key: 'item_unit',        label: 'Unit',              type: 'text',   placeholder: 'pcs',            required: false, group: 'Line item', width: 'half' },
    { key: 'item_unit_price',  label: 'Unit price',        type: 'money',  placeholder: '24.00',          required: true, group: 'Line item', width: 'half' },
    { key: 'item_currency',    label: 'Currency',          type: 'text',   placeholder: 'EUR',            required: true, group: 'Line item', width: 'half' },
    { key: 'item_vat_rate',    label: 'VAT rate',          type: 'text',   placeholder: '0.19',           required: false, group: 'Line item' },

    { key: 'payment_iban',   label: 'IBAN',            type: 'text',   placeholder: 'DE89370400440532013000', required: false, group: 'Payment', width: 'half' },
    { key: 'payment_bic',    label: 'BIC',             type: 'text',   placeholder: 'COBADEFFXXX',    required: false, group: 'Payment', width: 'half' },
  ],

  buildData: (v) => {
    const qty      = parseFloat(v.item_quantity  || '0')
    const price    = parseFloat(v.item_unit_price || '0')
    const vatRate  = parseFloat(v.item_vat_rate   || '0')
    const currency = v.item_currency || 'EUR'
    const subtotal = qty * price
    const net      = subtotal
    const vat      = net * vatRate
    const gross    = net + vat

    const fmt = (n: number) => n.toFixed(2)
    const money = (amount: number) => ({ amount: fmt(amount), currency })

    const data: Record<string, unknown> = {
      document_type:  'invoice',
      invoice_number: v.invoice_number || 'INV-2026-001',
      issue_date:     v.issue_date     || new Date().toISOString().slice(0, 10),
    }

    if (v.due_date)    data.due_date    = v.due_date
    if (v.order_ref)   data.order_ref   = v.order_ref

    data.issuer = {
      name: v.issuer_name || 'Issuer',
      ...(v.issuer_id && { id: v.issuer_id }),
      ...(v.issuer_city && { address: {
        ...(v.issuer_street && { street: v.issuer_street }),
        city:    v.issuer_city,
        country: v.issuer_country || 'DE',
      }}),
    }

    data.recipient = {
      name: v.recipient_name || 'Recipient',
      ...(v.recipient_id && { id: v.recipient_id }),
      ...(v.recipient_city && { address: {
        city:    v.recipient_city,
        country: v.recipient_country || 'CH',
      }}),
    }

    data.line_items = [{
      description: v.item_description || 'Item',
      quantity:    qty,
      ...(v.item_unit && { unit: v.item_unit }),
      unit_price:  money(price),
      ...(v.item_vat_rate && { vat_rate: v.item_vat_rate }),
      subtotal:    money(subtotal),
    }]

    data.totals = {
      net:   money(net),
      ...(vatRate > 0 && { vat: money(vat) }),
      gross: money(gross),
    }

    if (v.payment_iban || v.payment_bic) {
      data.payment = {
        ...(v.payment_iban && { iban: v.payment_iban }),
        ...(v.payment_bic  && { bic:  v.payment_bic  }),
        reference: v.invoice_number || 'INV-2026-001',
      }
    }

    return data
  },

  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://etapsky.github.io/sdf/schemas/invoice/v0.1.json',
    title: 'SDF Invoice',
    type: 'object',
    required: ['document_type', 'invoice_number', 'issue_date', 'issuer', 'recipient', 'line_items', 'totals'],
    properties: {
      document_type:  { type: 'string', const: 'invoice' },
      invoice_number: { type: 'string' },
      issue_date:     { type: 'string', format: 'date' },
      due_date:       { type: 'string', format: 'date' },
      order_ref: { type: 'string' },
      issuer:         { type: 'object', required: ['name'], properties: { name: { type: 'string' }, id: { type: 'string' }, address: { type: 'object' } }, additionalProperties: true },
      recipient:      { type: 'object', required: ['name'], properties: { name: { type: 'string' }, id: { type: 'string' }, address: { type: 'object' } }, additionalProperties: true },
      line_items:     { type: 'array', minItems: 1, items: { type: 'object' } },
      totals:         { type: 'object', required: ['gross'], properties: { net: { type: 'object' }, vat: { type: 'object' }, gross: { type: 'object' } } },
      payment:        { type: 'object' },
    },
    additionalProperties: false,
  },
}

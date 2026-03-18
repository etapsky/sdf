// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { DocTypeConfig } from '../types'

export const purchaseOrderConfig: DocTypeConfig = {
  id:          'purchase-order',
  label:       'Purchase Order',
  description: 'Purchase order from buyer to supplier — ready for future PO–Invoice matching',
  scenario:    'B2B',

  issuer:      'Global Logistics AG',
  issuerId:    'CH-123.456.789',
  recipient:   'Acme Supplies GmbH',
  recipientId: 'DE123456789',
  schemaId:    'https://etapsky.github.io/sdf/schemas/purchase-order/v0.1.json',

  fields: [
    { key: 'po_number',      label: 'PO number',     type: 'text',   placeholder: 'PO-2026-00388', required: true,  group: 'PO details' },
    { key: 'issue_date',     label: 'Issue date',     type: 'date',                                required: true,  group: 'PO details' },
    { key: 'delivery_date',  label: 'Delivery date', type: 'date',                                required: false, group: 'PO details' },
    { key: 'payment_terms',  label: 'Payment terms', type: 'text',   placeholder: 'Net 30',       required: false, group: 'PO details' },

    { key: 'buyer_name',     label: 'Buyer name',    type: 'text',   placeholder: 'Global Logistics AG', required: true, group: 'Buyer' },
    { key: 'buyer_id',       label: 'Buyer VAT ID', type: 'text',   placeholder: 'CH-123.456.789',required: false, group: 'Buyer' },
    { key: 'buyer_street',   label: 'Street',        type: 'text',   placeholder: 'Bahnhofstrasse 4', required: false, group: 'Buyer' },
    { key: 'buyer_city',     label: 'City',          type: 'text',   placeholder: 'Zürich',        required: false, group: 'Buyer' },
    { key: 'buyer_country',  label: 'Country code',  type: 'text',   placeholder: 'CH',            required: false, group: 'Buyer' },

    { key: 'supplier_name',  label: 'Supplier name', type: 'text',   placeholder: 'Acme Supplies GmbH', required: true, group: 'Supplier' },
    { key: 'supplier_id',    label: 'Supplier VAT ID', type: 'text', placeholder: 'DE123456789',   required: false, group: 'Supplier' },
    { key: 'supplier_street',label: 'Street',        type: 'text',   placeholder: 'Hauptstraße 12', required: false, group: 'Supplier' },
    { key: 'supplier_city',  label: 'City',          type: 'text',   placeholder: 'Berlin',        required: false, group: 'Supplier' },
    { key: 'supplier_country', label: 'Country code', type: 'text',  placeholder: 'DE',            required: false, group: 'Supplier' },

    { key: 'item_description', label: 'Item description', type: 'text',   placeholder: 'Industrial valve Type-A', required: true, group: 'Line item' },
    { key: 'item_sku',         label: 'SKU',              type: 'text',   placeholder: 'VALVE-TYPE-A',          required: false, group: 'Line item' },
    { key: 'item_quantity',    label: 'Quantity',          type: 'number', placeholder: '50',             required: true, group: 'Line item' },
    { key: 'item_unit',        label: 'Unit',              type: 'text',   placeholder: 'pcs',            required: false, group: 'Line item' },
    { key: 'item_unit_price',  label: 'Unit price',        type: 'money',  placeholder: '24.00',          required: true, group: 'Line item' },
    { key: 'item_currency',    label: 'Currency',          type: 'text',   placeholder: 'EUR',            required: true, group: 'Line item' },
    { key: 'item_vat_rate',    label: 'VAT rate',          type: 'text',   placeholder: '0.19',           required: false, group: 'Line item' },
  ],

  buildData: (v) => {
    const qty      = parseFloat(v.item_quantity  || '0')
    const price    = parseFloat(v.item_unit_price || '0')
    const vatRate  = parseFloat(v.item_vat_rate   || '0')
    const currency = v.item_currency || 'EUR'
    const subtotal = qty * price
    const net      = subtotal
    const vat      = net * vatRate
    const gross   = net + vat

    const fmt = (n: number) => n.toFixed(2)
    const money = (amount: number) => ({ amount: fmt(amount), currency })

    const data: Record<string, unknown> = {
      document_type: 'purchase_order',
      po_number:     v.po_number || 'PO-2026-00388',
      issue_date:    v.issue_date || new Date().toISOString().slice(0, 10),
    }

    if (v.delivery_date)   data.delivery_date  = v.delivery_date
    if (v.payment_terms)   data.payment_terms  = v.payment_terms

    data.buyer = {
      name: v.buyer_name || 'Buyer',
      ...(v.buyer_id && { id: v.buyer_id }),
      ...(v.buyer_city && { address: {
        ...(v.buyer_street && { street: v.buyer_street }),
        city:    v.buyer_city,
        country: v.buyer_country || 'CH',
      }}),
    }

    data.supplier = {
      name: v.supplier_name || 'Supplier',
      ...(v.supplier_id && { id: v.supplier_id }),
      ...(v.supplier_city && { address: {
        ...(v.supplier_street && { street: v.supplier_street }),
        city:    v.supplier_city,
        country: v.supplier_country || 'DE',
      }}),
    }

    data.line_items = [{
      line_number: 1,
      ...(v.item_sku && { sku: v.item_sku }),
      description: v.item_description || 'Item',
      quantity:    qty,
      ...(v.item_unit && { unit: v.item_unit }),
      unit_price:  money(price),
      subtotal:    money(subtotal),
    }]

    data.totals = {
      net:   money(net),
      ...(vatRate > 0 && { vat: money(vat) }),
      gross: money(gross),
    }

    return data
  },

  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://etapsky.github.io/sdf/schemas/purchase-order/v0.1.json',
    title: 'SDF Purchase Order',
    type: 'object',
    required: ['document_type', 'po_number', 'issue_date', 'buyer', 'supplier', 'line_items', 'totals'],
    properties: {
      document_type:  { type: 'string', const: 'purchase_order' },
      po_number:      { type: 'string' },
      issue_date:     { type: 'string', format: 'date' },
      delivery_date:  { type: 'string', format: 'date' },
      payment_terms:  { type: 'string' },
      buyer:          { type: 'object', required: ['name'], properties: { name: { type: 'string' }, id: { type: 'string' }, address: { type: 'object' } }, additionalProperties: true },
      supplier:       { type: 'object', required: ['name'], properties: { name: { type: 'string' }, id: { type: 'string' }, address: { type: 'object' } }, additionalProperties: true },
      line_items:     { type: 'array', minItems: 1, items: { type: 'object' } },
      totals:         { type: 'object', required: ['gross'], properties: { net: { type: 'object' }, vat: { type: 'object' }, gross: { type: 'object' } } },
    },
    additionalProperties: false,
  },
}

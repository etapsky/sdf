import type { DocTypeConfig } from '../types'

// Sample data from spec/examples/gov-customs-declaration (POC reference)
const SAMPLE_DATA: Record<string, unknown> = {
  document_type: 'gov_customs_declaration',
  declaration_number: 'SFCA-2026-IMP-004471',
  declaration_type: 'import',
  declaration_date: '2026-03-14',
  invoice_ref: 'INV-2026-00142',
  declarant: {
    name: 'Global Logistics AG',
    id: 'CHE-123.456.789',
    role: 'importer_of_record',
    address: { street: 'Bahnhofstrasse 4', city: 'Zürich', postal_code: '8001', country: 'CH' },
    contact: { name: 'Thomas Meier', email: 't.meier@global-logistics.ch', phone: '+41 44 000 0000' },
  },
  importer: {
    name: 'Global Logistics AG',
    id: 'CHE-123.456.789',
    address: { street: 'Bahnhofstrasse 4', city: 'Zürich', postal_code: '8001', country: 'CH' },
  },
  exporter: {
    name: 'Acme Supplies GmbH',
    id: 'DE123456789',
    address: { street: 'Hauptstraße 12', city: 'Berlin', postal_code: '10115', country: 'DE' },
  },
  customs_office: {
    name: 'Swiss Federal Customs Administration — Basel',
    id: 'CH003100',
    address: { street: 'Pfeffingerstrasse 1', city: 'Basel', postal_code: '4002', country: 'CH' },
  },
  transport: {
    mode: 'road',
    vehicle_id: 'DE-B-AC-1234',
    country_of_departure: 'DE',
    country_of_destination: 'CH',
  },
  goods: [
    {
      line_number: 1,
      description: 'Industrial valve Type-A',
      hs_code: '8481.80.39',
      country_of_origin: 'DE',
      quantity: 50,
      unit: 'pcs',
      gross_weight_kg: '62.50',
      customs_value: { amount: '1200.00', currency: 'EUR' },
      duty_rate: '0.017',
      duty_amount: { amount: '20.40', currency: 'EUR' },
    },
    {
      line_number: 2,
      description: 'Gasket set Type-A compatible',
      hs_code: '8484.10.00',
      country_of_origin: 'DE',
      quantity: 50,
      unit: 'pcs',
      gross_weight_kg: '5.00',
      customs_value: { amount: '240.00', currency: 'EUR' },
      duty_rate: '0.00',
      duty_amount: { amount: '0.00', currency: 'EUR' },
    },
  ],
  totals: {
    customs_value: { amount: '1440.00', currency: 'EUR' },
    total_duty: { amount: '20.40', currency: 'EUR' },
    vat_base: { amount: '1460.40', currency: 'EUR' },
    vat_amount: { amount: '113.91', currency: 'EUR' },
  },
}

export const govCustomsDeclarationConfig: DocTypeConfig = {
  id:          'gov-customs-declaration',
  label:       'Customs Declaration',
  description: 'Government customs declaration — import example',
  scenario:    'B2G',

  issuer:      'Global Logistics AG',
  issuerId:    'CHE-123.456.789',
  recipient:   'Swiss Federal Customs Administration',
  recipientId: 'CH003100',
  schemaId:    'https://etapsky.github.io/sdf/schemas/gov-customs-declaration/v0.1.json',
  documentType: 'gov_customs_declaration',

  fields: [
    { key: 'declaration_number', label: 'Declaration number (optional)', type: 'text', placeholder: 'SFCA-2026-IMP-004471', required: false, group: 'Customise' },
  ],

  buildData: (v) => {
    const data = { ...SAMPLE_DATA } as Record<string, unknown>
    if (v.declaration_number) data.declaration_number = v.declaration_number
    return data
  },

  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://etapsky.github.io/sdf/schemas/gov-customs-declaration/v0.1.json',
    title: 'SDF Government Customs Declaration',
    type: 'object',
    required: ['document_type', 'declaration_number', 'declaration_type', 'declaration_date', 'declarant', 'importer', 'exporter', 'customs_office', 'goods', 'totals'],
    properties: {
      document_type:      { type: 'string', const: 'gov_customs_declaration' },
      declaration_number: { type: 'string' },
      declaration_type:   { type: 'string' },
      declaration_date:   { type: 'string', format: 'date' },
      declarant:          { type: 'object' },
      importer:           { type: 'object' },
      exporter:           { type: 'object' },
      customs_office:     { type: 'object' },
      transport:          { type: 'object' },
      goods:              { type: 'array' },
      totals:             { type: 'object' },
    },
    additionalProperties: true,
  },
}

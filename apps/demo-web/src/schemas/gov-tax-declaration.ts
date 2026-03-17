import type { DocTypeConfig } from '../types'

// Sample data from spec/examples/gov-tax-declaration (POC reference)
const SAMPLE_DATA: Record<string, unknown> = {
  document_type: 'gov_tax_declaration',
  declaration_type: 'corporate_income_tax',
  tax_year: '2025',
  period: '2025-01-01/2025-12-31',
  declaration_date: '2026-03-31',
  taxpayer: {
    name: 'Global Logistics AG',
    id: 'CHE-123.456.789',
    legal_form: 'AG',
    address: { street: 'Bahnhofstrasse 4', city: 'Zürich', postal_code: '8001', country: 'CH' },
    contact: { name: 'Thomas Meier', email: 't.meier@global-logistics.ch', phone: '+41 44 000 0000' },
  },
  tax_authority: {
    name: 'Swiss Federal Tax Administration',
    id: 'CHE-SFTA',
    address: { street: 'Eigerstrasse 65', city: 'Bern', postal_code: '3003', country: 'CH' },
  },
  financials: {
    revenue: { amount: '12500000.00', currency: 'CHF' },
    cost_of_goods: { amount: '8200000.00', currency: 'CHF' },
    gross_profit: { amount: '4300000.00', currency: 'CHF' },
    operating_expenses: { amount: '2100000.00', currency: 'CHF' },
    operating_income: { amount: '2200000.00', currency: 'CHF' },
    taxable_income: { amount: '2200000.00', currency: 'CHF' },
    tax_rate: '0.1485',
    tax_due: { amount: '326700.00', currency: 'CHF' },
    tax_prepaid: { amount: '300000.00', currency: 'CHF' },
    tax_balance: { amount: '26700.00', currency: 'CHF' },
  },
  preparer: {
    name: 'Zürich Tax Advisors AG',
    id: 'CHE-999.888.777',
    contact: { name: 'Dr. Anna Schweizer', email: 'a.schweizer@zta.ch' },
  },
  declaration_ref: 'SFTA-2026-GL-00842',
}

export const govTaxDeclarationConfig: DocTypeConfig = {
  id:          'gov-tax-declaration',
  label:       'Tax Declaration',
  description: 'Government tax declaration — corporate income tax example',
  scenario:    'B2G',

  issuer:      'Global Logistics AG',
  issuerId:    'CHE-123.456.789',
  recipient:   'Swiss Federal Tax Administration',
  recipientId: 'CHE-SFTA',
  schemaId:    'https://etapsky.github.io/sdf/schemas/gov-tax-declaration/v0.1.json',
  documentType: 'gov_tax_declaration',

  fields: [
    { key: 'declaration_ref', label: 'Declaration ref (optional)', type: 'text', placeholder: 'SFTA-2026-GL-00842', required: false, group: 'Customise' },
  ],

  buildData: (v) => {
    const data = { ...SAMPLE_DATA } as Record<string, unknown>
    if (v.declaration_ref) data.declaration_ref = v.declaration_ref
    return data
  },

  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://etapsky.github.io/sdf/schemas/gov-tax-declaration/v0.1.json',
    title: 'SDF Government Tax Declaration',
    type: 'object',
    required: ['document_type', 'declaration_type', 'tax_year', 'period', 'declaration_date', 'taxpayer', 'tax_authority', 'financials'],
    properties: {
      document_type:    { type: 'string', const: 'gov_tax_declaration' },
      declaration_type: { type: 'string' },
      tax_year:         { type: 'string' },
      period:           { type: 'string' },
      declaration_date: { type: 'string', format: 'date' },
      taxpayer:         { type: 'object' },
      tax_authority:    { type: 'object' },
      financials:       { type: 'object' },
      preparer:         { type: 'object' },
      declaration_ref:  { type: 'string' },
    },
    additionalProperties: true,
  },
}

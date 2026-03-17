import type { DocTypeConfig } from '../types'

// Sample data from spec/examples/gov-health-report (POC reference)
const SAMPLE_DATA: Record<string, unknown> = {
  document_type: 'gov_health_report',
  report_type: 'notifiable_disease',
  report_number: 'FOPH-2026-ND-004812',
  reporting_period: '2026-03-08/2026-03-14',
  report_date: '2026-03-15',
  reporter: {
    name: 'Universitätsspital Basel',
    id: 'CH-BS-USB-0001',
    facility_type: 'hospital',
    address: { street: 'Spitalstrasse 21', city: 'Basel', postal_code: '4031', country: 'CH' },
    contact: { name: 'Dr. med. Claudia Hartmann', role: 'Infection Control Officer', email: 'c.hartmann@usb.ch', phone: '+41 61 265 25 25' },
  },
  authority: {
    name: 'Swiss Federal Office of Public Health',
    id: 'CHE-FOPH',
    division: 'Communicable Diseases Division',
    address: { street: 'Schwarzenburgstrasse 157', city: 'Bern', postal_code: '3003', country: 'CH' },
  },
  disease: {
    name: 'Influenza',
    icd10_code: 'J11',
    pathogen: 'Influenza A (H3N2)',
    notification_category: 'mandatory_within_24h',
    outbreak_suspected: false,
  },
  laboratory: {
    name: 'Labor Dr. Risch Ostschweiz AG',
    id: 'CH-LAB-RISCH-01',
    confirmation_method: 'PCR',
    confirmation_date: '2026-03-12',
    contact: { name: 'Dr. Peter Risch', email: 'p.risch@labor-risch.ch' },
  },
  cases: [
    {
      case_ref: 'USB-2026-INF-0041',
      age_group: '45-54',
      sex: 'female',
      outcome: 'recovered',
      onset_date: '2026-03-08',
      diagnosis_date: '2026-03-10',
      hospitalised: true,
      icu_admission: false,
      vaccination_status: 'vaccinated',
      vaccination_doses: 2,
      last_vaccination_date: '2025-10-15',
      country_of_exposure: 'CH',
      region_of_exposure: 'BS',
    },
    {
      case_ref: 'USB-2026-INF-0042',
      age_group: '75+',
      sex: 'male',
      outcome: 'recovered',
      onset_date: '2026-03-09',
      diagnosis_date: '2026-03-11',
      hospitalised: true,
      icu_admission: true,
      vaccination_status: 'vaccinated',
      vaccination_doses: 3,
      last_vaccination_date: '2025-10-20',
      country_of_exposure: 'CH',
      region_of_exposure: 'BS',
    },
    {
      case_ref: 'USB-2026-INF-0043',
      age_group: '25-34',
      sex: 'male',
      outcome: 'recovered',
      onset_date: '2026-03-11',
      diagnosis_date: '2026-03-13',
      hospitalised: false,
      icu_admission: false,
      vaccination_status: 'unvaccinated',
      country_of_exposure: 'CH',
      region_of_exposure: 'BS',
    },
  ],
  summary: {
    total_cases: 3,
    hospitalised: 2,
    icu_admissions: 1,
    deaths: 0,
    recovered: 3,
  },
  declaration: {
    text: 'I declare that the information provided in this report is accurate and complete to the best of my knowledge, and that this report is submitted in compliance with the Swiss Epidemics Act (EpG) and the applicable cantonal reporting obligations.',
    signatory: 'Dr. med. Claudia Hartmann',
    signatory_role: 'Infection Control Officer',
    signatory_id: 'CH-MED-GLN-7601000000001',
    date: '2026-03-15',
  },
}

export const govHealthReportConfig: DocTypeConfig = {
  id:          'gov-health-report',
  label:       'Health Report',
  description: 'Government health report — notifiable disease example',
  scenario:    'G2G',

  issuer:      'Universitätsspital Basel',
  issuerId:    'CH-BS-USB-0001',
  recipient:   'Swiss Federal Office of Public Health',
  recipientId: 'CHE-FOPH',
  schemaId:    'https://etapsky.github.io/sdf/schemas/gov-health-report/v0.1.json',
  documentType: 'gov_health_report',

  fields: [
    { key: 'report_number', label: 'Report number (optional)', type: 'text', placeholder: 'FOPH-2026-ND-004812', required: false, group: 'Customise' },
  ],

  buildData: (v) => {
    const data = JSON.parse(JSON.stringify(SAMPLE_DATA)) as Record<string, unknown>
    if (v.report_number) data.report_number = v.report_number
    return data
  },

  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://etapsky.github.io/sdf/schemas/gov-health-report/v0.1.json',
    title: 'SDF Government Health Report',
    type: 'object',
    required: ['document_type', 'report_type', 'report_number', 'reporting_period', 'report_date', 'reporter', 'authority', 'disease', 'cases', 'summary', 'declaration'],
    properties: {
      document_type:    { type: 'string', const: 'gov_health_report' },
      report_type:      { type: 'string' },
      report_number:    { type: 'string' },
      reporting_period: { type: 'string' },
      report_date:      { type: 'string', format: 'date' },
      reporter:         { type: 'object' },
      authority:        { type: 'object' },
      disease:          { type: 'object' },
      laboratory:       { type: 'object' },
      cases:            { type: 'array' },
      summary:          { type: 'object' },
      declaration:      { type: 'object' },
    },
    additionalProperties: true,
  },
}

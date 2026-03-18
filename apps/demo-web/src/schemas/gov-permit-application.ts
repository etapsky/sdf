// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { DocTypeConfig } from '../types'

// Sample data from spec/examples/gov-permit-application (POC reference)
const SAMPLE_DATA: Record<string, unknown> = {
  document_type: 'gov_permit_application',
  permit_type: 'construction_permit',
  application_number: 'BS-BPD-2026-00318',
  application_date: '2026-03-05',
  applicant: {
    name: 'Global Logistics AG',
    id: 'CHE-123.456.789',
    legal_form: 'AG',
    address: { street: 'Bahnhofstrasse 4', city: 'Zürich', postal_code: '8001', country: 'CH' },
    contact: { name: 'Thomas Meier', email: 't.meier@global-logistics.ch', phone: '+41 44 000 0000' },
  },
  architect: {
    name: 'Müller & Partner Architekten AG',
    id: 'CHE-555.444.333',
    license_number: 'CH-ARCH-2019-4471',
    contact: { name: 'Dipl. Arch. Sara Müller', email: 's.mueller@mpa.ch', phone: '+41 61 000 0001' },
  },
  authority: {
    name: 'City of Basel — Building and Planning Department',
    id: 'CH-BS-BPD',
    address: { street: 'Spiegelgasse 6', city: 'Basel', postal_code: '4051', country: 'CH' },
  },
  project: {
    title: 'Construction of distribution warehouse — Basel Werkstrasse',
    description: 'New single-storey distribution warehouse with loading dock, office annex, and external parking. Total floor area 3,200 m².',
    location: {
      street: 'Werkstrasse 9',
      city: 'Basel',
      postal_code: '4052',
      country: 'CH',
      parcel_id: 'BS-4052-GBB-2209',
      coordinates: { latitude: '47.5430', longitude: '7.5886' },
    },
    zone: 'industrial',
    construction_type: 'new_build',
    estimated_start: '2026-07-01',
    estimated_completion: '2027-03-31',
    estimated_cost: { amount: '4200000.00', currency: 'CHF' },
    floor_area_m2: '3200',
    height_m: '8.5',
    floors_above_ground: 1,
    floors_below_ground: 0,
    parking_spaces: 24,
  },
  documents_ref: [
    { type: 'site_plan', title: 'Site plan 1:500', ref: 'DOC-2026-SP-001' },
    { type: 'floor_plan', title: 'Floor plan 1:100', ref: 'DOC-2026-FP-001' },
    { type: 'elevation_drawing', title: 'Elevations north and south 1:100', ref: 'DOC-2026-EL-001' },
    { type: 'structural_report', title: 'Structural engineering report', ref: 'DOC-2026-SR-001' },
    { type: 'environmental_assessment', title: 'Environmental impact pre-assessment', ref: 'DOC-2026-EA-001' },
  ],
  declaration: {
    text: 'The applicant declares that all information provided is accurate and complete to the best of their knowledge. The applicant accepts responsibility for compliance with all applicable building regulations and cantonal planning laws.',
    signatory: 'Thomas Meier',
    signatory_role: 'Director',
    date: '2026-03-05',
  },
}

export const govPermitApplicationConfig: DocTypeConfig = {
  id:          'gov-permit-application',
  label:       'Permit Application',
  description: 'Government permit application — construction permit example',
  scenario:    'B2G',

  issuer:      'Global Logistics AG',
  issuerId:    'CHE-123.456.789',
  recipient:   'City of Basel — Building and Planning Department',
  recipientId: 'CH-BS-BPD',
  schemaId:    'https://etapsky.github.io/sdf/schemas/gov-permit-application/v0.1.json',
  documentType: 'gov_permit_application',

  fields: [
    { key: 'application_number', label: 'Application number (optional)', type: 'text', placeholder: 'BS-BPD-2026-00318', required: false, group: 'Customise' },
  ],

  buildData: (v) => {
    const data = JSON.parse(JSON.stringify(SAMPLE_DATA)) as Record<string, unknown>
    if (v.application_number) data.application_number = v.application_number
    return data
  },

  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://etapsky.github.io/sdf/schemas/gov-permit-application/v0.1.json',
    title: 'SDF Government Permit Application',
    type: 'object',
    required: ['document_type', 'permit_type', 'application_number', 'application_date', 'applicant', 'authority', 'project', 'declaration'],
    properties: {
      document_type:      { type: 'string', const: 'gov_permit_application' },
      permit_type:        { type: 'string' },
      application_number: { type: 'string' },
      application_date:   { type: 'string', format: 'date' },
      applicant:          { type: 'object' },
      architect:          { type: 'object' },
      authority:          { type: 'object' },
      project:            { type: 'object' },
      documents_ref:      { type: 'array' },
      declaration:        { type: 'object' },
    },
    additionalProperties: true,
  },
}

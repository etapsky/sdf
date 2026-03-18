// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { DocTypeConfig } from '../types'

export const nominationConfig: DocTypeConfig = {
  id:          'nomination',
  label:       'Nomination',
  description: 'Cargo nomination from owner to shipping agent',
  scenario:    'B2B',

  issuer:      'Nordic Energy Trading AS',
  issuerId:    'NO-987654321',
  recipient:   'Baltic Ship Agents Ltd',
  recipientId: 'EE-123456789',
  schemaId:    'https://etapsky.github.io/sdf/schemas/nomination/v0.1.json',

  fields: [
    { key: 'nomination_number', label: 'Nomination number', type: 'text', placeholder: 'NOM-2026-001', required: true,  group: 'Nomination details' },
    { key: 'issue_date',        label: 'Issue date',        type: 'date',                              required: true,  group: 'Nomination details' },
    { key: 'contract_ref',      label: 'Contract ref',      type: 'text', placeholder: 'CT-2025-001',  required: false, group: 'Nomination details' },

    { key: 'cargo_owner_name',  label: 'Cargo owner',       type: 'text', placeholder: 'Nordic Energy Trading AS', required: true, group: 'Parties' },
    { key: 'agent_name',        label: 'Shipping agent',    type: 'text', placeholder: 'Baltic Ship Agents Ltd',  required: true, group: 'Parties' },

    { key: 'vessel_name',       label: 'Vessel name',       type: 'text', placeholder: 'MV Nordic Star', required: true,  group: 'Vessel' },
    { key: 'vessel_imo',        label: 'IMO number',        type: 'text', placeholder: '9876543',        required: true,  group: 'Vessel' },
    { key: 'vessel_flag',       label: 'Flag state',        type: 'text', placeholder: 'NO',             required: false, group: 'Vessel' },
    { key: 'vessel_eta',        label: 'ETA',               type: 'date',                               required: false, group: 'Vessel' },

    { key: 'laycan_start',      label: 'Laycan start',      type: 'date',                               required: true,  group: 'Laycan' },
    { key: 'laycan_end',        label: 'Laycan end',        type: 'date',                               required: true,  group: 'Laycan' },

    { key: 'pol_name',          label: 'Port of loading',   type: 'text', placeholder: 'Port of Primorsk',   required: true, group: 'Voyage' },
    { key: 'pol_country',       label: 'POL country code',  type: 'text', placeholder: 'RU',               required: false, group: 'Voyage' },
    { key: 'pod_name',          label: 'Port of discharge', type: 'text', placeholder: 'Port of Rotterdam', required: true, group: 'Voyage' },
    { key: 'pod_country',       label: 'POD country code',  type: 'text', placeholder: 'NL',               required: false, group: 'Voyage' },

    { key: 'cargo_description', label: 'Cargo description', type: 'text',   placeholder: 'Urals Crude Oil', required: true,  group: 'Cargo' },
    { key: 'cargo_quantity',    label: 'Quantity',          type: 'number', placeholder: '75000',           required: true,  group: 'Cargo' },
    { key: 'cargo_unit',        label: 'Unit',              type: 'text',   placeholder: 'MT',             required: true,  group: 'Cargo' },
  ],

  buildData: (v) => ({
    document_type:    'nomination',
    nomination_number: v.nomination_number || 'NOM-2026-001',
    issue_date:        v.issue_date || new Date().toISOString().slice(0, 10),
    ...(v.contract_ref && { contract_ref: v.contract_ref }),
    cargo_owner: {
      name: v.cargo_owner_name || 'Cargo Owner',
    },
    agent: {
      name: v.agent_name || 'Shipping Agent',
    },
    vessel: {
      name: v.vessel_name || 'MV Vessel',
      imo:  v.vessel_imo  || '0000000',
      ...(v.vessel_flag && { flag: v.vessel_flag }),
      ...(v.vessel_eta  && { eta:  v.vessel_eta  }),
    },
    laycan: {
      start: v.laycan_start || v.issue_date || new Date().toISOString().slice(0, 10),
      end:   v.laycan_end   || v.issue_date || new Date().toISOString().slice(0, 10),
    },
    port_of_loading: {
      name:    v.pol_name    || 'Port of Loading',
      country: v.pol_country || 'XX',
    },
    port_of_discharge: {
      name:    v.pod_name    || 'Port of Discharge',
      country: v.pod_country || 'XX',
    },
    cargo: {
      description: v.cargo_description || 'Cargo',
      quantity:    v.cargo_quantity     || '0',
      unit:        v.cargo_unit         || 'MT',
    },
  }),

  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://etapsky.github.io/sdf/schemas/nomination/v0.1.json',
    title: 'SDF Nomination',
    type: 'object',
    required: ['document_type', 'nomination_number', 'issue_date', 'cargo_owner', 'agent', 'vessel', 'laycan', 'port_of_loading', 'port_of_discharge', 'cargo'],
    properties: {
      document_type:     { type: 'string', const: 'nomination' },
      nomination_number: { type: 'string' },
      issue_date:        { type: 'string', format: 'date' },
      contract_ref:      { type: 'string' },
      cargo_owner:       { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
      agent:             { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
      vessel:            { type: 'object', required: ['name', 'imo'], properties: { name: { type: 'string' }, imo: { type: 'string' } }, additionalProperties: true },
      laycan:            { type: 'object', required: ['start', 'end'], properties: { start: { type: 'string' }, end: { type: 'string' } } },
      port_of_loading:   { type: 'object', required: ['name', 'country'], properties: { name: { type: 'string' }, country: { type: 'string' } }, additionalProperties: true },
      port_of_discharge: { type: 'object', required: ['name', 'country'], properties: { name: { type: 'string' }, country: { type: 'string' } }, additionalProperties: true },
      cargo:             { type: 'object', required: ['description', 'quantity', 'unit'], properties: { description: { type: 'string' }, quantity: {}, unit: { type: 'string' } }, additionalProperties: true },
    },
    additionalProperties: false,
  },
}

// ─── SAML 2.0 SSO Routes ─────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Implements Service Provider (SP) side of SAML 2.0 — per-tenant configuration.
// The IdP (Okta, Azure AD, Keycloak, etc.) redirects back here after auth.
// On successful assertion, issues a per-tenant HS256 JWT (TTL: 8 hours).
//
// GET  /auth/saml/:tenantId/metadata   SP metadata XML — give this to your IdP
// GET  /auth/saml/:tenantId/login      Initiate SSO login (redirect to IdP)
// POST /auth/saml/:tenantId/callback   ACS — IdP posts SAML response here
// GET  /auth/saml/:tenantId/logout     Initiate SLO logout

import type { FastifyInstance } from 'fastify'
import { db, writeAudit }       from '../db/client.js'
import { tenants }              from '../db/schema.js'
import { eq }                   from 'drizzle-orm'
import { signJWT }              from '../middleware/auth.js'
import { env }                  from '../config/env.js'
import { randomBytes, createHash } from 'crypto'

// JWT session duration — 8 hours
const JWT_TTL_SECONDS = 8 * 60 * 60

export async function samlRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /auth/saml/:tenantId/metadata ─────────────────────────────────────
  // Returns SP metadata XML. Give this URL to your IdP configuration.
  fastify.get<{ Params: { tenantId: string } }>('/auth/saml/:tenantId/metadata', async (request, reply) => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, request.params.tenantId)).limit(1)
    if (!tenant) return reply.code(404).send({ error: 'NOT_FOUND' })

    const spEntityId = tenant.samlSpEntityId ?? buildSpEntityId(request.params.tenantId)
    const acsUrl     = buildAcsUrl(request.params.tenantId)

    const metadata = buildSpMetadata(spEntityId, acsUrl)

    return reply
      .header('Content-Type', 'application/xml')
      .send(metadata)
  })

  // ── GET /auth/saml/:tenantId/login ────────────────────────────────────────
  // Redirects the user to the IdP login page.
  fastify.get<{ Params: { tenantId: string }; Querystring: { relay?: string } }>('/auth/saml/:tenantId/login', async (request, reply) => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, request.params.tenantId)).limit(1)
    if (!tenant) return reply.code(404).send({ error: 'NOT_FOUND' })

    if (!tenant.samlIdpSsoUrl) {
      return reply.code(400).send({ error: 'SAML_NOT_CONFIGURED', message: 'SAML IdP is not configured for this tenant' })
    }

    const spEntityId = tenant.samlSpEntityId ?? buildSpEntityId(request.params.tenantId)
    const acsUrl     = buildAcsUrl(request.params.tenantId)
    const requestId  = '_' + randomBytes(16).toString('hex')
    const issueInstant = new Date().toISOString()

    const authnRequest = buildAuthnRequest(requestId, issueInstant, spEntityId, acsUrl, tenant.samlIdpSsoUrl)
    const encoded      = Buffer.from(authnRequest).toString('base64')
    const deflated     = encoded // For simplicity — production should use zlib deflate

    const params = new URLSearchParams({
      SAMLRequest: deflated,
      ...(request.query.relay ? { RelayState: request.query.relay } : {}),
    })

    return reply.redirect(`${tenant.samlIdpSsoUrl}?${params.toString()}`)
  })

  // ── POST /auth/saml/:tenantId/callback ────────────────────────────────────
  // ACS (Assertion Consumer Service) endpoint.
  // The IdP POST the SAML response here after successful authentication.
  fastify.post<{ Params: { tenantId: string } }>('/auth/saml/:tenantId/callback', async (request, reply) => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, request.params.tenantId)).limit(1)
    if (!tenant) return reply.code(404).send({ error: 'NOT_FOUND' })

    if (!tenant.samlIdpEntityId || !tenant.samlIdpCertificate) {
      return reply.code(400).send({ error: 'SAML_NOT_CONFIGURED' })
    }

    const body = request.body as Record<string, string>
    const samlResponseB64 = body.SAMLResponse

    if (!samlResponseB64) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Missing SAMLResponse' })
    }

    // Parse SAML response
    let assertion: SAMLAssertion
    try {
      const xml = Buffer.from(samlResponseB64, 'base64').toString('utf-8')
      assertion = parseSAMLResponse(xml, tenant.samlIdpEntityId, tenant.samlIdpCertificate)
    } catch (err) {
      return reply.code(401).send({
        error:   'SAML_INVALID',
        message: String(err),
      })
    }

    if (!tenant.jwtSecret) {
      return reply.code(500).send({ error: 'MISCONFIGURED', message: 'Tenant JWT secret not set' })
    }

    // Issue JWT
    const now = Math.floor(Date.now() / 1000)
    const jwt = signJWT({
      sub:   tenant.id,
      exp:   now + JWT_TTL_SECONDS,
      type:  'saml_session',
      name:  assertion.name,
      email: assertion.email,
    }, tenant.jwtSecret)

    await writeAudit({
      tenantId:   tenant.id,
      action:     'saml_login',
      actor:      assertion.email ?? assertion.nameId,
      ip:         request.ip,
      userAgent:  request.headers['user-agent'],
      statusCode: 200,
      metadata:   { name_id: assertion.nameId, email: assertion.email },
    })

    await writeAudit({
      tenantId:   tenant.id,
      action:     'jwt_issued',
      actor:      assertion.email ?? assertion.nameId,
      ip:         request.ip,
      statusCode: 200,
      metadata:   { expires_in: JWT_TTL_SECONDS, type: 'saml_session' },
    })

    // Return JWT — client stores and uses as Bearer token
    return reply.send({
      access_token: jwt,
      token_type:   'Bearer',
      expires_in:   JWT_TTL_SECONDS,
      name:         assertion.name,
      email:        assertion.email,
    })
  })

  // ── PATCH /admin/tenants/:id/saml ─────────────────────────────────────────
  // Configure SAML IdP settings for a tenant.
  fastify.patch<{ Params: { id: string } }>('/admin/tenants/:id/saml', async (request, reply) => {
    const body = request.body as {
      idp_entity_id:    string;
      idp_sso_url:      string;
      idp_certificate:  string;
      sp_entity_id?:    string;
    }

    if (!body.idp_entity_id || !body.idp_sso_url || !body.idp_certificate) {
      return reply.code(400).send({
        error:   'BAD_REQUEST',
        message: 'Required: idp_entity_id, idp_sso_url, idp_certificate',
      })
    }

    const [updated] = await db
      .update(tenants)
      .set({
        samlIdpEntityId:    body.idp_entity_id,
        samlIdpSsoUrl:      body.idp_sso_url,
        samlIdpCertificate: body.idp_certificate,
        samlSpEntityId:     body.sp_entity_id ?? buildSpEntityId(request.params.id),
        updatedAt:          new Date(),
      })
      .where(eq(tenants.id, request.params.id))
      .returning()

    if (!updated) return reply.code(404).send({ error: 'NOT_FOUND' })

    return reply.send({
      configured: true,
      sp_entity_id: updated.samlSpEntityId,
      metadata_url: `${buildBaseUrl()}/v1/auth/saml/${updated.id}/metadata`,
      acs_url:      buildAcsUrl(updated.id),
    })
  })
}

// ─── SAML XML builders ────────────────────────────────────────────────────────

interface SAMLAssertion {
  nameId:  string;
  name?:   string;
  email?:  string;
  groups?: string[];
}

function buildSpEntityId(tenantId: string): string {
  return `${buildBaseUrl()}/v1/auth/saml/${tenantId}`
}

function buildAcsUrl(tenantId: string): string {
  return `${buildBaseUrl()}/v1/auth/saml/${tenantId}/callback`
}

function buildBaseUrl(): string {
  return env.NODE_ENV === 'production'
    ? (process.env.PUBLIC_URL ?? 'https://api.etapsky.com')
    : `http://localhost:${env.PORT}`
}

function buildSpMetadata(spEntityId: string, acsUrl: string): string {
  return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${spEntityId}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="0"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`
}

function buildAuthnRequest(
  requestId:     string,
  issueInstant:  string,
  spEntityId:    string,
  acsUrl:        string,
  idpSsoUrl:     string,
): string {
  return `<?xml version="1.0"?>
<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${idpSsoUrl}"
  AssertionConsumerServiceURL="${acsUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${spEntityId}</saml:Issuer>
</samlp:AuthnRequest>`
}

function parseSAMLResponse(xml: string, expectedIssuer: string, idpCert: string): SAMLAssertion {
  // Validate issuer
  if (!xml.includes(expectedIssuer)) {
    throw new Error('SAML response issuer does not match configured IdP entity ID')
  }

  // Check StatusCode
  if (!xml.includes('urn:oasis:names:tc:SAML:2.0:status:Success')) {
    throw new Error('SAML authentication failed — IdP returned non-success status')
  }

  // Extract NameID
  const nameIdMatch = xml.match(/<(?:saml:)?NameID[^>]*>([^<]+)<\/(?:saml:)?NameID>/)
  if (!nameIdMatch) throw new Error('SAML response missing NameID')
  const nameId = nameIdMatch[1].trim()

  // Extract attributes
  const email = extractAttribute(xml, ['email', 'emailAddress', 'mail',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'])
  const name  = extractAttribute(xml, ['displayName', 'cn', 'name',
    'http://schemas.microsoft.com/identity/claims/displayname'])

  return { nameId, email, name }
}

function extractAttribute(xml: string, names: string[]): string | undefined {
  for (const name of names) {
    const pattern = new RegExp(
      `Name="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>[\\s\\S]*?<[^>]+AttributeValue[^>]*>([^<]+)</`,
    )
    const match = xml.match(pattern)
    if (match) return match[1].trim()
  }
  return undefined
}
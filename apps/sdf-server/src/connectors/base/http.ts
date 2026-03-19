// ─── ERP HTTP Client ──────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Shared fetch wrapper used by all ERP connector implementations.
// Handles auth injection (Basic, Bearer, OAuth2 client_credentials, API key),
// per-request timeout via AbortSignal, and structured ERPConnectorError throws.

import type { ERPConnectorConfig, ERPAuthConfig } from './types.js'
import { ERPConnectorError } from './types.js'

export interface ERPRequestOptions {
  method?:  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path:     string;
  body?:    unknown;
  headers?: Record<string, string>;
  /** Override timeout for this specific call */
  timeoutMs?: number;
}

export interface ERPResponse<T = unknown> {
  status:  number;
  headers: Record<string, string>;
  data:    T;
}

export class ERPHttpClient {
  private readonly baseUrl:   string
  private readonly auth:      ERPAuthConfig
  private readonly timeoutMs: number
  private readonly debug:     boolean
  private readonly system:    string

  // OAuth2 token cache
  private oauthToken?:     string
  private oauthExpiresAt?: number

  constructor(system: string, config: Pick<ERPConnectorConfig, 'baseUrl' | 'auth' | 'timeoutMs' | 'debug'>) {
    this.system    = system
    this.baseUrl   = config.baseUrl.replace(/\/$/, '')
    this.auth      = config.auth
    this.timeoutMs = config.timeoutMs ?? 30_000
    this.debug     = config.debug ?? false
  }

  async request<T = unknown>(opts: ERPRequestOptions): Promise<ERPResponse<T>> {
    const url     = `${this.baseUrl}${opts.path}`
    const timeout = opts.timeoutMs ?? this.timeoutMs
    const authHeaders = await this.buildAuthHeaders()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      ...authHeaders,
      ...opts.headers,
    }

    const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined

    if (this.debug) {
      console.debug(`[${this.system}] ${opts.method ?? 'GET'} ${url}`)
    }

    let response: Response
    try {
      response = await fetch(url, {
        method:  opts.method ?? 'GET',
        headers,
        body,
        signal:  AbortSignal.timeout(timeout),
      })
    } catch (err) {
      throw new ERPConnectorError(
        this.system,
        'NETWORK_ERROR',
        `Request failed: ${String(err)}`,
      )
    }

    let data: T
    try {
      const text = await response.text()
      data = text ? JSON.parse(text) as T : {} as T
    } catch {
      throw new ERPConnectorError(
        this.system,
        'PARSE_ERROR',
        `Response is not valid JSON (HTTP ${response.status})`,
      )
    }

    if (!response.ok) {
      throw new ERPConnectorError(
        this.system,
        `HTTP_${response.status}`,
        `ERP returned ${response.status}`,
        data,
      )
    }

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((v, k) => { responseHeaders[k] = v })

    return { status: response.status, headers: responseHeaders, data }
  }

  // ─── Auth header builders ──────────────────────────────────────────────────

  private async buildAuthHeaders(): Promise<Record<string, string>> {
    switch (this.auth.type) {
      case 'basic': {
        const creds = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64')
        return { Authorization: `Basic ${creds}` }
      }
      case 'bearer': {
        return { Authorization: `Bearer ${this.auth.token}` }
      }
      case 'oauth2': {
        const token = await this.getOAuth2Token()
        return { Authorization: `Bearer ${token}` }
      }
      case 'api_key': {
        return { [this.auth.header]: this.auth.key }
      }
      default:
        return {}
    }
  }

  private async getOAuth2Token(): Promise<string> {
    const now = Date.now()
    if (this.oauthToken && this.oauthExpiresAt && this.oauthExpiresAt > now + 60_000) {
      return this.oauthToken
    }

    if (this.auth.type !== 'oauth2') throw new Error('Not OAuth2 config')

    const params = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     this.auth.clientId,
      client_secret: this.auth.clientSecret,
    })

    const res = await fetch(this.auth.tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
      signal:  AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      throw new ERPConnectorError(this.system, 'OAUTH2_FAILED', `Token request failed: HTTP ${res.status}`)
    }

    const json = await res.json() as { access_token: string; expires_in: number }
    this.oauthToken    = json.access_token
    this.oauthExpiresAt = now + (json.expires_in * 1000)
    return this.oauthToken
  }
}
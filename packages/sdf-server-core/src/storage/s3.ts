// ─── S3 / MinIO Storage Adapter ───────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Uses native fetch + AWS Signature V4 — no AWS SDK dependency.
// Compatible with AWS S3, MinIO, Cloudflare R2, and any S3-compatible store.
// SigV4 signing key is derived per-request via the HMAC key-derivation chain:
//   HMAC(HMAC(HMAC(HMAC("AWS4"+secret, date), region), "s3"), "aws4_request")

import { createHmac, createHash } from 'crypto'
import { env } from '../config/env.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  key:      string;
  bucket:   string;
  sizeBytes: number;
  etag:     string;
}

export interface DownloadResult {
  body:        Uint8Array;
  contentType: string;
  sizeBytes:   number;
}

export interface PresignedUrlResult {
  url:       string;
  expiresAt: Date;
}

// ─── S3Client ─────────────────────────────────────────────────────────────────

export class S3Client {
  private readonly bucket:    string
  private readonly region:    string
  private readonly accessKey: string
  private readonly secretKey: string
  private readonly endpoint:  string
  private readonly pathStyle: boolean

  constructor() {
    this.bucket    = env.S3_BUCKET
    this.region    = env.S3_REGION
    this.accessKey = env.S3_ACCESS_KEY_ID
    this.secretKey = env.S3_SECRET_ACCESS_KEY
    this.pathStyle = env.S3_FORCE_PATH_STYLE

    if (env.S3_ENDPOINT) {
      this.endpoint = env.S3_ENDPOINT.replace(/\/$/, '')
    } else {
      this.endpoint = `https://s3.${this.region}.amazonaws.com`
    }
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async upload(key: string, body: Uint8Array, contentType = 'application/vnd.sdf'): Promise<UploadResult> {
    const url      = this.buildUrl(key)
    const now      = new Date()
    const headers  = await this.sign('PUT', key, body, contentType, now)

    const response = await fetch(url, {
      method:  'PUT',
      headers: { ...headers, 'Content-Type': contentType },
      body:    Buffer.from(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`S3 upload failed: ${response.status} ${text}`)
    }

    return {
      key,
      bucket:   this.bucket,
      sizeBytes: body.length,
      etag:     response.headers.get('etag') ?? '',
    }
  }

  // ─── Download ─────────────────────────────────────────────────────────────

  async download(key: string): Promise<DownloadResult> {
    const url     = this.buildUrl(key)
    const now     = new Date()
    const headers = await this.sign('GET', key, new Uint8Array(), '', now)

    const response = await fetch(url, { method: 'GET', headers })

    if (!response.ok) {
      if (response.status === 404) throw new Error(`SDF_NOT_FOUND: ${key}`)
      throw new Error(`S3 download failed: ${response.status}`)
    }

    const body = new Uint8Array(await response.arrayBuffer())
    return {
      body,
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
      sizeBytes:   body.length,
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(key: string): Promise<void> {
    const url     = this.buildUrl(key)
    const now     = new Date()
    const headers = await this.sign('DELETE', key, new Uint8Array(), '', now)

    const response = await fetch(url, { method: 'DELETE', headers })
    if (!response.ok && response.status !== 404) {
      throw new Error(`S3 delete failed: ${response.status}`)
    }
  }

  // ─── URL builder ──────────────────────────────────────────────────────────

  buildUrl(key: string): string {
    if (this.pathStyle) {
      return `${this.endpoint}/${this.bucket}/${key}`
    }
    const base = this.endpoint.replace('://', `://${this.bucket}.`)
    return `${base}/${key}`
  }

  // ─── Key builder ──────────────────────────────────────────────────────────

  static buildKey(tenantId: string, documentId: string): string {
    return `${tenantId}/${documentId}.sdf`
  }

  // ─── AWS Signature V4 ─────────────────────────────────────────────────────

  private async sign(
    method:      string,
    key:         string,
    body:        Uint8Array,
    contentType: string,
    now:         Date,
  ): Promise<Record<string, string>> {
    const date     = formatDate(now)
    const datetime = formatDatetime(now)
    const host     = new URL(this.buildUrl(key)).host

    const bodyHash = sha256hex(body)

    const headers: Record<string, string> = {
      host,
      'x-amz-date':          datetime,
      'x-amz-content-sha256': bodyHash,
    }
    if (contentType) headers['content-type'] = contentType

    const signedHeaders = Object.keys(headers).sort().join(';')
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('\n') + '\n'

    const canonicalUri    = `/${key}`
    const canonicalQuery  = ''
    const canonicalRequest = [
      method, canonicalUri, canonicalQuery,
      canonicalHeaders, signedHeaders, bodyHash,
    ].join('\n')

    const credentialScope = `${date}/${this.region}/s3/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256', datetime, credentialScope,
      sha256hex(new TextEncoder().encode(canonicalRequest)),
    ].join('\n')

    const signingKey = this.deriveSigningKey(date)
    const signature  = hmacHex(signingKey, stringToSign)

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`

    return { ...headers, Authorization: authorization }
  }

  private deriveSigningKey(date: string): Buffer {
    const k1 = hmacBuf(`AWS4${this.secretKey}`, date)
    const k2 = hmacBuf(k1, this.region)
    const k3 = hmacBuf(k2, 's3')
    return hmacBuf(k3, 'aws4_request')
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256hex(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmacBuf(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

function hmacHex(key: Buffer, data: string): string {
  return createHmac('sha256', key).update(data).digest('hex')
}

function formatDate(d: Date): string {
  return d.toISOString().replace(/[T:-]/g, '').slice(0, 8)
}

function formatDatetime(d: Date): string {
  return d.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '')
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const s3 = new S3Client()

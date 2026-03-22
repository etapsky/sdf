# CLAUDE.md — Etapsky SDF Project
## Auth System & Data Model Implementation Brief

> **Bu dosyayı oku.** Projeye başlamadan önce her şeyi anladığından emin ol.
> Bu bir brifing dokümanıdır — burada tanımlanan mimari kararlara uymak zorunludur.
> Herhangi bir şeyi değiştirmeden veya eklemeden önce bu dokümanla çelişip çelişmediğini kontrol et.

---

## 0. Proje Bağlamı — Ne İnşa Ediyoruz?

**Şirket:** Etapsky Inc. (github.com/etapsky)
**Ürün:** SDF — Smart Document Format

SDF, belge görselini (PDF) ve belge verisini (JSON) tek bir `.sdf` dosyasında birleştiren açık kaynaklı bir format standardıdır. Hedef kitle kurumsal şirketler (SAP, Oracle kullanan), devlet kurumları ve B2B/B2G/G2G entegrasyonlardır.

### SDF'in Çözdüğü Problem

Bugün belgeler PDF olarak seyahat eder ve alıcı sistemin veriyi OCR veya manuel olarak yeniden girmesi gerekir. SDF bunu ortadan kaldırır: yapılandırılmış JSON'u görselin yanında taşır. Her iki taraf da SDF kullandığında veri çıkarma sıfır maliyet, sıfır hata olur.

SDF **genel amaçlıdır** — fatura, nomination, satın alma emri, devlet formları, G2G veri alışverişi, İK belgeleri, sözleşmeler. İlgili taraflar hakkında (B2B, B2G, G2G hepsi desteklenir) veya sektör dikey hakkında hiçbir varsayımda bulunmaz.

Normatif kaynak: `spec/SDF_FORMAT.md`. Dosya yapısına, producer akışına, consumer akışına veya validasyona dokunan herhangi bir şeyi implement etmeden önce bu spec'i oku.

### Projenin Ölçeği

Bu, basit bir side project değil. Ölçeği anlamak için:
- Adobe, Atlassian veya AWS seviyesinde bir developer tooling ekosistemi
- 2 ayrı GitHub organizasyonu, birden fazla monorepo
- npm'e yayınlanmış 5 paket, PyPI'a 1 paket, Homebrew tap
- macOS Quick Look plugin, Windows registry entegrasyonu, VS Code extension
- SAP S/4HANA ve Oracle Fusion Cloud ERP connector'ları
- AWS üzerinde Terraform ile yönetilen production altyapısı

### İki Ana Repo

```
github.com/etapsky/sdf          ← Turborepo monorepo (ana repo)
github.com/etapsky/sdf-cloud    ← SaaS platform monorepo
```

---

## 1. Teknoloji Yığını — Kesinleşmiş Kararlar

Bu kararlar değiştirilemez. Alternatifleri önerme.

| Katman | Teknoloji | Versiyon | Notlar |
|--------|-----------|----------|--------|
| Dil | TypeScript | 5.7+ | strict mode, no `any` |
| HTTP Framework | Fastify | 5.3.2 | Express değil |
| ORM | Drizzle ORM | 0.41.0 | Prisma değil |
| Veritabanı | PostgreSQL | 17 | MySQL değil |
| Queue | BullMQ | 5.13.0 | Redis backend |
| Cache/Queue Backend | Redis (ioredis) | latest | |
| Validation | Zod | 3.24.2 | Runtime env doğrulama |
| Object Storage | S3 / MinIO | native fetch | AWS SDK yok, native SigV4 |
| Monorepo | Turborepo | 2.8.x | |
| Paket Yöneticisi | Bun | 1.3.11 | npm değil |
| Test | Vitest | 3.x | Jest değil |
| Frontend | React 19 + Vite 6 | — | sdf-cloud-portal için |
| Marketing | Astro 5 | — | sdf-cloud-marketing için |
| Container | Docker (Node.js 22 Alpine) | — | multi-stage |
| Infra | Terraform | — | AWS |
| CI/CD | GitHub Actions | — | |

**Python SDK:** `etapsky-sdf` (PyPI) — `cryptography`, `jsonschema`, `reportlab` kullanıyor.

---

## 2. Repo Yapısı — Nerede Ne Var

### `github.com/etapsky/sdf` (Ana Monorepo)

```
etapsky/sdf/
├── spec/
│   ├── SDF_FORMAT.md              ← Normatif format spesifikasyonu (17 bölüm, 1.218 satır)
│   ├── schemas/                   ← meta.schema.json, data.schema.json
│   ├── examples/                  ← 7 referans örnek (invoice, nomination, purchase-order, 4× gov)
│   └── poc/                       ← PoC kaynak ve üretilmiş .sdf dosyaları (14 adet)
├── packages/
│   ├── sdf-kit/                   ← @etapsky/sdf-kit@0.2.2 (npm)
│   │   └── src/
│   │       ├── producer/          ← buildSDF(), generatePDF(), packZIP()
│   │       ├── reader/            ← parseSDF(), extractJSON(), getVisual()
│   │       ├── validator/         ← validateSchema(), validateMeta(), checkVersion()
│   │       ├── signer/            ← sign(), verify(), generateKeyPair()
│   │       └── core/              ← types.ts, errors.ts, constants.ts, utils.ts
│   ├── sdf-cli/                   ← @etapsky/sdf-cli@0.3.0 (npm + Homebrew + GitHub Releases binary)
│   │   └── src/
│   │       ├── commands/          ← inspect, validate, sign, verify, keygen, wrap, convert, schema
│   │       └── ui/                ← print.ts (renkli terminal), table.ts
│   ├── sdf-schema-registry/       ← @etapsky/sdf-schema-registry@0.1.0 (npm)
│   │   └── src/
│   │       ├── registry/          ← SchemaRegistry (register, resolve, list)
│   │       ├── diff/              ← diffSchemas() — breaking/non-breaking analiz
│   │       └── migrate/           ← MigrationEngine — versiyon arası dönüşüm
│   ├── sdf-server-core/           ← @etapsky/sdf-server-core@0.1.2 (npm) ← BURAYA YAZ
│   │   └── src/
│   │       ├── api/server.ts      ← Fastify 5 app
│   │       ├── routes/
│   │       │   ├── sdf.ts         ← upload, download, meta, data, delete, list
│   │       │   ├── sign.ts        ← sign, verify
│   │       │   ├── validate.ts    ← synchronous validation
│   │       │   ├── schema.ts      ← schema registry endpoints
│   │       │   ├── admin.ts       ← tenant & key yönetimi
│   │       │   ├── saml.ts        ← SAML 2.0 SP endpoints
│   │       │   └── connectors.ts  ← ERP connector endpoints
│   │       ├── middleware/
│   │       │   └── auth.ts        ← authMiddleware, adminAuthMiddleware
│   │       ├── db/
│   │       │   ├── client.ts      ← PostgreSQL Drizzle client
│   │       │   └── schema.ts      ← TÜM TABLO TANIMLARI BURAYA ← KRİTİK
│   │       ├── queue/
│   │       │   ├── client.ts      ← BullMQ/Redis client
│   │       │   └── jobs.ts        ← validate-sdf, sign-sdf, webhook-delivery workers
│   │       ├── storage/s3.ts      ← S3/MinIO native SigV4 adapter
│   │       ├── connectors/
│   │       │   ├── base/          ← ERPHttpClient, ConnectorRegistry, FieldMapper
│   │       │   ├── sap/           ← SAP S/4HANA OData v4 connector
│   │       │   └── oracle/        ← Oracle Fusion Cloud REST connector
│   │       └── config/env.ts      ← Zod ile doğrulanmış env değişkenleri
│   └── sdf-python/                ← etapsky-sdf@0.1.1 (PyPI)
├── apps/
│   ├── demo-web/                  ← React SDF producer demo (Vite 6)
│   ├── demo-reader/               ← React SDF inspector demo (Vite 6)
│   └── sdf-server/                ← Çalıştırılabilir server uygulaması
│       └── src/index.ts           ← sdf-server-core'u import eder ve başlatır
├── assets/
│   ├── sdf_icon_v2.svg            ← SDF dosya ikonu v2 (güncel)
│   ├── sdf_icon.svg               ← SDF dosya ikonu v1 (eski)
│   ├── etapsky_logo.svg
│   └── etapsky_mark.svg
└── tooling/
    ├── sdf-vscode/                ← VS Code extension (inspect, validate, preview — 3 komut)
    └── os-integration/
        ├── macos/                 ← Quick Look plugin (Swift, 8 ikon boyutu)
        └── windows/               ← Registry entegrasyonu (PowerShell)
```

### `github.com/etapsky/sdf-cloud` (SaaS Platform)

```
etapsky/sdf-cloud/
├── apps/
│   ├── api/                       ← SaaS API → api.etapsky.com
│   │   └── src/
│   │       ├── app.ts             ← Fastify app factory (plugin kayıtları)
│   │       ├── index.ts           ← Sunucu giriş noktası
│   │       ├── billing/           ← Plan tanımları, kullanım ölçümü
│   │       │   ├── plans.ts       ← Plan limitleri ve tanımları
│   │       │   └── metering.ts    ← Kullanım ölçümü mantığı
│   │       ├── config/
│   │       │   ├── env.ts         ← Zod ile env doğrulama
│   │       │   └── constants.ts   ← Uygulama geneli sabitler
│   │       ├── db/
│   │       │   ├── client.ts      ← PostgreSQL Drizzle client
│   │       │   ├── migrate.ts     ← Migration runner
│   │       │   ├── seed.ts        ← Dev ortamı seed verisi
│   │       │   ├── migrations/    ← SQL migration dosyaları (0001–0004)
│   │       │   └── schema/
│   │       │       ├── users.ts   ← Kullanıcı ve organizasyon şemaları
│   │       │       └── billing.ts ← Abonelik ve kullanım şemaları
│   │       ├── lib/
│   │       │   ├── crypto.ts      ← API key hash / token üretimi
│   │       │   ├── errors.ts      ← Uygulama hata sınıfları
│   │       │   ├── logger.ts      ← Pino logger yapılandırması
│   │       │   ├── pagination.ts  ← Cursor tabanlı sayfalama
│   │       │   └── result.ts      ← Result<T, E> tipi
│   │       ├── middleware/
│   │       │   └── user-auth.ts   ← JWT doğrulama ve kullanıcı bağlamı
│   │       ├── onboarding/
│   │       │   └── signup.ts      ← Kayıt iş mantığı
│   │       ├── plugins/
│   │       │   └── billing-guard.ts ← Plan limit kontrol plugin'i
│   │       ├── routes/
│   │       │   ├── index.ts       ← Tüm route'ları kayıt eden ana plugin
│   │       │   ├── onboarding.ts  ← Onboarding HTTP endpoint'leri
│   │       │   ├── billing.ts     ← Legacy billing endpoint'leri
│   │       │   ├── admin/
│   │       │   │   └── saas.ts    ← SaaS yönetim operasyonları
│   │       │   └── v1/            ← Versiyonlu public API
│   │       │       ├── auth/      ← login, logout, refresh, register
│   │       │       ├── account/   ← organization, profile, team
│   │       │       ├── billing/   ← plan, upgrade, usage, invoices
│   │       │       ├── audit/     ← Audit log listeleme
│   │       │       ├── health/    ← /health liveness/readiness
│   │       │       ├── api-keys/  ← API key yönetimi (hazırlanıyor)
│   │       │       ├── documents/ ← SDF belge endpoint'leri (hazırlanıyor)
│   │       │       └── webhooks/  ← Webhook endpoint'leri (hazırlanıyor)
│   │       ├── services/
│   │       │   ├── auth.service.ts    ← Kimlik doğrulama ve oturum servisi
│   │       │   ├── billing.service.ts ← Abonelik ve plan servisi
│   │       │   └── email.service.ts   ← E-posta gönderme servisi
│   │       ├── types/
│   │       │   ├── auth.ts        ← Auth tipleri
│   │       │   ├── billing.ts     ← Billing tipleri
│   │       │   └── fastify.d.ts   ← Fastify request augmentation
│   │       └── workers/
│   │           ├── audit-flush.worker.ts   ← Audit olaylarını DB'ye yazar
│   │           └── billing-sync.worker.ts  ← Billing senkronizasyonu
│   ├── portal/                    ← Self-servis müşteri portalı → portal.etapsky.com
│   │   └── src/
│   │       ├── components/        ← Yeniden kullanılabilir UI bileşenleri
│   │       ├── lib/
│   │       │   ├── auth/          ← AuthProvider, ProtectedRoute, useAuth, tokenStorage
│   │       │   ├── api/           ← account, billing, documents, apiKeys, webhooks
│   │       │   └── hooks/         ← React Query tabanlı veri hook'ları
│   │       └── pages/
│   │           ├── auth/          ← LoginPage, RegisterPage, ForgotPasswordPage
│   │           ├── dashboard/     ← DashboardPage
│   │           ├── documents/     ← DocumentsPage
│   │           ├── api-keys/      ← ApiKeysPage
│   │           ├── billing/       ← BillingPage
│   │           ├── audit-log/     ← AuditLogPage
│   │           ├── schema-registry/ ← SchemaRegistryPage
│   │           ├── settings/      ← ProfilePage, SettingsLayout
│   │           └── webhooks/      ← WebhooksPage
│   └── marketing/                 ← Pazarlama sitesi (Astro 5) → etapsky.com
├── packages/
│   └── cloud-sdk/                 ← @etapsky/cloud-sdk@0.1.0 (npm)
│       └── src/
│           ├── client.ts          ← SDFCloudClient (upload, download, sign, verify)
│           ├── types.ts
│           └── index.ts
└── infra/
    └── sdf-cloud/terraform/
        ├── main.tf                ← RDS, ElastiCache, S3, ECS Fargate, CloudFront
        └── variables.tf           ← staging | production ortamları
```

---

## 3. SDF Dosya Formatı — Temel Anlayış

Koda dokunmadan önce bu formatı anla. Her `.sdf` dosyası bir ZIP arşividir:

```
invoice.sdf  (ZIP)
├── visual.pdf       ← İnsan okuma katmanı (pdf-lib ile üretilir)
├── data.json        ← Makine okuma katmanı (iş verisi)
├── schema.json      ← JSON Schema Draft 2020-12 (arşive gömülü, URL referansı yasak)
├── meta.json        ← SDF metadata ve kimlik
└── signature.sig    ← Dijital imza (ECDSA P-256 veya RSA-2048, Web Crypto API)
```

### Hangi Veri Nereye Gider

| Veri tipi | Doğru konum | Yanlış konum |
|-----------|-------------|--------------|
| SDF spec versiyonu | `meta.json` → `sdf_version` | `data.json` |
| Belge UUID'si | `meta.json` → `document_id` | `data.json` |
| İş verisi (fatura alanları vb.) | `data.json` | `meta.json` |
| Doğrulama kuralları | `schema.json` | `data.json`, `meta.json` |
| Görsel temsil | `visual.pdf` | başka hiçbir yer |
| Dijital imza | `signature.sig` | `meta.json` value |
| Tescilli uzantılar | `vendor/` prefix'li alan | arşiv kökü |

### Kritik Tasarım Kararları (DEĞİŞTİRİLEMEZ)

Bu kararlar finaldir. Açık bir spec versiyon tartışması olmadan yeniden açılmaz.

1. **`document_id` üretim zamanında UUID v4 olarak üretilir** — iş tanımlayıcısından türetilmez. Fatura numaraları, nomination ref'leri vb. `data.json`'da yaşar ve ayrıca indekslenir.
2. **`meta.json` ve `data.json` ayrı dosyalardır** — SDF metadata'sı belge şemasını kirletmez. `meta.json` belge şemalarından bağımsız olarak evrilebilir.
3. **Para miktarları her zaman `{ "amount": "string", "currency": "ISO4217" }` nesnesidir** — bare sayı asla. Kayan nokta hassasiyet kaybı finansal belgelerde kabul edilemez.
4. **`schema.json` arşive gömülür** — dış URL referansı yasaktır, offline çalışma zorunludur. Belgeler oluşturulduktan onlarca yıl sonra da kendi kendini doğrulayabilmelidir.
5. **`visual.pdf` dış kaynak referansı içeremez** — fontlar, görseller, renk profilleri tamamen gömülü olmalıdır. Tasarım gereği offline-safe.
6. **`visual.pdf` executable içerik barındıramaz** — JavaScript, makro, AcroForm script'i yasaktır. Producer'lar bunları gömmemeli, consumer'lar bulduklarını çalıştırmamalıdır.
7. **JSON, XML'den üstündür** — `data.json` ve `schema.json` JSON'dur, asla XML değil. Bu ZUGFeRD/XRechnung'dan temel bir farklılaştırıcıdır.
8. **ZIP erişimi `packContainer`/`unpackContainer` abstraction'ı arkasına gizlenmiştir** — JSZip doğrudan çağrılmaz.

### meta.json Yapısı

```json
{
  "sdf_version": "0.1",
  "document_id": "uuid-v4",
  "document_type": "invoice",
  "schema_id": "invoice/v1.0",
  "issuer": { "name": "Acme Corp", "id": "..." },
  "issued_at": "ISO8601",
  "locale": "tr-TR",
  "nomination_ref": "optional-matching-ref"
}
```

---

## 4. Auth Sistemi — Tam Spesifikasyon

### 4.1 Genel Mimari

Bu projede iki farklı auth ihtiyacı vardır ve bunlar birbiriyle karıştırılmamalıdır:

```
┌─────────────────────────────────────────────────────────┐
│  Tip A: B2B/Enterprise API Auth                         │
│  → API Key veya SAML SSO                                │
│  → Kimler kullanır: SAP/Oracle entegrasyonları,         │
│     3rd party developers, sdf-server self-hosted deploy │
│  → Durum: ✅ Mevcut, production-ready                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Tip B: SaaS Portal Kullanıcı Auth'u                    │
│  → Email/password + JWT + Refresh token + 2FA           │
│  → Kimler kullanır: sdf-cloud-portal kullanıcıları      │
│  → Durum: ⚠️  EKSIK — implement edilmesi gerekiyor     │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Mevcut Auth — Tam Detay (packages/sdf-server-core)

#### API Key Sistemi

```typescript
// Üretim formatı: sdf_k + kriptografik random suffix
generateApiKey()
// → { raw: "sdf_k1a2b3c4d5e6f7...", hash: "sha256:salt:...", prefix: "sdf_k1a2" }

// Depolama: SADECE hash saklanır, raw key asla DB'ye yazılmaz
// Doğrulama: crypto.timingSafeEqual() — timing attack'a karşı
// Expiry: expires_at timestamp — süresi dolmuş otomatik reddedilir
// Revocation: revoked_at timestamp — anlık iptal
```

#### JWT Sistemi

```typescript
// Algoritma: HS256
// TTL: 8 saat
// Secret: per-tenant, DB'de şifreli
// Claims: { tenant_id, sub, iat, exp }
// Doğrulama: timing-safe compare
```

#### Dual Auth Middleware (auth.ts)

```typescript
// Her istek şu iki yoldan birinden geçer:
authMiddleware:
  Authorization: Bearer <jwt>  → JWT doğrula → tenant context inject
  X-API-Key: <api_key>         → hash compare → tenant context inject

adminAuthMiddleware:
  Authorization: Bearer <admin_jwt> → admin claim kontrol
```

#### SAML 2.0 SP (saml.ts)

```
GET  /saml/metadata  → IdP'ye verilecek SP metadata XML
GET  /saml/login     → IdP'ye yönlendir (SP-initiated SSO)
POST /saml/acs       → SAML Response işle → JWT ver
```

Her tenant kendi IdP'sine sahip. Bağlantı bilgileri `tenants` tablosunda:
- `saml_enabled: BOOL`
- `saml_metadata_url: TEXT` — IdP'nin metadata URL'i
- `saml_entity_id: TEXT` — SP entity ID

#### Rate Limiting

```typescript
// Per-tenant bağımsız rate limit
// Aşım → HTTP 429 → audit log'a yaz
tenants.rate_limit_rpm  // requests per minute
```

#### Admin Routes (admin.ts)

```
POST   /admin/tenants           → Yeni tenant oluştur
GET    /admin/tenants           → Tenant listesi
PUT    /admin/tenants/:id       → Tenant güncelle
DELETE /admin/tenants/:id       → Tenant sil
POST   /admin/tenants/:id/keys  → API key üret
DELETE /admin/keys/:keyId       → API key iptal et
GET    /admin/audit             → Audit log sorgula (filtreli, sayfalı)
```

### 4.3 Eksik Auth — Implement Edilmesi Gerekenler

Aşağıdaki özellikler `sdf-cloud-portal` için gereklidir. `sdf-server-core`'a eklenecek.

#### Önerilen Kütüphaneler (mevcut stack ile uyumlu)

```bash
# Fastify ekosistemi
@fastify/jwt          # Mevcut JWT'yi refresh token ile güçlendir

# Password hashing — birini seç
@node-rs/argon2       # Tercih: daha güvenli, modern
# veya
bcryptjs              # Alternatif: daha yaygın, daha hızlı kurulum

# 2FA / TOTP
otpauth               # TOTP/HOTP — Google Authenticator uyumlu

# OAuth2 social login
arctic                # Minimal OAuth2 client — Google, GitHub destekler
```

#### Implement Edilecek Akışlar

```
1. Kullanıcı Kaydı
   POST /auth/register
   Body: { email, password, tenant_slug }
   → Argon2 ile hash → users tablosuna yaz → email verification gönder

2. Kullanıcı Girişi
   POST /auth/login
   Body: { email, password }
   → Hash compare → access_token (15 dk) + refresh_token (30 gün) ver
   → sessions tablosuna refresh_token_hash yaz

3. Token Yenileme
   POST /auth/refresh
   Body: { refresh_token }
   → sessions tablosunda doğrula → yeni access_token ver → token rotate et

4. 2FA Aktivasyon
   POST /auth/totp/setup    → QR code + secret ver
   POST /auth/totp/verify   → TOTP kodu doğrula → users.totp_enabled = true

5. 2FA ile Giriş
   POST /auth/login → totp_required: true → POST /auth/totp/validate

6. Çıkış
   POST /auth/logout → sessions.revoked_at = now()

7. Şifre Sıfırlama
   POST /auth/forgot-password → email gönder (token'lı)
   POST /auth/reset-password  → token doğrula → yeni hash yaz

8. Email Doğrulama
   GET  /auth/verify-email?token=...
```

#### Güvenlik Gereksinimleri

- Refresh token rotation: her kullanımda yeni token ver, eskiyi iptal et
- Refresh token reuse detection: iptal edilmiş token kullanılırsa tüm session'ları sonlandır
- Brute force koruması: 5 başarısız deneme → 15 dakika lock
- Password politikası: min 12 karakter, 1 büyük, 1 sayı, 1 özel karakter
- Credentials at rest şifreleme: DB'deki hassas alanlar (private_key_enc, credentials_enc) için AES-256-GCM
- HTTPS only: cookie'ler `Secure; HttpOnly; SameSite=Strict`

---

## 5. Data Model Yapıları — Tam Spesifikasyon

### 5.1 Nerede Tanımlanır?

**Ana konum: `packages/sdf-server-core/src/db/schema.ts`**

Drizzle ORM ile type-safe olarak tanımlanır. Migration'lar Drizzle Kit ile yönetilir.

**Kural:** `sdf-server-core` hem self-hosted deploy'lar (apps/sdf-server) hem de SaaS (sdf-cloud/apps/api) tarafından kullanılır. Bu nedenle core modeller her zaman burada yaşar. `sdf-cloud` reposuna özgü modeller (örn. `billing`, `subscription`) ise sdf-cloud/apps/api'nin kendi `db/schema/` dizininde tanımlanır.

### 5.2 Mevcut Tablolar (Zaten Var — Doğrulanmış)

#### `tenants` — Multi-Tenant İzolasyonun Temeli

```sql
tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,        -- URL-safe unique identifier
  rate_limit_rpm  INT DEFAULT 60,              -- requests/minute, per tenant
  saml_enabled    BOOL DEFAULT false,
  saml_metadata_url TEXT,                      -- IdP'nin metadata URL'i
  saml_entity_id  TEXT,                        -- SP entity ID
  created_at      TIMESTAMP DEFAULT now()
)
```

**Her veri satırı tenant_id FK taşır.** Bu multi-tenancy'nin temelidir.
Bir tenant'ın verisi asla başka bir tenant'a sızmaz.

#### `api_keys` — B2B API Erişim Anahtarları

```sql
api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash    TEXT NOT NULL,                   -- SHA-256 + salt, raw key asla saklanmaz
  key_prefix  VARCHAR(8) NOT NULL,             -- UI'da gösterim için (örn. "sdf_k1a2")
  name        TEXT,                            -- Human-readable label
  expires_at  TIMESTAMP,                       -- NULL = sonsuz
  revoked_at  TIMESTAMP,                       -- NULL = aktif
  created_at  TIMESTAMP DEFAULT now()
)
```

#### `sdf_documents` — SDF Belge Kaydı

```sql
sdf_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id         TEXT NOT NULL,           -- meta.json içindeki UUID (format tanımlı)
  storage_key         TEXT NOT NULL,           -- S3/MinIO object key
  document_type       TEXT,                    -- "invoice", "nomination", "purchase_order" ...
  schema_id           TEXT,                    -- "invoice/v1.0" formatında
  sdf_version         TEXT DEFAULT '0.1',
  is_signed           BOOL DEFAULT false,
  signature_algorithm TEXT,                    -- "ECDSA-P256" | "RSA-2048"
  file_size_bytes     INT,
  status              TEXT DEFAULT 'pending',  -- pending | valid | invalid | signed
  created_at          TIMESTAMP DEFAULT now(),
  updated_at          TIMESTAMP DEFAULT now()
)
```

#### `audit_log` — Değişmez Denetim Kaydı

```sql
audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  action      TEXT NOT NULL,   -- upload | download | sign | verify | delete | login | key_created ...
  resource_id TEXT,            -- İlgili kaynak UUID'si
  actor       TEXT,            -- user ID veya "api_key:sdf_k1a2" formatında
  ip_address  TEXT,
  metadata    JSONB,           -- Esnek, action'a özel ek veri
  created_at  TIMESTAMP DEFAULT now()
)
-- NOT: audit_log satırları HİÇBİR ZAMAN silinmez veya güncellenmez.
-- Append-only. Hukuki gereklilik.
```

### 5.3 Eksik Tablolar (Implement Edilmesi Gerekiyor)

#### `users` — Portal Kullanıcıları

```sql
users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,                        -- Argon2id hash. SAML kullanıcılarında NULL olabilir.
  role            TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  email_verified  BOOL DEFAULT false,
  totp_enabled    BOOL DEFAULT false,
  totp_secret     TEXT,                        -- Şifreli (AES-256-GCM) TOTP secret
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
)
```

**Not:** `role` alanı tenant içi yetkilendirme içindir. `owner` tek kişidir,
tenant'ı silebilir ve billing'i yönetir. `admin` kullanıcı ve API key yönetir.
`member` yalnızca SDF işlemleri yapabilir.

#### `sessions` — Refresh Token Yönetimi

```sql
sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT NOT NULL,           -- SHA-256 hash, raw token client'ta
  expires_at          TIMESTAMP NOT NULL,      -- Genellikle 30 gün
  revoked_at          TIMESTAMP,               -- NULL = aktif
  ip_address          TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMP DEFAULT now()
)
```

**Token Rotation Kuralı:** Her `/auth/refresh` isteğinde:
1. Mevcut session'ın `revoked_at` alanına `now()` yaz
2. Yeni bir session kaydı oluştur
3. Eğer zaten `revoked_at` set edilmiş bir token kullanıldıysa → tüm kullanıcı session'larını sonlandır (token theft detection)

#### `signing_keys` — Per-Tenant Dijital İmzalama Anahtarları

```sql
signing_keys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  algorithm        TEXT NOT NULL,   -- 'ECDSA-P256' | 'RSA-2048'
  public_key       TEXT NOT NULL,   -- PEM formatında, açık
  private_key_enc  TEXT NOT NULL,   -- AES-256-GCM şifreli PEM
  is_active        BOOL DEFAULT true,
  key_id           TEXT,            -- Key rotation için referans identifier
  created_at       TIMESTAMP DEFAULT now()
)
-- UYARI: private_key_enc içeriği uygulama katmanında şifrelenir.
-- DB'ye ASLA plaintext private key yazılmaz.
-- Şifreleme anahtarı: ortam değişkeni KEY_ENCRYPTION_SECRET
```

#### `connector_configs` — ERP Bağlantı Konfigürasyonları

```sql
connector_configs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  erp_type         TEXT NOT NULL,    -- 'SAP' | 'ORACLE'
  name             TEXT,             -- Human-readable label ("Production SAP")
  base_url         TEXT NOT NULL,    -- ERP API base URL
  auth_type        TEXT NOT NULL,    -- 'basic' | 'oauth2' | 'bearer'
  credentials_enc  TEXT NOT NULL,    -- AES-256-GCM şifreli JSON credentials
  is_active        BOOL DEFAULT true,
  last_health_check TIMESTAMP,
  health_status    TEXT,             -- 'healthy' | 'unhealthy' | 'unknown'
  created_at       TIMESTAMP DEFAULT now()
)
-- UYARI: credentials_enc içeriği (username/password veya OAuth2 client secret)
-- uygulama katmanında şifrelenir. DB'ye ASLA plaintext credentials yazılmaz.
```

#### `webhooks` — Tenant Webhook Konfigürasyonu

```sql
webhooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  secret_hash  TEXT NOT NULL,  -- HMAC-SHA256 imza doğrulama için, SHA-256 hash olarak saklanır
  events       TEXT[],         -- ['document.uploaded', 'document.signed', 'document.validated']
  is_active    BOOL DEFAULT true,
  created_at   TIMESTAMP DEFAULT now()
)
```

#### `schema_registry_entries` — Schema Registry Kalıcı Depolama

```sql
-- NOT: Bu tablo sdf-cloud reposuna özgüdür.
-- Tanım yeri: etapsky/sdf-cloud/apps/api/src/db/schema/
schema_registry_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,              -- sdf-cloud'a özel FK
  schema_id   TEXT NOT NULL,              -- "invoice" gibi tip ismi
  version     TEXT NOT NULL,              -- "1.0", "2.0" gibi semver
  schema_json JSONB NOT NULL,
  is_published BOOL DEFAULT false,
  created_at  TIMESTAMP DEFAULT now(),
  UNIQUE(tenant_id, schema_id, version)
)
```

### 5.4 Tam İlişki Haritası

```
tenants
  ├── api_keys (1:N)            ← B2B API erişim anahtarları
  ├── users (1:N)               ← Portal kullanıcıları
  │     └── sessions (1:N)      ← Refresh token kayıtları
  ├── sdf_documents (1:N)       ← Yüklenen .sdf dosyaları
  ├── signing_keys (1:N)        ← ECDSA/RSA anahtar çiftleri
  ├── connector_configs (1:N)   ← SAP/Oracle ERP bağlantıları
  ├── webhooks (1:N)            ← Webhook endpoint'leri
  └── audit_log (1:N)           ← Append-only denetim kaydı

[sdf-cloud'a özgü]
tenants → schema_registry_entries (1:N)
```

### 5.5 Drizzle ORM ile Tanımlama Örneği

```typescript
// packages/sdf-server-core/src/db/schema.ts

import { pgTable, uuid, text, boolean, timestamp, integer, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const tenants = pgTable('tenants', {
  id:               uuid('id').primaryKey().defaultRandom(),
  name:             text('name').notNull(),
  slug:             text('slug').unique().notNull(),
  rateLimitRpm:     integer('rate_limit_rpm').default(60),
  samlEnabled:      boolean('saml_enabled').default(false),
  samlMetadataUrl:  text('saml_metadata_url'),
  samlEntityId:     text('saml_entity_id'),
  createdAt:        timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email:          text('email').unique().notNull(),
  passwordHash:   text('password_hash'),
  role:           text('role').notNull().default('member'),
  emailVerified:  boolean('email_verified').default(false),
  totpEnabled:    boolean('totp_enabled').default(false),
  totpSecret:     text('totp_secret'),
  createdAt:      timestamp('created_at').defaultNow(),
  updatedAt:      timestamp('updated_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  userId:             uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash:   text('refresh_token_hash').notNull(),
  expiresAt:          timestamp('expires_at').notNull(),
  revokedAt:          timestamp('revoked_at'),
  ipAddress:          text('ip_address'),
  userAgent:          text('user_agent'),
  createdAt:          timestamp('created_at').defaultNow(),
});

export const signingKeys = pgTable('signing_keys', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  algorithm:      text('algorithm').notNull(),  // 'ECDSA-P256' | 'RSA-2048'
  publicKey:      text('public_key').notNull(),
  privateKeyEnc:  text('private_key_enc').notNull(),  // AES-256-GCM şifreli
  isActive:       boolean('is_active').default(true),
  keyId:          text('key_id'),
  createdAt:      timestamp('created_at').defaultNow(),
});

export const connectorConfigs = pgTable('connector_configs', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  erpType:         text('erp_type').notNull(),  // 'SAP' | 'ORACLE'
  name:            text('name'),
  baseUrl:         text('base_url').notNull(),
  authType:        text('auth_type').notNull(),
  credentialsEnc:  text('credentials_enc').notNull(),  // AES-256-GCM şifreli
  isActive:        boolean('is_active').default(true),
  lastHealthCheck: timestamp('last_health_check'),
  healthStatus:    text('health_status'),
  createdAt:       timestamp('created_at').defaultNow(),
});

export const webhooks = pgTable('webhooks', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  url:         text('url').notNull(),
  secretHash:  text('secret_hash').notNull(),
  events:      text('events').array(),
  isActive:    boolean('is_active').default(true),
  createdAt:   timestamp('created_at').defaultNow(),
});

// Mevcut tablolar — referans için
export const apiKeys = pgTable('api_keys', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  keyHash:    text('key_hash').notNull(),
  keyPrefix:  varchar('key_prefix', { length: 8 }).notNull(),
  name:       text('name'),
  expiresAt:  timestamp('expires_at'),
  revokedAt:  timestamp('revoked_at'),
  createdAt:  timestamp('created_at').defaultNow(),
});

export const sdfDocuments = pgTable('sdf_documents', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  documentId:         text('document_id').notNull(),
  storageKey:         text('storage_key').notNull(),
  documentType:       text('document_type'),
  schemaId:           text('schema_id'),
  sdfVersion:         text('sdf_version').default('0.1'),
  isSigned:           boolean('is_signed').default(false),
  signatureAlgorithm: text('signature_algorithm'),
  fileSizeBytes:      integer('file_size_bytes'),
  status:             text('status').default('pending'),
  createdAt:          timestamp('created_at').defaultNow(),
  updatedAt:          timestamp('updated_at').defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id),
  action:     text('action').notNull(),
  resourceId: text('resource_id'),
  actor:      text('actor'),
  ipAddress:  text('ip_address'),
  metadata:   jsonb('metadata'),
  createdAt:  timestamp('created_at').defaultNow(),
});
```

---

## 6. ERP Connector Mimarisi

### Bileşenler

```typescript
// packages/sdf-server-core/src/connectors/

// Factory pattern — her tenant kendi instance'ına sahip
const registry = new ConnectorRegistry();
registry.registerFactory('SAP', (config) => new SAPConnector(config));
registry.registerFactory('ORACLE', (config) => new OracleConnector(config));
const connector = registry.get(tenantId, 'SAP');

// SAP S/4HANA OData v4
// Oracle Fusion Cloud REST API
// Her ikisi de ERPHttpClient'ı extend eder:
//   - OAuth2 token cache (otomatik yenileme)
//   - Timeout: 30 saniye default
//   - Retry: exponential backoff, 429/5xx için
//   - Bağımlılık: AWS SDK yok, native fetch()
```

### Connector Routes

```
POST /connectors/configure          → Tenant için ERP bağlantısı kaydet
GET  /connectors/health             → ERP bağlantısını test et
POST /connectors/match              → SDF nomination'ını ERP'de eşleştir
GET  /connectors/erp-status/:ref    → ERP'deki belge durumunu sorgula
POST /connectors/push-to-erp/:id   → SDF'i doğrudan ERP'ye yükle
```

### Field Mapper

```typescript
// SDF data.json alanlarını ERP API field'larına dönüştürür
const sapMapping = {
  'data.invoice_number'  : 'SupplierInvoiceID',
  'data.total.amount'    : 'GrossAmount',
  'data.total.currency'  : 'TransactionCurrency',
  'data.issue_date'      : { path: 'DocumentDate', transform: toSAPDate },  // SAP: YYYYMMDD
};
// Oracle için ayrı mapping, ISO 8601 tarih formatı kullanır
```

---

## 7. Queue Mimarisi (BullMQ)

Tüm ağır işlemler asenkron. HTTP isteği anında döner.

```typescript
// queue/jobs.ts

Workers:
  'validate-sdf'      ← Upload sonrası otomatik tetiklenir
                        SDF dosyasını tam doğrulama akışından geçirir
                        schema.json + meta.json + data.json + signature.sig

  'sign-sdf'          ← POST /sign/:id isteği sonrası
                        SDF'e signature.sig ekler, S3'e yazar, status günceller

  'webhook-delivery'  ← İşlem tamamlanınca
                        Tenant'ın webhook URL'ine HMAC-SHA256 imzalı POST atar
                        Retry: exponential backoff, 3 deneme, dead letter queue'ya düşer

Job Priority: sign > validate > webhook
Retry Config: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
```

---

## 8. Object Storage Kuralları

```typescript
// storage/s3.ts
// AWS SDK KULLANILMIYOR — native fetch() + AWS Signature Version 4

// S3 object key formatı:
// {tenant_id}/{year}/{month}/{document_id}.sdf

// Pre-signed URL: GET için 1 saat TTL
// Lifecycle policy: 90 gün sonra Glacier'a taşı (production)
// Local dev: MinIO (docker-compose.yml)
```

---

## 9. Ortam Değişkenleri (config/env.ts — Zod ile doğrulanır)

```typescript
// Zorunlu değişkenler:
DATABASE_URL          // PostgreSQL bağlantı string'i
REDIS_URL             // Redis bağlantı string'i
S3_ENDPOINT           // S3 veya MinIO endpoint
S3_BUCKET             // Bucket adı
S3_ACCESS_KEY         // Access key
S3_SECRET_KEY         // Secret key
JWT_SECRET            // JWT imzalama secret'ı
ADMIN_JWT_SECRET      // Admin JWT için ayrı secret
KEY_ENCRYPTION_SECRET // signing_keys ve credentials_enc için AES-256-GCM anahtarı

// Opsiyonel:
PORT                  // Default: 3000
LOG_LEVEL             // Default: 'info'
RATE_LIMIT_DEFAULT    // Default: 60 (rpm)
```

---

## 10. API Routes — Tam Liste

### SDF Core — `sdf-server-core` (sdf.ts)

```
POST   /upload          → SDF yükle → validate kuyruğuna ekle
GET    /download/:id    → S3'ten indir
GET    /meta/:id        → meta.json döndür
GET    /data/:id        → data.json döndür
DELETE /delete/:id      → SDF ve kayıtlarını sil
GET    /list            → Tenant dosyaları (sayfalı)
POST   /validate        → Synchronous doğrulama
```

### Signing — `sdf-server-core` (sign.ts)

```
POST /sign/:id          → SDF'i imzala → sign kuyruğuna ekle
POST /verify/:id        → İmzayı doğrula
```

### Schema Registry — `sdf-server-core` (schema.ts)

```
GET  /schemas           → Registry'deki şemaları listele
GET  /schemas/:id       → Şema detayı
POST /schemas           → Yeni şema kaydet
```

### SAML — `sdf-server-core` (saml.ts)

```
GET  /saml/metadata     → SP metadata XML
GET  /saml/login        → IdP'ye redirect
POST /saml/acs          → SAML callback → JWT ver
```

### Admin — `sdf-server-core` (admin.ts)

```
POST   /admin/tenants             → Tenant oluştur
GET    /admin/tenants             → Tenant listesi
PUT    /admin/tenants/:id         → Tenant güncelle
DELETE /admin/tenants/:id         → Tenant sil
POST   /admin/tenants/:id/keys    → API key üret
DELETE /admin/keys/:keyId         → API key iptal et
GET    /admin/audit               → Audit log (filtreli, sayfalı)
```

### Connectors — `sdf-server-core` (connectors.ts)

```
POST /connectors/configure        → ERP bağlantısı kaydet
GET  /connectors/health           → Bağlantı sağlık testi
POST /connectors/match            → Nomination eşleştir
GET  /connectors/erp-status/:ref  → ERP belge durumu
POST /connectors/push-to-erp/:id  → ERP'ye yükle
```

### Health — `sdf-server-core`

```
GET /health             → HTTP 200 → { status: 'ok', version: '...' }
```

### `sdf-cloud/apps/api` — Versiyonlu SaaS API (/v1/)

```
# Auth
POST   /v1/auth/register          → Yeni kullanıcı kaydı
POST   /v1/auth/login             → Giriş → JWT çifti döner
POST   /v1/auth/logout            → Oturum sonlandırma
POST   /v1/auth/refresh           → Access token yenileme

# Account
GET    /v1/account/organization   → Organizasyon detayı
PUT    /v1/account/organization   → Organizasyon güncelle
GET    /v1/account/profile        → Kullanıcı profili
PUT    /v1/account/profile        → Profil güncelle
GET    /v1/account/team           → Takım üye listesi

# Billing
GET    /v1/billing/plan           → Aktif plan sorgulama
POST   /v1/billing/upgrade        → Plan yükseltme
GET    /v1/billing/usage          → Kullanım metrikleri
GET    /v1/billing/invoices       → Fatura listesi

# Audit
GET    /v1/audit                  → Audit log listeleme

# Health
GET    /v1/health                 → Liveness / readiness

# Hazırlanıyor
/v1/api-keys/*                    → API key yönetimi
/v1/documents/*                   → SDF belge endpoint'leri
/v1/webhooks/*                    → Webhook yönetimi

# Admin (SaaS yönetim)
/admin/saas/*                     → SaaS yönetim operasyonları

# Onboarding
POST   /onboarding/signup         → Yeni organizasyon kaydı
```

---

## 11. Güvenlik Kuralları — Mutlak

### Auth & Tenant Güvenliği

1. **Raw API key asla DB'ye yazılmaz.** Sadece SHA-256+salt hash saklanır.
2. **Raw refresh token asla DB'ye yazılmaz.** Sadece SHA-256 hash.
3. **Private key asla plaintext saklanmaz.** Uygulama katmanında AES-256-GCM şifrelenir.
4. **ERP credentials asla plaintext saklanmaz.** Aynı şifreleme.
5. **Tüm doğrulama işlemleri `crypto.timingSafeEqual()` kullanır.** Timing attack'a karşı.
6. **Her request `tenant_id` context taşır.** Cross-tenant veri erişimi fiziksel olarak imkânsız olmalıdır.
7. **`audit_log` append-only'dir.** Hiçbir satır güncellenmez veya silinmez.
8. **Rate limiting her tenant için bağımsız çalışır.** Bir tenant'ın aşımı diğerini etkilemez.
9. **Admin endpoint'leri ayrı middleware ile korunur.** Normal auth yeterli değildir.
10. **SAML Response doğrulaması strict modda yapılır.** Signature validation atlanamaz.

### SDF Dosya & Parse Güvenliği

11. **Dosya yazılmadan önce tam validasyon zorunludur.** Eksik `.sdf` dosya diskte olmamalıdır — hiç yoktan daha kötüdür. Validate edilmeden `fs.writeFileSync` çağrılamaz.
12. **ZIP bomb koruması her consumer implementasyonunda zorunludur.** Dosya başına maks 50 MB, toplam uncompressed maks 200 MB. Aşımda `SDF_ERROR_ARCHIVE_TOO_LARGE` fırlat.
13. **Path traversal koruması her ZIP entry path'inde zorunludur.** Extract etmeden önce `..` bileşenlerini kontrol et. `SDF_ERROR_INVALID_ARCHIVE` ile reddet.
14. **SDF parse ve validasyon sırasında ağ isteği yapılmaz.** Kütüphane tamamen offline çalışmalıdır. Dış schema URI'larına `ajv.addSchema(await fetch(...))` asla.
15. **`visual.pdf` içinde executable içerik çalıştırılmaz.** Consumer, PDF içinde bulunan JS, makro veya AcroForm script'i çalıştırmamalıdır.

---

## 12. PostgreSQL — Neden Bu Proje İçin Doğru Seçim

PostgreSQL 17 bu projeye 4 özel nedenle uygundur:

1. **JSONB — `audit_log.metadata` ve `schema_registry_entries.schema_json`:**
   SDF'in esnek metadata yapısı hem relational hem JSON olarak aynı tabloda yaşar.
   JSONB üzerinde index desteği tam query esnekliği sağlar.

2. **Drizzle ORM uyumu:**
   Drizzle ORM PostgreSQL-first tasarlandı. Type-safe migration ve `drizzle-kit push`
   bu projenin TypeScript strict modeli ile tam uyumludur.

3. **Multi-tenant Row-Level Security (RLS):**
   Gelecekte `tenant_id` bazlı RLS politikaları eklenebilir.
   Bu mimari karar şimdiden hazırlık yapmaktadır.

4. **AWS RDS PostgreSQL 17:**
   Production altyapısı Terraform'da tanımlanmış. `db_instance_class` staging/production
   için ayrıca konfigüre edilebilir.

**UUID tip seçimi:** Tüm primary key'ler UUID v4. `gen_random_uuid()` ile DB tarafında
üretilir. Sequential ID kullanılmaz — tenant izolasyonu ve dağıtık sistemler için.

---

## 13. Yayınlanmış Paketler — Referans

| Paket | Versiyon | Registry | İçerik |
|-------|----------|----------|---------|
| `@etapsky/sdf-kit` | 0.2.2 | npm | Core producer, reader, validator, signer |
| `@etapsky/sdf-cli` | 0.3.0 | npm + Homebrew + GitHub Releases | CLI tool — inspect, validate, sign, keygen, wrap, convert, schema |
| `@etapsky/sdf-server-core` | 0.1.2 | npm | Server framework — Fastify, BullMQ, S3, PG |
| `@etapsky/sdf-schema-registry` | 0.1.0 | npm | SchemaRegistry, diffSchemas, MigrationEngine |
| `@etapsky/cloud-sdk` | 0.1.0 | npm | SaaS API client |
| `etapsky-sdf` | 0.1.1 | PyPI | Python SDK |

**sdf-cli binary dağıtımı:** macOS arm64/x64 · Linux x64/arm64 — 4 platform, GitHub Releases üzerinden.

---

## 14. F5+ Roadmap (Bilgi İçin)

Mevcut çalışma F1–F4'ü kapsar. Tamamlandı.

Planlanan fazlar:
- **F5:** Etapsky Docs (docs.etapsky.com) — format spec, API referans, öğretici
- **F6:** GA SaaS Launch — billing, subscription, public API
- **F7:** Marketplace, G2G entegrasyonlar, ISO standardizasyon süreci

---

## 15. Local Development

```bash
# Repo klonlama
git clone https://github.com/etapsky/sdf
cd sdf
bun install  # npm değil, bun kullan

# Bağımlılıklar (Docker gerekli)
# PostgreSQL ve Redis native çalışır (Docker dışında)
# MinIO Docker Compose ile ayağa kalkar
docker compose up -d  # apps/sdf-server/ veya packages/sdf-server-core/ altında

# MinIO UI: http://localhost:9001
# API:      http://localhost:3000
# Health:   http://localhost:3000/health

# Test
bun run test               # Vitest
bun run test:coverage      # ≥80% coverage gate

# Build
bun run build              # Turborepo
```

---

## 16. Kritik Hatırlatmalar — Her Oturumda Oku

- **`sdf-server-core` hem open-source (apps/sdf-server) hem SaaS (sdf-cloud/apps/api) tarafından kullanılır.** Cloud-specific logic core'a sızmamalıdır.
- **BullMQ job'ları idempotent olmalıdır.** Aynı job iki kez çalışırsa veri bozulmamalıdır.
- **S3/MinIO client'ı native `fetch()` + AWS SigV4 kullanır.** `@aws-sdk/client-s3` bağımlılığı ekleme.
- **Tüm para miktarları `{ amount: string, currency: string }` formatındadır.** Floating point kullanılmaz.
- **ZIP erişimi `packContainer`/`unpackContainer` abstraction'ı ile yapılır.** Direkt JSZip çağrısı yapma.
- **`document_id` iş mantığından türetilmez.** Her zaman `crypto.randomUUID()`.
- **`schema.json` arşive gömülür.** URL referansı yasaktır.
- **`sdf-cloud/apps/api` route'ları `/v1/` prefix'lidir.** `sdf-server-core` route'ları prefix'siz çalışır — karıştırma.
- **sdf-cloud schema'ları `db/schema/` altında modüler dosyalardadır** (`users.ts`, `billing.ts`). `sdf-server-core`'dakinden farklı yapı.
- **Spec kazanır.** Kod davranışı `spec/SDF_FORMAT.md` ile çelişiyorsa spec geçerlidir. Spec belirsizse kendi kararını verme — GitHub issue aç.
- **`any` yasaktır.** TypeScript strict mode. `@ts-ignore` kullanımı belgelenmiş gerekçe olmadan kabul edilmez.

---

## 17. SDF Hata Kodları — Standart

Tüm SDF işlemleri bu hata kodlarını kullanmalıdır. `spec/SDF_FORMAT.md` Bölüm 12'yi güncellemeden yeni kod icat etme.

```typescript
// packages/sdf-kit/src/core/errors.ts

SDF_ERROR_NOT_ZIP              // Dosya ZIP arşivi değil
SDF_ERROR_INVALID_META         // meta.json şema doğrulaması başarısız
SDF_ERROR_MISSING_FILE         // Zorunlu dosya arşivde yok (visual.pdf, data.json, schema.json, meta.json)
SDF_ERROR_SCHEMA_MISMATCH      // data.json, schema.json'a göre doğrulanamadı
SDF_ERROR_INVALID_SCHEMA       // schema.json geçerli JSON Schema değil
SDF_ERROR_UNSUPPORTED_VERSION  // sdf_version desteklenmiyor
SDF_ERROR_INVALID_SIGNATURE    // İmza doğrulaması başarısız
SDF_ERROR_INVALID_ARCHIVE      // Path traversal veya bozuk arşiv
SDF_ERROR_ARCHIVE_TOO_LARGE    // 50 MB / 200 MB uncompressed limitini aştı
```

---

## 18. Anti-Pattern'ler ve Doğru Pattern'ler

### ❌ Asla Yapma

```typescript
// ❌ JSZip'i doğrudan çağırma — container abstraction'ını kullan
const zip = new JSZip();

// ❌ İş verisini meta.json'a koyma
meta.invoice_number = "INV-001";

// ❌ SDF metadata'sını data.json'a koyma
data.sdf_version = "0.1";

// ❌ Dış schema URI'larına karşı validate etme
ajv.addSchema(await fetch("https://example.com/schema.json"));

// ❌ Para miktarlarını sayı olarak temsil etme
{ "total": 1250.50 }

// ❌ Tam validasyon geçmeden dosya yazma
fs.writeFileSync("output.sdf", zipBuffer); // validateSchema()'dan önce

// ❌ TypeScript'te any kullanma
const data: any = parseSDF(buffer);

// ❌ visual.pdf'e executable içerik gömmek
// (JS, makro, AcroForm script yasak)

// ❌ AWS SDK kullanma (S3/MinIO için)
import { S3Client } from "@aws-sdk/client-s3";

// ❌ sdf-cloud mantığını sdf-server-core'a sızdırma
// Core paketi cloud'a özgü billing/tenant logic içermemelidir
```

### ✅ Doğru Pattern

```typescript
// ✅ Container abstraction'ını kullan
import { packContainer, unpackContainer } from './core/container';

// ✅ meta ve data'yı ayrı tut
const meta: SDFMeta = { sdf_version, document_id, issuer, issued_at };
const data: InvoiceData = { invoice_number, line_items, totals };

// ✅ Yazmadan önce validate et
const result = validateSchema(data, schema);
if (!result.valid) throw new SDFValidationError(result.errors);
const buffer = await packContainer({ meta, data, schema, pdfBytes });

// ✅ Para miktarları string olarak
{ "amount": "1250.00", "currency": "EUR" }

// ✅ Tarihler ISO 8601 string olarak
{ "issue_date": "2026-03-15" }

// ✅ UUID'ler global identifier için
{ "document_id": crypto.randomUUID() }

// ✅ S3/MinIO için native fetch + SigV4
// storage/s3.ts içinde — dış bağımlılık yok
```

---

*Bu döküman Etapsky SDF projesinin F1–F4 aşamalarını kapsamakta olup Mart 2026 itibarıyla günceldir.*
*Yazar: Yunus YILDIZ · Founder @Etapsky*
*github.com/etapsky · etapsky.com*
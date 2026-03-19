packages/sdf-server-core/
├── src/
│   ├── index.ts            ← tüm modülleri export eder
│   ├── api/
│   │   └── server.ts       ← buildServer() — Fastify instance factory
│   ├── config/
│   │   └── env.ts          ← Zod env schema
│   ├── db/
│   │   ├── schema.ts       ← Drizzle schema
│   │   └── client.ts       ← db + writeAudit()
│   ├── storage/
│   │   └── s3.ts           ← S3Client
│   ├── queue/
│   │   ├── client.ts       ← Redis connection
│   │   └── jobs.ts         ← Queue definitions + workers
│   ├── middleware/
│   │   └── auth.ts         ← authMiddleware, generateApiKey, signJWT
│   ├── routes/             ← tüm route handler'ları
│   │   ├── sdf.ts
│   │   ├── sign.ts
│   │   ├── validate.ts
│   │   ├── schema.ts
│   │   ├── admin.ts
│   │   ├── saml.ts
│   │   └── connectors.ts
│   └── connectors/         ← ERP connectors
│       ├── index.ts
│       ├── base/
│       ├── sap/
│       └── oracle/
└── package.json            ← @etapsky/sdf-server-core



----------

apps/sdf-server/
├── src/
│   └── index.ts            ← 20 satır
├── docker-compose.yml
├── .env.example
└── package.json

------------
Projeyi ve tüm bağımlılıkları gördükten sonra net tavsiyem şu:

---

## En Temiz Çözüm: `sdf-server-core` paketi

---

### Mantık

`sdf-server` şu an iki farklı ihtiyacı karşılıyor:

```
sdf-server = iş mantığı + bootstrap
             (routes, connectors, db, queue, storage, auth)
             +
             (index.ts, docker-compose, .env)
```

`sdf-cloud-api` sadece iş mantığını istiyor — bootstrap'i değil. O yüzden iş mantığını ayrı bir pakete çıkarmak doğru.

---

### Yeni yapı

```
packages/
├── sdf-kit                 ← @etapsky/sdf-kit (npm) ✅
├── sdf-cli                 ← @etapsky/sdf-cli (npm) ✅
├── sdf-schema-registry     ← @etapsky/sdf-schema-registry (npm) ✅
├── sdf-python              ← etapsky-sdf (PyPI) ✅
└── sdf-server-core         ← @etapsky/sdf-server-core (npm) ← YENİ

apps/
├── demo-web                ← ✅
├── demo-reader             ← ✅
└── sdf-server              ← sdf-server-core'u import eder, standalone deploy
```

```
etapsky/sdf-cloud (ayrı repo)
└── apps/
    └── api                 ← sdf-server-core'u import eder, SaaS katmanı ekler
```

---

### `sdf-server-core` içeriği

```
packages/sdf-server-core/
├── src/
│   ├── index.ts            ← tüm modülleri export eder
│   ├── api/
│   │   └── server.ts       ← buildServer() — Fastify instance factory
│   ├── config/
│   │   └── env.ts          ← Zod env schema
│   ├── db/
│   │   ├── schema.ts       ← Drizzle schema
│   │   └── client.ts       ← db + writeAudit()
│   ├── storage/
│   │   └── s3.ts           ← S3Client
│   ├── queue/
│   │   ├── client.ts       ← Redis connection
│   │   └── jobs.ts         ← Queue definitions + workers
│   ├── middleware/
│   │   └── auth.ts         ← authMiddleware, generateApiKey, signJWT
│   ├── routes/             ← tüm route handler'ları
│   │   ├── sdf.ts
│   │   ├── sign.ts
│   │   ├── validate.ts
│   │   ├── schema.ts
│   │   ├── admin.ts
│   │   ├── saml.ts
│   │   └── connectors.ts
│   └── connectors/         ← ERP connectors
│       ├── index.ts
│       ├── base/
│       ├── sap/
│       └── oracle/
└── package.json            ← @etapsky/sdf-server-core
```

---

### `apps/sdf-server` içeriği — sadece bootstrap

```
apps/sdf-server/
├── src/
│   └── index.ts            ← 20 satır
├── docker-compose.yml
├── .env.example
└── package.json
```

`index.ts` şöyle görünür:

```typescript
import { buildServer, startWorkers, registerConnectors } from '@etapsky/sdf-server-core'
import { redis } from '@etapsky/sdf-server-core/queue'
import { env } from '@etapsky/sdf-server-core/config'

await redis.connect()
registerConnectors()
startWorkers()

const server = await buildServer()
await server.listen({ port: env.PORT, host: env.HOST })
```

---

### `sdf-cloud-api/src/index.ts` şöyle görünür:

```typescript
import { buildServer, startWorkers, registerConnectors } from '@etapsky/sdf-server-core'
import { billingRoutes } from './routes/billing.js'
import { onboardingRoutes } from './routes/onboarding.js'

const server = await buildServer({
  // ek route'lar inject edilir
  extraRoutes: [billingRoutes, onboardingRoutes],
})
```

---

### Paket yayın tablosu

| Paket | Registry | Kim kullanır |
|---|---|---|
| `@etapsky/sdf-kit` | npm | herkes |
| `@etapsky/sdf-cli` | npm | developer, CI |
| `@etapsky/sdf-schema-registry` | npm | herkes |
| `@etapsky/sdf-server-core` | npm | sdf-server, sdf-cloud-api |
| `etapsky-sdf` | PyPI | Python kullanıcıları |
| `sdf` | Homebrew | macOS/Linux kullanıcıları |

`apps/sdf-server` ve `sdf-cloud-api` npm'e çıkmaz — deploy edilir.

---

### Neden bu yapı doğru

**Gereksiz karmaşıklık yok** — sadece bir paket ekleniyor. `sdf-server` ikiye bölünmüyor, yeni bir abstraction katmanı gelmiyor.

**Bağımlılık temiz** — `sdf-cloud-api` npm'den resmi bir pakete bağımlı, `file:` path yok, CI kırılmıyor.

**Genişletilebilir** — ileride üçüncü bir deployment (örn. on-premise enterprise kurulum) da `sdf-server-core`'u import edip kendi bootstrap'ini yazabilir.

**Test edilebilir** — `sdf-server-core` kendi testlerine sahip olabilir, her iki deployment da aynı test edilmiş kodu çalıştırır.

---

`buildServer()` fonksiyonuna `extraRoutes` inject mekanizması ekleyeyim mi, yoksa önce `sdf-server-core` paketini oluşturalım mı?
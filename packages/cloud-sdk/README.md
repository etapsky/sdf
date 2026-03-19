# @etapsky/cloud-sdk

Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

Typed API client for api.etapsky.com.

```typescript
import { SdfCloudClient } from '@etapsky/cloud-sdk'

const client = new SdfCloudClient({
  baseUrl: 'https://api.etapsky.com',
  apiKey: 'sdf_xxx',
})

const docs = await client.list()
const usage = await client.getUsage()
```

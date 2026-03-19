// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { SdfCloudClient } from '@etapsky/cloud-sdk'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function createClient(apiKey: string) {
  return new SdfCloudClient({ baseUrl: API_BASE, apiKey })
}

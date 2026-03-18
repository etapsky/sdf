// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** Browser shim for Node crypto — provides randomUUID via Web Crypto API */
export const randomUUID = (): string => globalThis.crypto.randomUUID()

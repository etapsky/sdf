/** Browser shim for Node crypto — provides randomUUID via Web Crypto API */
export const randomUUID = (): string => globalThis.crypto.randomUUID()

/**
 * Cryptographically random bytes. This file is used by Vitest (Node), which has Web Crypto; the
 * app uses `random.native.ts` (Metro picks it for iOS and Android).
 */
export function randomBytes(count: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(count));
}

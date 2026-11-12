import { getRandomBytes } from "expo-crypto";

/** Cryptographically random bytes from the platform (see `random.ts` for the test version). */
export function randomBytes(count: number): Uint8Array {
  return getRandomBytes(count);
}

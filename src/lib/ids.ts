import { randomBytes } from "./random";

/**
 * Record ids: UUID v7, with the creation time in the first
 * 48 bits. Ids from one generator are strictly increasing, even within one millisecond (a 12-bit
 * counter, RFC 9562 method 1), so lists ordered by id keep creation order, and a newer id is always higher
 * than an older one (useful to break `updatedAt` ties if you add a sync later).
 */
export function createUuidV7Generator(
  random: (count: number) => Uint8Array = randomBytes
): (now?: number) => string {
  let lastTime = -1;
  let counter = 0;

  return (now = Date.now()) => {
    let time = Math.max(0, Math.floor(now));
    if (time > lastTime) {
      // Start low in the counter's range so there is room to count up in the same millisecond.
      const seed = random(2);
      counter = ((seed[0] << 8) | seed[1]) & 0x7ff;
    } else {
      time = lastTime;
      counter++;
      if (counter > 0xfff) {
        // More than 2048 ids in one millisecond: borrow the next millisecond.
        time++;
        counter = 0;
      }
    }
    lastTime = time;

    const bytes = new Uint8Array(16);
    for (let i = 5, rest = time; i >= 0; i--) {
      bytes[i] = rest % 256;
      rest = Math.floor(rest / 256);
    }
    bytes[6] = 0x70 | (counter >> 8); // version 7 and the counter's high bits
    bytes[7] = counter & 0xff;
    bytes.set(random(8), 8);
    bytes[8] = 0x80 | (bytes[8] & 0x3f); // RFC 9562 variant
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}

const generate = createUuidV7Generator();

/** A new record id (UUIDv7: sortable by creation time). */
export function newId(): string {
  return generate();
}

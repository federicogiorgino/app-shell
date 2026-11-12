import { describe, expect, test } from "vitest";

import { createUuidV7Generator, newId } from "./ids";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ones = (count: number): Uint8Array => new Uint8Array(count).fill(0xff);

describe("ids", () => {
  test("uuidv7 has the version and variant bits and the time prefix", () => {
    const id = createUuidV7Generator(ones)(0x0123_4567_89ab);
    expect(id).toMatch(UUID_V7);
    expect(id.startsWith("01234567-89ab-7")).toBe(true);
  });

  test("ids from different milliseconds sort by time", () => {
    const generate = createUuidV7Generator(ones);
    expect(generate(1_700_000_000_000) < generate(1_700_000_000_001)).toBe(true);
  });

  test("ids in the same millisecond still increase, past the counter's range", () => {
    const generate = createUuidV7Generator(ones);
    const ids = Array.from({ length: 5000 }, () => generate(1_700_000_000_000));
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(UUID_V7);
  });

  test("ids never go backwards when the clock does", () => {
    const generate = createUuidV7Generator();
    const later = generate(1_700_000_000_500);
    expect(generate(1_700_000_000_000) > later).toBe(true);
  });

  test("newId is random and increasing", () => {
    const ids = Array.from({ length: 100 }, () => newId());
    expect(new Set(ids).size).toBe(100);
    expect([...ids].sort()).toEqual(ids);
  });
});

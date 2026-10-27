import { describe, expect, it } from "bun:test";

import { normalizePostcode } from "../src/lib/postcode";

// The user-facing rule: a NIPOST postcode is 12 characters in 5 segments
// (SS NN DDD AA NN) and the app must accept any common separator style.
describe("normalizePostcode", () => {
  it("accepts the hyphenated format unchanged", () => {
    expect(normalizePostcode("FC-01-A01-KP-27")).toBe("FC-01-A01-KP-27");
  });

  it("accepts space-separated input", () => {
    expect(normalizePostcode("FC 01 A01 KP 27")).toBe("FC-01-A01-KP-27");
  });

  it("accepts a compact 12-character code", () => {
    expect(normalizePostcode("FC01A01KP27")).toBe("FC-01-A01-KP-27");
  });

  it("uppercases lowercase input", () => {
    expect(normalizePostcode("fc-01-a01-kp-27")).toBe("FC-01-A01-KP-27");
  });

  it("rejects codes that are too short", () => {
    expect(normalizePostcode("FC-01-A01-KP")).toBeNull();
  });

  it("rejects codes with a wrong segment shape", () => {
    expect(normalizePostcode("FC-01-0011-KP-27")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(normalizePostcode("")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  SESSION_EXPIRY_BUFFER_MS,
  isSessionExpired,
} = require("../src/session-expiry-utils.js");

describe("SESSION_EXPIRY_BUFFER_MS", () => {
  it("is a 5-minute skew buffer", () => {
    expect(SESSION_EXPIRY_BUFFER_MS).toBe(300000);
  });
});

describe("isSessionExpired", () => {
  const now = 1_700_000_000_000;

  it("returns false when expires_at is missing/falsy (historical short-circuit)", () => {
    expect(isSessionExpired(null, now)).toBe(false);
    expect(isSessionExpired(undefined, now)).toBe(false);
    expect(isSessionExpired(0, now)).toBe(false);
  });

  it("returns false when more than the buffer remains", () => {
    expect(isSessionExpired(now + SESSION_EXPIRY_BUFFER_MS + 1, now)).toBe(false);
    expect(isSessionExpired(now + 60 * 60 * 1000, now)).toBe(false);
  });

  it("treats exact buffer edge as fresh; expires strictly inside the window", () => {
    // expires_at - buffer < now  ⇒  expires_at < now + buffer
    expect(isSessionExpired(now + SESSION_EXPIRY_BUFFER_MS, now)).toBe(false);
    expect(isSessionExpired(now + SESSION_EXPIRY_BUFFER_MS - 1, now)).toBe(true);
    expect(isSessionExpired(now, now)).toBe(true);
    expect(isSessionExpired(now - 1, now)).toBe(true);
  });
});

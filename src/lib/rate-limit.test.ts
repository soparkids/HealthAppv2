import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  clearRateLimit,
  AUTH_RATE_LIMIT,
  API_RATE_LIMIT,
} from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Clear any leftover state between tests
    clearRateLimit("test-key");
    clearRateLimit("other-key");
  });

  it("allows the first request", () => {
    const result = checkRateLimit("test-key", { maxAttempts: 5, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfterMs).toBe(0);
  });

  it("decrements remaining count on each request", () => {
    const config = { maxAttempts: 3, windowMs: 60000 };

    const r1 = checkRateLimit("test-key", config);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit("test-key", config);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit("test-key", config);
    expect(r3.remaining).toBe(0);
  });

  it("blocks after max attempts exceeded", () => {
    const config = { maxAttempts: 2, windowMs: 60000 };

    checkRateLimit("test-key", config); // 1st
    checkRateLimit("test-key", config); // 2nd (hits max)

    const blocked = checkRateLimit("test-key", config); // 3rd — should be blocked
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks different keys independently", () => {
    const config = { maxAttempts: 1, windowMs: 60000 };

    checkRateLimit("test-key", config); // exhaust key A
    const blockedA = checkRateLimit("test-key", config);
    expect(blockedA.allowed).toBe(false);

    const allowedB = checkRateLimit("other-key", config); // key B should still work
    expect(allowedB.allowed).toBe(true);
  });

  it("returns retryAfterMs when blocked", () => {
    const config = { maxAttempts: 1, windowMs: 30000 };

    checkRateLimit("test-key", config);
    const blocked = checkRateLimit("test-key", config);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(30000);
  });
});

describe("clearRateLimit", () => {
  it("resets the counter for a key", () => {
    const config = { maxAttempts: 1, windowMs: 60000 };

    checkRateLimit("test-key", config);
    const blocked = checkRateLimit("test-key", config);
    expect(blocked.allowed).toBe(false);

    clearRateLimit("test-key");

    const afterClear = checkRateLimit("test-key", config);
    expect(afterClear.allowed).toBe(true);
    expect(afterClear.remaining).toBe(0);
  });

  it("does not throw for non-existent keys", () => {
    expect(() => clearRateLimit("nonexistent")).not.toThrow();
  });
});

describe("preset configs", () => {
  it("AUTH_RATE_LIMIT allows 5 attempts in 15 minutes", () => {
    expect(AUTH_RATE_LIMIT.maxAttempts).toBe(5);
    expect(AUTH_RATE_LIMIT.windowMs).toBe(15 * 60 * 1000);
  });

  it("API_RATE_LIMIT allows 100 requests per minute", () => {
    expect(API_RATE_LIMIT.maxAttempts).toBe(100);
    expect(API_RATE_LIMIT.windowMs).toBe(60 * 1000);
  });
});

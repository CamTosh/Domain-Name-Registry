import { expect, test, describe } from "bun:test";
import { checkRateLimit } from "../../src/utils/rate-limit";

describe("Rate Limit", () => {
  test("should allow requests within limit", () => {
    const rateLimitMap = new Map();
    const clientIP = "127.0.0.1";

    for (let i = 0; i < 100; i++) {
      expect(checkRateLimit(clientIP, rateLimitMap)).toBe(true);
    }
  });

  test("should block requests over limit", () => {
    const rateLimitMap = new Map();
    const clientIP = "127.0.0.1";

    for (let i = 0; i < 101; i++) {
      checkRateLimit(clientIP, rateLimitMap);
    }

    expect(checkRateLimit(clientIP, rateLimitMap)).toBe(false);
  });
});

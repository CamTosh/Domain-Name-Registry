import { expect, test, describe } from "bun:test";
import { UsageManager } from "../usage";

describe("Usage Manager", () => {
  test("should allow requests within limits", async () => {
    const usage = new UsageManager({
      requestsPerMinute: 5,
      requestsPerHour: 10
    });

    const result = await usage.checkUsage("test1");
    expect(result.allowed).toBe(true);
    expect(result.delay).toBe(0);
    expect(result.penaltyTokens).toBe(0);
  });

  test("should block excessive requests", async () => {
    const usage = new UsageManager({
      requestsPerMinute: 2,
      requestsPerHour: 5
    });

    // Make 3 requests
    for (let i = 0; i < 3; i++) {
      await usage.checkUsage("test1");
    }

    const result = await usage.checkUsage("test1");
    expect(result.allowed).toBe(false);
  });
});

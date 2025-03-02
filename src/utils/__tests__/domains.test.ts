import { expect, test, describe } from "bun:test";
import { isValidDomain } from "../domains";
import { generateDomainScore } from "../domains";

describe("Domain Validation", () => {
  describe("Valid Domains", () => {
    const validDomains = [
      'example.tsh',
      'test123.tsh',
      'my-domain.tsh',
      'a-b-c.tsh',
      '123.tsh',
      'domain-with-58-characters-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.tsh',
      'xn--hello.tsh', // IDN/punycode
      'ab.tsh',        // Minimum length (2 chars + .tsh)
    ];

    test.each(validDomains)('should accept valid domain: %s', (domain) => {
      expect(isValidDomain(domain)).toBe(true);
    });
  });

  describe("Invalid Domains", () => {
    const invalidDomains = [
      // Wrong TLD
      { domain: 'example.com', reason: 'wrong TLD' },
      { domain: 'example.tsh.com', reason: 'additional TLD' },
      { domain: 'example.ts', reason: 'incomplete TLD' },

      // Invalid characters
      { domain: 'example!.tsh', reason: 'special characters' },
      { domain: 'héllo.tsh', reason: 'accented characters' },
      { domain: 'hello_.tsh', reason: 'underscore' },
      { domain: 'hello space.tsh', reason: 'space' },
      { domain: 'hello/path.tsh', reason: 'slash' },
      { domain: 'hello@.tsh', reason: 'at symbol' },

      // Invalid structure
      { domain: '-example.tsh', reason: 'starts with hyphen' },
      { domain: 'example-.tsh', reason: 'ends with hyphen' },
      { domain: 'ex--ample.tsh', reason: 'consecutive hyphens' },

      // Length issues
      { domain: 'a.tsh', reason: 'too short (1 char)' },
      { domain: '.tsh', reason: 'empty name' },
      { domain: 'domain-with-64-characters-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.tsh', reason: 'too long (>63 chars)' },

      // Invalid formats
      { domain: 'example.', reason: 'ends with dot' },
      { domain: '.example.tsh', reason: 'starts with dot' },
      { domain: 'exam..ple.tsh', reason: 'consecutive dots' },
      { domain: '', reason: 'empty string' },
      { domain: '.tsh', reason: 'only TLD' },
    ];

    test.each(invalidDomains)("should reject invalid domain: $domain", ({ domain }) => {
      expect(isValidDomain(domain)).toBe(false);
    });

  });
});

describe.skip("Domain Score Generation", () => {
  test("should generate scores within valid range", () => {
    const score = generateDomainScore();
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("should follow expected distribution", () => {
    const iterations = 10000;
    const scores: number[] = [];

    for (let i = 0; i < iterations; i++) {
      scores.push(generateDomainScore());
    }

    const distribution = {
      rare: scores.filter(s => s >= 90).length / iterations * 100,
      valuable: scores.filter(s => s >= 70 && s < 90).length / iterations * 100,
      average: scores.filter(s => s >= 30 && s < 70).length / iterations * 100,
      low: scores.filter(s => s < 30).length / iterations * 100
    };
    const marginOfError = 1; // Allow 1% deviation

    // Check each category with margin of error
    expect(Math.abs(distribution.rare - 5)).toBeLessThan(marginOfError);
    expect(Math.abs(distribution.valuable - 15)).toBeLessThan(marginOfError);
    expect(Math.abs(distribution.average - 60)).toBeLessThan(marginOfError);
    expect(Math.abs(distribution.low - 20)).toBeLessThan(marginOfError);

    // Also verify total is 100%
    const total = distribution.rare + distribution.valuable +
      distribution.average + distribution.low;
    expect(Math.abs(total - 100)).toBeLessThan(marginOfError);
  });
});

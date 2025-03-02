import { expect, test, describe } from "bun:test";
import { isValidDomain } from "../domains";

describe("Domain Validation", () => {
  describe("Valid Domains", () => {
    const validDomains = [
      'example.tsh',
      'test123.tsh',
      'my-domain.tsh',
      'a-b-c.tsh',
      '123.tsh',
      'domain-with-63-characters-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.tsh',
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

      // Case sensitivity
      { domain: 'EXAMPLE.TSH', reason: 'uppercase' },
      { domain: 'Example.tsh', reason: 'mixed case' },

      // Invalid formats
      { domain: 'example.', reason: 'ends with dot' },
      { domain: '.example.tsh', reason: 'starts with dot' },
      { domain: 'exam..ple.tsh', reason: 'consecutive dots' },
      { domain: '', reason: 'empty string' },
      { domain: '.tsh', reason: 'only TLD' },
    ];

    test.each(invalidDomains)('should reject invalid domain: $domain ($reason)', ({ domain }) => {
      expect(isValidDomain(domain)).toBe(false);
    });
  });
});


const BASE_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export function isValidDomain(domain: string): boolean {
  domain = domain.toLowerCase();

  if (!domain || !domain.endsWith('.tsh')) {
    return false;
  }

  const namePart = domain.slice(0, -4);
  if (namePart.length < 2 || domain.length > 63) {
    return false;
  }

  // Check for IDN (xn-- prefix)
  if (namePart.startsWith('xn--')) {
    return true;
  }

  if (namePart.includes('--')) {
    return false;
  }

  if (namePart.startsWith('-') || namePart.endsWith('-')) {
    return false;
  }

  // Check for invalid characters
  if (!/^[a-z0-9-]+$/.test(namePart)) {
    return false;
  }

  return BASE_DOMAIN_REGEX.test(namePart);
}

export function calculateExpiryDate(): number {
  const date = new Date();
  date.setDate(date.getDate() + 10);

  return date.getTime();
}

export function generateDomainScore(): number {
  const distribution = [
    { min: 90, max: 100, weight: 5 },   // Rare high-value
    { min: 70, max: 89, weight: 15 },   // Uncommon valuable
    { min: 30, max: 69, weight: 60 },   // Common average
    { min: 1, max: 29, weight: 20 }     // Common low-value
  ];

  // Generate weighted random number
  let random = Math.random() * 100;
  let cumulativeWeight = 0;

  for (const range of distribution) {
    cumulativeWeight += range.weight;
    if (random <= cumulativeWeight) {
      // Use triangular distribution within each range for more natural spread
      const u = Math.random();
      const v = Math.random();
      const triangular = (u + v) / 2; // Creates bell-curve like distribution

      const rangeSize = range.max - range.min + 1;
      const score = Math.floor(triangular * rangeSize) + range.min;

      // Ensure score stays within bounds
      return Math.min(Math.max(score, range.min), range.max);
    }
  }

  // Fallback (should never reach here due to weights summing to 100)
  return Math.floor(Math.random() * 100) + 1;
}

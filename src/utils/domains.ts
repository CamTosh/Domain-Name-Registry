
export const VALID_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.tsh$/;

export function isValidDomain(domain: string): boolean {
  // Convert to lowercase for consistency
  domain = domain.toLowerCase();

  // Basic validation
  if (!domain.endsWith('.tsh')) {
    return false;
  }

  // Check length (2-63 chars for name part, excluding .tsh)
  const namePart = domain.slice(0, -4);
  if (namePart.length < 2 || namePart.length > 63) {
    return false;
  }

  // Check against regex pattern
  return VALID_DOMAIN_REGEX.test(domain);
}

export function calculateExpiryDate(): number {
  const date = new Date();
  date.setDate(date.getDate() + 10);

  return date.getTime();
}

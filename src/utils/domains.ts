
export const VALID_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.tsh$/;
export const MAX_REGISTRATION_DAYS = 10;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

export function calculateExpiryDate(registrationDays: number = MAX_REGISTRATION_DAYS): number {
  if (registrationDays <= 0 || registrationDays > MAX_REGISTRATION_DAYS) {
    registrationDays = MAX_REGISTRATION_DAYS;
  }

  return Date.now() + (registrationDays * MS_PER_DAY);
}

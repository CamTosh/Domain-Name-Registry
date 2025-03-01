export function checkRateLimit(clientIP: string, rateLimitMap: Map<string, any>) {
  const now = Date.now();
  const limit = rateLimitMap.get(clientIP) || { count: 0, timestamp: now };

  // Reset counter if more than a minute has passed
  if (now - limit.timestamp > 60000) {
    limit.count = 1;
    limit.timestamp = now;
  } else {
    limit.count++;
  }

  // Check if limit exceeded BEFORE incrementing
  if (limit.count > 100) {
    rateLimitMap.set(clientIP, limit);
    return false;
  }

  rateLimitMap.set(clientIP, limit);
  return true;
}

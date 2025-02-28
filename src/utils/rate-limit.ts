export function checkRateLimit(clientIP: string, rateLimitMap: Map<string, any>) {
  const now = Date.now();
  const limit = rateLimitMap.get(clientIP) || { count: 0, timestamp: now };

  if (now - limit.timestamp > 60000) {
    limit.count = 1;
    limit.timestamp = now;
  } else if (limit.count > 100) {
    return false;
  } else {
    limit.count++;
  }

  rateLimitMap.set(clientIP, limit);
  return true;
}

interface UsageConfig {
  requestsPerHour: number;
  requestsPerMinute: number;
  penaltyThreshold: number;
  penaltyDelay: number;
  penaltyTokens: number;
}

interface UsageStats {
  minuteRequests: number;
  hourRequests: number;
  lastMinuteReset: number;
  lastHourReset: number;
  penalties: number;
}

export class UsageManager {
  private usage: Map<string, UsageStats> = new Map();
  private config: UsageConfig;

  constructor(config: Partial<UsageConfig> = {}) {
    this.config = {
      requestsPerHour: 1000,
      requestsPerMinute: 100,
      penaltyThreshold: 3,  // Number of limit hits before penalty
      penaltyDelay: 2000,   // Delay in ms
      penaltyTokens: 5,     // Tokens consumed as penalty
      ...config
    };
  }

  private getOrCreateStats(registrarId: string): UsageStats {
    if (!this.usage.has(registrarId)) {
      this.usage.set(registrarId, {
        minuteRequests: 0,
        hourRequests: 0,
        lastMinuteReset: Date.now(),
        lastHourReset: Date.now(),
        penalties: 0
      });
    }
    return this.usage.get(registrarId)!;
  }

  private resetCountersIfNeeded(stats: UsageStats) {
    const now = Date.now();

    if (now - stats.lastMinuteReset >= 60000) {
      stats.minuteRequests = 0;
      stats.lastMinuteReset = now;
    }

    if (now - stats.lastHourReset >= 3600000) {
      stats.hourRequests = 0;
      stats.lastHourReset = now;
      stats.penalties = 0; // Reset penalties every hour
    }
  }

  checkUsage(registrarId: string): { allowed: boolean; delay: number; penaltyTokens: number; } {
    const stats = this.getOrCreateStats(registrarId);
    this.resetCountersIfNeeded(stats);

    stats.minuteRequests++;
    stats.hourRequests++;

    // Check limits
    if (stats.minuteRequests > this.config.requestsPerMinute ||
      stats.hourRequests > this.config.requestsPerHour) {
      stats.penalties++;

      // Apply penalties if threshold exceeded
      if (stats.penalties >= this.config.penaltyThreshold) {
        return {
          allowed: true,
          delay: this.config.penaltyDelay,
          penaltyTokens: this.config.penaltyTokens
        };
      }

      return { allowed: false, delay: 0, penaltyTokens: 0 };
    }

    return { allowed: true, delay: 0, penaltyTokens: 0 };
  }

  getStats(registrarId: string): UsageStats | undefined {
    return this.usage.get(registrarId);
  }
}

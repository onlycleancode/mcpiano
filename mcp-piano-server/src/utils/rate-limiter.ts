/**
 * Rate Limiter for Piano Server
 * Prevents message flooding and manages request rates
 */

import { EventEmitter } from "events";
import type {
  RateLimitConfig,
  PerformanceEvent,
} from "../types/performance.js";

interface RateLimitEntry {
  timestamps: number[];
  violations: number;
  lastViolation: number;
}

export class RateLimiter extends EventEmitter {
  private config: RateLimitConfig;
  private clientLimits: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    super();
    this.config = config;
    this.clientLimits = new Map();

    // Clean up old entries every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30000);
  }

  /**
   * Check if a client is allowed to send a message
   * Returns true if allowed, false if rate limited
   */
  public isAllowed(clientId: string): boolean {
    if (!this.config.enableRateLimit) {
      return true;
    }

    const now = Date.now();
    const entry = this.getOrCreateEntry(clientId);

    // Remove old timestamps outside the window
    entry.timestamps = entry.timestamps.filter(
      (timestamp) => now - timestamp < this.config.windowSize
    );

    // Check if we're within the rate limit
    if (entry.timestamps.length < this.config.maxMessagesPerSecond) {
      // Allow the message and record timestamp
      entry.timestamps.push(now);
      return true;
    }

    // Check burst limit
    if (entry.timestamps.length < this.config.maxBurstSize) {
      entry.timestamps.push(now);
      return true;
    }

    // Rate limit exceeded
    entry.violations++;
    entry.lastViolation = now;

    // Emit rate limit event
    this.emitRateLimitEvent(clientId, entry);

    return false;
  }

  /**
   * Get rate limit statistics for a client
   */
  public getClientStats(clientId: string): {
    messagesInWindow: number;
    violations: number;
    lastViolation: number;
    remainingCapacity: number;
  } {
    const entry = this.clientLimits.get(clientId);
    if (!entry) {
      return {
        messagesInWindow: 0,
        violations: 0,
        lastViolation: 0,
        remainingCapacity: this.config.maxMessagesPerSecond,
      };
    }

    const now = Date.now();
    const recentMessages = entry.timestamps.filter(
      (timestamp) => now - timestamp < this.config.windowSize
    );

    return {
      messagesInWindow: recentMessages.length,
      violations: entry.violations,
      lastViolation: entry.lastViolation,
      remainingCapacity: Math.max(
        0,
        this.config.maxMessagesPerSecond - recentMessages.length
      ),
    };
  }

  /**
   * Get global rate limit statistics
   */
  public getGlobalStats(): {
    totalClients: number;
    totalViolations: number;
    averageMessagesPerSecond: number;
    topViolators: Array<{ clientId: string; violations: number }>;
  } {
    let totalViolations = 0;
    let totalMessages = 0;
    const violators: Array<{ clientId: string; violations: number }> = [];

    const now = Date.now();

    for (const [clientId, entry] of this.clientLimits.entries()) {
      totalViolations += entry.violations;

      const recentMessages = entry.timestamps.filter(
        (timestamp) => now - timestamp < this.config.windowSize
      );
      totalMessages += recentMessages.length;

      if (entry.violations > 0) {
        violators.push({ clientId, violations: entry.violations });
      }
    }

    // Sort violators by violation count
    violators.sort((a, b) => b.violations - a.violations);

    return {
      totalClients: this.clientLimits.size,
      totalViolations,
      averageMessagesPerSecond:
        this.clientLimits.size > 0 ? totalMessages / this.clientLimits.size : 0,
      topViolators: violators.slice(0, 10), // Top 10 violators
    };
  }

  /**
   * Reset rate limit data for a client
   */
  public resetClient(clientId: string): void {
    this.clientLimits.delete(clientId);
  }

  /**
   * Reset all rate limit data
   */
  public resetAll(): void {
    this.clientLimits.clear();
  }

  /**
   * Update rate limit configuration
   */
  public updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a client is currently rate limited
   */
  public isRateLimited(clientId: string): boolean {
    if (!this.config.enableRateLimit) {
      return false;
    }

    const entry = this.clientLimits.get(clientId);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    const recentMessages = entry.timestamps.filter(
      (timestamp) => now - timestamp < this.config.windowSize
    );

    return recentMessages.length >= this.config.maxMessagesPerSecond;
  }

  /**
   * Get the time until a client can send another message
   */
  public getTimeUntilAllowed(clientId: string): number {
    if (!this.isRateLimited(clientId)) {
      return 0;
    }

    const entry = this.clientLimits.get(clientId);
    if (!entry || entry.timestamps.length === 0) {
      return 0;
    }

    // Find the oldest timestamp in the current window
    const now = Date.now();
    const oldestInWindow = Math.min(
      ...entry.timestamps.filter(
        (timestamp) => now - timestamp < this.config.windowSize
      )
    );

    // Time until the oldest message expires from the window
    return Math.max(0, this.config.windowSize - (now - oldestInWindow));
  }

  /**
   * Get or create a rate limit entry for a client
   */
  private getOrCreateEntry(clientId: string): RateLimitEntry {
    let entry = this.clientLimits.get(clientId);
    if (!entry) {
      entry = {
        timestamps: [],
        violations: 0,
        lastViolation: 0,
      };
      this.clientLimits.set(clientId, entry);
    }
    return entry;
  }

  /**
   * Emit a rate limit event
   */
  private emitRateLimitEvent(clientId: string, entry: RateLimitEntry): void {
    const event: PerformanceEvent = {
      type: "error",
      timestamp: Date.now(),
      data: {
        clientId,
        violations: entry.violations,
        messagesInWindow: entry.timestamps.length,
        maxAllowed: this.config.maxMessagesPerSecond,
      },
      severity: entry.violations > 10 ? "critical" : "warning",
    };

    this.emit("rateLimitExceeded", event);
    this.emit("performance", event);
  }

  /**
   * Clean up old entries and timestamps
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredThreshold = now - this.config.windowSize * 2; // Keep data for 2 windows

    for (const [clientId, entry] of this.clientLimits.entries()) {
      // Remove old timestamps
      entry.timestamps = entry.timestamps.filter(
        (timestamp) => timestamp > expiredThreshold
      );

      // Remove entries with no recent activity
      if (
        entry.timestamps.length === 0 &&
        entry.lastViolation < expiredThreshold
      ) {
        this.clientLimits.delete(clientId);
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Destroy the rate limiter and cleanup resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clientLimits.clear();
    this.removeAllListeners();
  }
}

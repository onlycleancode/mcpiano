/**
 * Message Batching System for Piano Server
 * Optimizes message delivery by batching rapid note events
 */

import { EventEmitter } from "events";
import { MessageType, MessagePriority } from "../types/performance.js";
import type {
  EnhancedMessage,
  BatchingConfig,
  PerformanceEvent,
} from "../types/performance.js";

export class MessageBatcher extends EventEmitter {
  private batchQueue: Map<string, EnhancedMessage[]>;
  private batchTimers: Map<string, NodeJS.Timeout>;
  private batchIdCounter: number;
  private config: BatchingConfig;
  private isEnabled: boolean;

  constructor(config: BatchingConfig) {
    super();
    this.batchQueue = new Map();
    this.batchTimers = new Map();
    this.batchIdCounter = 0;
    this.config = config;
    this.isEnabled = config.enableBatching;
  }

  /**
   * Add a message to the batching system
   * Returns true if message was batched, false if sent immediately
   */
  public addMessage(message: EnhancedMessage, clientId: string): boolean {
    // Skip batching if disabled or message is critical priority
    if (
      !this.isEnabled ||
      message.priority >= this.config.priorityThreshold ||
      !message.batchable
    ) {
      this.sendImmediate(message, clientId);
      return false;
    }

    // Get or create batch for this client
    if (!this.batchQueue.has(clientId)) {
      this.batchQueue.set(clientId, []);
    }

    const batch = this.batchQueue.get(clientId)!;
    batch.push(message);

    // Check if batch is full
    if (batch.length >= this.config.maxBatchSize) {
      this.flushBatch(clientId);
      return true;
    }

    // Set timer for batch delay if not already set
    if (!this.batchTimers.has(clientId)) {
      const timer = setTimeout(() => {
        this.flushBatch(clientId);
      }, this.config.maxBatchDelay);

      this.batchTimers.set(clientId, timer);
    }

    return true;
  }

  /**
   * Flush a batch for a specific client
   */
  public flushBatch(clientId: string): void {
    const batch = this.batchQueue.get(clientId);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear timer
    const timer = this.batchTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(clientId);
    }

    // Create batch message
    const batchMessage = this.createBatchMessage(batch, clientId);

    // Emit batch for transmission
    this.emit("batch", batchMessage, clientId);

    // Clear the batch
    this.batchQueue.set(clientId, []);

    // Emit performance event
    this.emitPerformanceEvent("throughput", {
      batchSize: batch.length,
      clientId: clientId,
      timestamp: Date.now(),
    });
  }

  /**
   * Flush all pending batches
   */
  public flushAllBatches(): void {
    for (const clientId of this.batchQueue.keys()) {
      this.flushBatch(clientId);
    }
  }

  /**
   * Send a message immediately without batching
   */
  private sendImmediate(message: EnhancedMessage, clientId: string): void {
    this.emit("immediate", message, clientId);
  }

  /**
   * Create a batch message from individual messages
   */
  private createBatchMessage(
    messages: EnhancedMessage[],
    clientId: string
  ): EnhancedMessage {
    const batchId = this.generateBatchId();

    return {
      id: `batch_${batchId}`,
      type: MessageType.BATCH,
      priority: MessagePriority.HIGH, // Batches get high priority
      timestamp: Date.now(),
      payload: {
        batchId: batchId,
        messageCount: messages.length,
        messages: messages,
        compression: this.shouldCompress(messages),
      },
      batchable: false, // Batches themselves are not batchable
      retryCount: 0,
      maxRetries: 3,
      clientId: clientId,
    };
  }

  /**
   * Determine if batch should be compressed based on size
   */
  private shouldCompress(messages: EnhancedMessage[]): boolean {
    // Compress if batch has more than 10 messages
    return messages.length > 10;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): number {
    return ++this.batchIdCounter;
  }

  /**
   * Update batching configuration
   */
  public updateConfig(config: Partial<BatchingConfig>): void {
    this.config = { ...this.config, ...config };
    this.isEnabled = this.config.enableBatching;
  }

  /**
   * Get current batch statistics
   */
  public getBatchStatistics(): {
    pendingBatches: number;
    totalQueuedMessages: number;
    averageBatchSize: number;
  } {
    let totalMessages = 0;
    const pendingBatches = this.batchQueue.size;

    for (const batch of this.batchQueue.values()) {
      totalMessages += batch.length;
    }

    return {
      pendingBatches,
      totalQueuedMessages: totalMessages,
      averageBatchSize: pendingBatches > 0 ? totalMessages / pendingBatches : 0,
    };
  }

  /**
   * Clear all pending batches and timers
   */
  public clear(): void {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Clear all batches
    this.batchQueue.clear();
  }

  /**
   * Enable or disable batching
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    // If disabling, flush all pending batches
    if (!enabled) {
      this.flushAllBatches();
    }
  }

  /**
   * Emit performance events for monitoring
   */
  private emitPerformanceEvent(type: string, data: any): void {
    const event: PerformanceEvent = {
      type: type as any,
      timestamp: Date.now(),
      data: data,
      severity: "info",
    };

    this.emit("performance", event);
  }

  /**
   * Get memory usage estimation
   */
  public getMemoryUsage(): number {
    let totalSize = 0;

    for (const batch of this.batchQueue.values()) {
      for (const message of batch) {
        // Estimate message size (rough calculation)
        totalSize += JSON.stringify(message).length * 2; // UTF-16 encoding
      }
    }

    return totalSize;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}

/**
 * Performance and reliability types for MCP Piano Server
 */

// Performance monitoring metrics
export interface PerformanceMetrics {
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  connection: ConnectionMetrics;
  memory: MemoryMetrics;
}

export interface LatencyMetrics {
  clientToServer: number; // Round-trip time in ms
  serverProcessing: number; // Server processing time in ms
  lastMeasurement: number; // Timestamp of last measurement
  averageLatency: number; // Running average
  maxLatency: number; // Maximum recorded latency
  minLatency: number; // Minimum recorded latency
}

export interface ThroughputMetrics {
  messagesPerSecond: number; // Current messages per second
  bytesPerSecond: number; // Current bytes per second
  messageCount: number; // Total messages processed
  bytesTransferred: number; // Total bytes transferred
  lastUpdate: number; // Timestamp of last update
}

export interface ConnectionMetrics {
  connectionUptime: number; // Connection uptime in ms
  reconnectCount: number; // Number of reconnection attempts
  lastReconnect: number; // Timestamp of last reconnection
  connectionQuality: "excellent" | "good" | "poor" | "disconnected";
}

export interface MemoryMetrics {
  messageQueueSize: number; // Current message queue size
  batchQueueSize: number; // Current batch queue size
  memoryUsage: number; // Estimated memory usage in bytes
}

// Message batching configuration
export interface BatchingConfig {
  maxBatchSize: number; // Maximum messages per batch
  maxBatchDelay: number; // Maximum delay before sending batch (ms)
  priorityThreshold: number; // Messages above this priority bypass batching
  enableBatching: boolean; // Whether batching is enabled
}

// Rate limiting configuration
export interface RateLimitConfig {
  maxMessagesPerSecond: number; // Maximum messages per second
  maxBurstSize: number; // Maximum burst size
  windowSize: number; // Time window for rate limiting (ms)
  enableRateLimit: boolean; // Whether rate limiting is enabled
}

// Connection reliability configuration
export interface ReliabilityConfig {
  heartbeatInterval: number; // Heartbeat interval in ms
  maxReconnectAttempts: number; // Maximum reconnection attempts
  reconnectBackoffMultiplier: number; // Backoff multiplier for reconnections
  maxReconnectDelay: number; // Maximum reconnection delay
  enableAutoReconnect: boolean; // Whether auto-reconnection is enabled
}

// Binary message format
export interface BinaryMessage {
  type: MessageType;
  timestamp: number;
  payload: ArrayBuffer;
  metadata?: BinaryMessageMetadata;
}

export interface BinaryMessageMetadata {
  compression: "none" | "gzip" | "brotli";
  encoding: "binary" | "msgpack" | "protobuf";
  size: number; // Payload size in bytes
  checksum?: string; // Payload checksum
}

// Message types for binary encoding
export enum MessageType {
  NOTE_ON = 0x01,
  NOTE_OFF = 0x02,
  CHORD_ON = 0x03,
  ALL_NOTES_OFF = 0x04,
  STATE_SYNC = 0x05,
  HEARTBEAT = 0x06,
  PERFORMANCE_METRICS = 0x07,
  BATCH = 0x08,
  ACKNOWLEDGE = 0x09,
  ERROR = 0x0a,
}

// Binary message structures
export interface BinaryNoteMessage {
  midiNumber: number; // 1 byte (0-127)
  velocity: number; // 1 byte (0-127)
  channel?: number; // 1 byte (0-15), optional
}

export interface BinaryChordMessage {
  noteCount: number; // 1 byte
  notes: BinaryNoteMessage[]; // Variable length
  chordId?: number; // 2 bytes, optional
}

export interface BinaryStateSyncMessage {
  stateVersion: number; // 4 bytes
  activeNoteCount: number; // 2 bytes
  activeNotes: BinaryNoteMessage[]; // Variable length
  clientCount: number; // 2 bytes
}

export interface BinaryBatchMessage {
  batchId: number; // 4 bytes
  messageCount: number; // 2 bytes
  messages: BinaryMessage[]; // Variable length
}

// Message priority levels
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// Enhanced message with priority and batching info
export interface EnhancedMessage {
  id: string;
  type: MessageType;
  priority: MessagePriority;
  timestamp: number;
  payload: any;
  batchable: boolean;
  retryCount: number;
  maxRetries: number;
  clientId?: string;
}

// Performance monitoring events
export interface PerformanceEvent {
  type: "latency" | "throughput" | "connection" | "memory" | "error";
  timestamp: number;
  data: any;
  severity: "info" | "warning" | "error" | "critical";
}

// Connection state with enhanced info
export interface ConnectionState {
  status:
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "error";
  quality: "excellent" | "good" | "poor";
  latency: number;
  uptime: number;
  lastActivity: number;
  errorCount: number;
  reconnectAttempts: number;
}

// Graceful degradation options
export interface DegradationConfig {
  enableOfflineMode: boolean; // Enable offline message queuing
  maxOfflineMessages: number; // Maximum offline messages to queue
  enableReducedFeatures: boolean; // Enable reduced feature set
  fallbackTransport: "polling" | "sse" | "none"; // Fallback transport method
}

// Performance hooks for monitoring
export interface PerformanceHooks {
  onLatencyMeasured: (latency: number) => void;
  onThroughputUpdate: (throughput: ThroughputMetrics) => void;
  onConnectionChange: (state: ConnectionState) => void;
  onPerformanceEvent: (event: PerformanceEvent) => void;
  onDegradationActivated: (reason: string) => void;
}

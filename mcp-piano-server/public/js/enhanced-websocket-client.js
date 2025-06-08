/**
 * Enhanced Piano WebSocket Client
 * Includes performance monitoring, message batching, binary format support,
 * and graceful degradation features
 */
class EnhancedPianoWebSocketClient {
  constructor(serverUrl = null, options = {}) {
    // WebSocket connection configuration
    this.serverUrl = serverUrl || this.getDefaultServerUrl();
    this.ws = null;

    // Configuration options
    this.options = {
      enableBatching: true,
      enableBinaryFormat: true,
      enablePerformanceMonitoring: true,
      enableAutoReconnect: true,
      maxBatchSize: 10,
      maxBatchDelay: 16, // ~60fps
      maxOfflineMessages: 1000,
      heartbeatInterval: 30000,
      maxReconnectAttempts: 10,
      ...options,
    };

    // Connection state management
    this.state = "Disconnected";
    this.isReconnecting = false;
    this.connectionStartTime = 0;

    // Performance monitoring
    this.performanceMetrics = {
      latency: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        measurements: [],
      },
      throughput: {
        messagesPerSecond: 0,
        bytesPerSecond: 0,
        messageCount: 0,
        bytesTransferred: 0,
      },
      connection: {
        uptime: 0,
        reconnectCount: 0,
        quality: "disconnected",
      },
    };

    // Message batching
    this.batchQueue = [];
    this.batchTimer = null;
    this.batchIdCounter = 0;

    // Offline message queue
    this.offlineQueue = [];
    this.isOnline = false;

    // Rate limiting for outgoing messages
    this.rateLimitWindow = [];
    this.maxMessagesPerSecond = 60;

    // Reconnection logic with exponential backoff
    this.reconnectAttempts = 0;
    this.baseReconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.reconnectTimer = null;

    // Event emitter pattern
    this.eventHandlers = new Map();

    // Heartbeat monitoring
    this.heartbeatInterval = null;
    this.lastPingTime = 0;

    // Performance monitoring intervals
    this.performanceUpdateInterval = null;
    this.metricsUpdateInterval = null;

    // Binary message support
    this.binaryCodec = new BinaryMessageCodec();

    // Auto-connect on instantiation
    this.connect();

    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);

    // Start performance monitoring
    if (this.options.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Get default server URL based on current location
   */
  getDefaultServerUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port || "3000";
    return `${protocol}//${host}:${port}`;
  }

  /**
   * Establish WebSocket connection with enhanced error handling
   */
  connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      console.log("WebSocket connection already exists");
      return;
    }

    this.setState("Connecting");
    this.updateConnectionIndicator();

    try {
      console.log(`🔌 Connecting to WebSocket server: ${this.serverUrl}`);
      this.ws = new WebSocket(this.serverUrl);

      // Set up event listeners
      this.ws.addEventListener("open", this.handleOpen);
      this.ws.addEventListener("message", this.handleMessage);
      this.ws.addEventListener("close", this.handleClose);
      this.ws.addEventListener("error", this.handleError);

      // Set binary type for binary message support
      if (this.options.enableBinaryFormat) {
        this.ws.binaryType = "arraybuffer";
      }
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket connection opened
   */
  handleOpen(event) {
    console.log("✅ WebSocket connected successfully");
    this.setState("Connected");
    this.updateConnectionIndicator();
    this.connectionStartTime = Date.now();
    this.isOnline = true;

    // Reset reconnection attempts on successful connection
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    // Start heartbeat monitoring
    this.startHeartbeat();

    // Process offline message queue
    this.processOfflineQueue();

    // Emit connection event
    this.emit("connected", { timestamp: Date.now() });

    // Start performance measurements
    this.measureLatency();
  }

  /**
   * Handle incoming WebSocket messages with binary support
   */
  handleMessage(event) {
    try {
      let data;

      // Handle binary messages
      if (event.data instanceof ArrayBuffer) {
        data = this.binaryCodec.decode(event.data);
        if (!data) {
          console.error("Failed to decode binary message");
          return;
        }
      } else {
        // Handle JSON messages
        data = JSON.parse(event.data);
      }

      // Record message for throughput calculation
      this.recordMessage(event.data.byteLength || event.data.length);

      // Handle heartbeat responses for latency measurement
      if (data.type === "pong") {
        this.handlePong(data);
        return;
      }

      // Handle batched messages
      if (data.type === "batch") {
        this.handleBatchMessage(data);
        return;
      }

      // Handle performance metrics from server
      if (data.type === "performance_metrics") {
        this.handlePerformanceMetrics(data);
        return;
      }

      // Log received message for debugging
      console.log("📨 WebSocket message received:", data);

      // Emit message-specific events
      if (data.type) {
        this.emit(data.type, data);
      }

      // Emit general message event
      this.emit("message", data);
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error, event.data);
    }
  }

  /**
   * Handle batch messages from server
   */
  handleBatchMessage(batchData) {
    if (batchData.payload && batchData.payload.messages) {
      batchData.payload.messages.forEach((message) => {
        // Process each message in the batch
        if (message.type) {
          this.emit(message.type, message);
        }
        this.emit("message", message);
      });
    }
  }

  /**
   * Handle performance metrics from server
   */
  handlePerformanceMetrics(data) {
    if (data.payload) {
      this.emit("serverPerformance", data.payload);
    }
  }

  /**
   * Handle pong response for latency measurement
   */
  handlePong(data) {
    if (this.lastPingTime > 0) {
      const latency = Date.now() - this.lastPingTime;
      this.recordLatency(latency);
      this.lastPingTime = 0;
    }
  }

  /**
   * Handle WebSocket connection closed
   */
  handleClose(event) {
    console.log("🔌 WebSocket connection closed:", event.code, event.reason);
    this.setState("Disconnected");
    this.updateConnectionIndicator();
    this.isOnline = false;

    // Stop heartbeat monitoring
    this.stopHeartbeat();

    // Update performance metrics
    this.performanceMetrics.connection.reconnectCount = this.reconnectAttempts;

    // Emit disconnection event
    this.emit("disconnected", {
      code: event.code,
      reason: event.reason,
      timestamp: Date.now(),
    });

    // Schedule reconnection if not a clean close and auto-reconnect is enabled
    if (
      !event.wasClean &&
      this.options.enableAutoReconnect &&
      !this.isReconnecting
    ) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(event) {
    console.error("❌ WebSocket error:", event);
    this.emit("error", { error: event, timestamp: Date.now() });
  }

  /**
   * Send message with enhanced features (batching, rate limiting, offline support)
   */
  send(message) {
    // Check rate limiting
    if (!this.checkRateLimit()) {
      console.warn("⚠️ Rate limit exceeded, message queued");
      this.queueMessage(message);
      return false;
    }

    // If offline, queue the message
    if (!this.isOnline || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.queueMessage(message);
      return false;
    }

    try {
      let messageData;
      let messageSize;

      // Determine if this message should be batched
      if (this.options.enableBatching && this.shouldBatchMessage(message)) {
        this.addToBatch(message);
        return true;
      }

      // Encode message (binary or JSON)
      if (this.options.enableBinaryFormat && this.canEncodeBinary(message)) {
        messageData = this.encodeMessage(message);
        messageSize = messageData.byteLength;
      } else {
        messageData = JSON.stringify(message);
        messageSize = messageData.length;
      }

      // Send the message
      this.ws.send(messageData);

      // Record message for performance tracking
      this.recordMessage(messageSize);

      console.log("📤 WebSocket message sent:", message.type);
      return true;
    } catch (error) {
      console.error("❌ Failed to send WebSocket message:", error);
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Check if message should be batched
   */
  shouldBatchMessage(message) {
    // Batch note events but not critical messages
    const batchableTypes = ["note_on", "note_off", "chord_on"];
    return batchableTypes.includes(message.type);
  }

  /**
   * Add message to batch queue
   */
  addToBatch(message) {
    this.batchQueue.push(message);

    // Check if batch is full
    if (this.batchQueue.length >= this.options.maxBatchSize) {
      this.flushBatch();
      return;
    }

    // Set timer for batch delay if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.options.maxBatchDelay);
    }
  }

  /**
   * Flush current batch
   */
  flushBatch() {
    if (this.batchQueue.length === 0) {
      return;
    }

    const batchMessage = {
      type: "batch",
      timestamp: Date.now(),
      payload: {
        batchId: ++this.batchIdCounter,
        messageCount: this.batchQueue.length,
        messages: [...this.batchQueue],
      },
    };

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Clear batch queue
    this.batchQueue = [];

    // Send batch as normal message (bypass batching)
    this.sendImmediate(batchMessage);
  }

  /**
   * Send message immediately without batching
   */
  sendImmediate(message) {
    if (!this.isOnline || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.queueMessage(message);
      return false;
    }

    try {
      let messageData;
      let messageSize;

      if (this.options.enableBinaryFormat && this.canEncodeBinary(message)) {
        messageData = this.encodeMessage(message);
        messageSize = messageData.byteLength;
      } else {
        messageData = JSON.stringify(message);
        messageSize = messageData.length;
      }

      this.ws.send(messageData);
      this.recordMessage(messageSize);
      return true;
    } catch (error) {
      console.error("❌ Failed to send immediate message:", error);
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Check rate limiting
   */
  checkRateLimit() {
    const now = Date.now();

    // Remove old timestamps
    this.rateLimitWindow = this.rateLimitWindow.filter(
      (timestamp) => now - timestamp < 1000
    );

    // Check if within limit
    if (this.rateLimitWindow.length < this.maxMessagesPerSecond) {
      this.rateLimitWindow.push(now);
      return true;
    }

    return false;
  }

  /**
   * Queue message for offline delivery
   */
  queueMessage(message) {
    if (this.offlineQueue.length >= this.options.maxOfflineMessages) {
      // Remove oldest message
      this.offlineQueue.shift();
    }

    this.offlineQueue.push({
      ...message,
      queuedAt: Date.now(),
    });
  }

  /**
   * Process offline message queue
   */
  processOfflineQueue() {
    console.log(
      `📨 Processing ${this.offlineQueue.length} offline messages...`
    );

    while (this.offlineQueue.length > 0) {
      const message = this.offlineQueue.shift();

      // Check if message is too old (older than 30 seconds)
      if (Date.now() - message.queuedAt > 30000) {
        console.log("⏰ Skipping old message:", message.type);
        continue;
      }

      // Remove queuedAt timestamp before sending
      delete message.queuedAt;

      // Send without going through batching again
      this.sendImmediate(message);
    }
  }

  /**
   * Check if message can be encoded in binary format
   */
  canEncodeBinary(message) {
    const binaryTypes = [
      "note_on",
      "note_off",
      "chord_on",
      "state_sync",
      "batch",
    ];
    return binaryTypes.includes(message.type);
  }

  /**
   * Encode message to binary format
   */
  encodeMessage(message) {
    switch (message.type) {
      case "note_on":
      case "note_off":
        return this.binaryCodec.encodeNoteMessage(
          message.type,
          message.midiNumber,
          message.velocity,
          message.timestamp
        );
      case "chord_on":
        return this.binaryCodec.encodeChordMessage(
          message.notes,
          message.timestamp,
          message.chordId
        );
      // Add other message types as needed
      default:
        throw new Error(
          `Binary encoding not supported for message type: ${message.type}`
        );
    }
  }

  /**
   * Record message for performance tracking
   */
  recordMessage(messageSize) {
    this.performanceMetrics.throughput.messageCount++;
    this.performanceMetrics.throughput.bytesTransferred += messageSize;
  }

  /**
   * Record latency measurement
   */
  recordLatency(latency) {
    this.performanceMetrics.latency.current = latency;
    this.performanceMetrics.latency.measurements.push(latency);

    // Keep only last 100 measurements
    if (this.performanceMetrics.latency.measurements.length > 100) {
      this.performanceMetrics.latency.measurements.shift();
    }

    // Update min/max
    this.performanceMetrics.latency.min = Math.min(
      this.performanceMetrics.latency.min,
      latency
    );
    this.performanceMetrics.latency.max = Math.max(
      this.performanceMetrics.latency.max,
      latency
    );

    // Calculate average
    const measurements = this.performanceMetrics.latency.measurements;
    this.performanceMetrics.latency.average =
      measurements.reduce((sum, val) => sum + val, 0) / measurements.length;

    // Update connection quality
    this.updateConnectionQuality();

    // Emit latency event
    this.emit("latencyMeasured", {
      current: latency,
      average: this.performanceMetrics.latency.average,
    });
  }

  /**
   * Update connection quality based on performance
   */
  updateConnectionQuality() {
    const latency = this.performanceMetrics.latency.average;
    let quality;

    if (latency === 0 || !this.isOnline) {
      quality = "disconnected";
    } else if (latency < 50) {
      quality = "excellent";
    } else if (latency < 150) {
      quality = "good";
    } else {
      quality = "poor";
    }

    if (quality !== this.performanceMetrics.connection.quality) {
      this.performanceMetrics.connection.quality = quality;
      this.emit("connectionQualityChanged", quality);
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Update throughput metrics every second
    this.metricsUpdateInterval = setInterval(() => {
      this.updateThroughputMetrics();
    }, 1000);

    // Update connection uptime
    this.performanceUpdateInterval = setInterval(() => {
      if (this.connectionStartTime > 0) {
        this.performanceMetrics.connection.uptime =
          Date.now() - this.connectionStartTime;
      }
    }, 1000);
  }

  /**
   * Update throughput metrics
   */
  updateThroughputMetrics() {
    // Implementation would track messages per second and bytes per second
    // This is a simplified version
    this.performanceMetrics.throughput.messagesPerSecond =
      this.rateLimitWindow.length;

    // Emit throughput update
    this.emit("throughputUpdate", this.performanceMetrics.throughput);
  }

  /**
   * Measure latency with ping/pong
   */
  measureLatency() {
    if (this.isOnline && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.lastPingTime = Date.now();
      this.send({
        type: "ping",
        timestamp: this.lastPingTime,
      });
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.measureLatency();
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log("❌ Max reconnection attempts reached");
      this.emit("maxReconnectAttemptsReached");
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.performanceMetrics.connection.reconnectCount = this.reconnectAttempts;

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Update connection indicator in UI
   */
  updateConnectionIndicator() {
    const indicator = document.getElementById("connectionStatus");
    if (!indicator) return;

    const dot = indicator.querySelector(".status-dot");
    const text = indicator.querySelector(".status-text");

    if (!dot || !text) return;

    // Remove all status classes
    dot.className = "status-dot";

    switch (this.state) {
      case "Connected":
        const quality = this.performanceMetrics.connection.quality;
        dot.classList.add(`status-${quality}`);
        text.textContent = `Connected (${quality})`;
        if (this.performanceMetrics.latency.current > 0) {
          text.textContent += ` - ${this.performanceMetrics.latency.current}ms`;
        }
        break;
      case "Connecting":
        dot.classList.add("status-connecting");
        text.textContent = "Connecting...";
        break;
      case "Disconnected":
        dot.classList.add("status-disconnected");
        text.textContent = this.isReconnecting
          ? `Reconnecting... (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
          : "Disconnected";
        break;
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Event emitter methods
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  emit(eventType, data) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Set connection state
   */
  setState(newState) {
    if (this.state !== newState) {
      const previousState = this.state;
      this.state = newState;
      this.emit("stateChanged", { from: previousState, to: newState });
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.isReconnecting = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.stopHeartbeat();

    if (this.performanceUpdateInterval) {
      clearInterval(this.performanceUpdateInterval);
    }

    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.setState("Disconnected");
    this.updateConnectionIndicator();
  }

  /**
   * Convenience methods for piano-specific messages
   */
  sendNoteOn(midiNumber, velocity = 64) {
    return this.send({
      type: "note_on",
      midiNumber: midiNumber,
      velocity: velocity,
      timestamp: Date.now(),
      source: "ui",
    });
  }

  sendNoteOff(midiNumber, velocity = 0) {
    return this.send({
      type: "note_off",
      midiNumber: midiNumber,
      velocity: velocity,
      timestamp: Date.now(),
      source: "ui",
    });
  }

  sendChordOn(notes, chordName = null) {
    return this.send({
      type: "chord_on",
      notes: notes.map((note) => ({
        midiNumber: note.midiNumber || note,
        velocity: note.velocity || 64,
      })),
      chordName: chordName,
      timestamp: Date.now(),
      source: "ui",
    });
  }

  sendAllNotesOff() {
    return this.send({
      type: "all_notes_off",
      timestamp: Date.now(),
      source: "ui",
    });
  }
}

/**
 * Simple Binary Message Codec for client-side
 * Lightweight version of the server-side codec
 */
class BinaryMessageCodec {
  static HEADER_SIZE = 12;
  static VERSION = 1;

  // Simplified encoding methods for client use
  encodeNoteMessage(type, midiNumber, velocity, timestamp = Date.now()) {
    const buffer = new ArrayBuffer(BinaryMessageCodec.HEADER_SIZE + 3);
    const view = new DataView(buffer);

    // Write header
    view.setUint8(0, BinaryMessageCodec.VERSION);
    view.setUint8(1, type === "note_on" ? 0x01 : 0x02);
    view.setUint16(2, 0, true); // reserved
    this.writeTimestamp(view, 4, timestamp);

    // Write note data
    view.setUint8(BinaryMessageCodec.HEADER_SIZE, midiNumber);
    view.setUint8(BinaryMessageCodec.HEADER_SIZE + 1, velocity);
    view.setUint8(BinaryMessageCodec.HEADER_SIZE + 2, 0); // channel

    return buffer;
  }

  // Simplified decoding for client use
  decode(buffer) {
    if (buffer.byteLength < BinaryMessageCodec.HEADER_SIZE) {
      return null;
    }

    const view = new DataView(buffer);
    const version = view.getUint8(0);
    const type = view.getUint8(1);
    const timestamp = this.readTimestamp(view, 4);

    // Return simplified decoded message
    return {
      type: this.typeToString(type),
      timestamp: timestamp,
      payload: buffer.slice(BinaryMessageCodec.HEADER_SIZE),
    };
  }

  typeToString(typeCode) {
    const types = {
      0x01: "note_on",
      0x02: "note_off",
      0x03: "chord_on",
      0x04: "all_notes_off",
      0x05: "state_sync",
      0x06: "heartbeat",
      0x07: "performance_metrics",
      0x08: "batch",
    };
    return types[typeCode] || "unknown";
  }

  writeTimestamp(view, offset, timestamp) {
    const high = Math.floor(timestamp / 0x100000000);
    const low = timestamp >>> 0;
    view.setUint32(offset, high, true);
    view.setUint32(offset + 4, low, true);
  }

  readTimestamp(view, offset) {
    const high = view.getUint32(offset, true);
    const low = view.getUint32(offset + 4, true);
    return high * 0x100000000 + low;
  }
}

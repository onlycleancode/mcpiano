/**
 * Piano WebSocket Client
 * Handles real-time communication with the piano server
 * Includes auto-reconnection, message queuing, and event management
 */
class PianoWebSocketClient {
  constructor(serverUrl = null) {
    // WebSocket connection configuration
    this.serverUrl = serverUrl || this.getDefaultServerUrl();
    this.ws = null;

    // Connection state management
    this.state = "Disconnected";
    this.isReconnecting = false;

    // Reconnection logic with exponential backoff
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000; // 1 second
    this.maxReconnectDelay = 30000; // 30 seconds
    this.reconnectTimer = null;

    // Message queuing for offline mode
    this.messageQueue = [];
    this.maxQueueSize = 100;

    // Event emitter pattern - store event listeners
    this.eventHandlers = new Map();

    // Heartbeat monitoring
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatDelay = 30000; // 30 seconds
    this.pongTimeout = 5000; // 5 seconds to wait for pong

    // Auto-connect on instantiation
    this.connect();

    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Get default server URL based on current location
   */
  getDefaultServerUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port || "3001";
    return `${protocol}//${host}:${port}`;
  }

  /**
   * Establish WebSocket connection
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
    this.updateVisualIndicator();

    try {
      console.log(`🔌 Connecting to WebSocket server: ${this.serverUrl}`);
      this.ws = new WebSocket(this.serverUrl);

      // Set up event listeners
      this.ws.addEventListener("open", this.handleOpen);
      this.ws.addEventListener("message", this.handleMessage);
      this.ws.addEventListener("close", this.handleClose);
      this.ws.addEventListener("error", this.handleError);
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
    this.updateVisualIndicator();

    // Reset reconnection attempts on successful connection
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    // Start heartbeat monitoring
    this.startHeartbeat();

    // Process queued messages
    this.processMessageQueue();

    // Emit connection event
    this.emit("connected", { timestamp: Date.now() });
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // Handle heartbeat pong responses
      if (data.type === "pong") {
        this.handlePong();
        return;
      }

      // Handle state synchronization messages
      if (data.type === "state_sync") {
        this.handleStateSync(data);
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
   * Handle state synchronization message from server
   */
  handleStateSync(data) {
    console.log("🔄 State sync received:", data);

    const stateInfo = {
      activeNotes: data.activeNotes || [],
      lastUpdateTimestamp: data.lastUpdateTimestamp,
      activeClientCount: data.activeClientCount,
      stateVersion: data.stateVersion,
      timestamp: data.timestamp,
    };

    // Emit state sync event for UI components to handle
    this.emit("state_sync", stateInfo);

    // Store current state for conflict resolution
    this.lastKnownState = stateInfo;

    console.log(
      `🔄 Piano state synchronized: ${stateInfo.activeNotes.length} active notes, ${stateInfo.activeClientCount} clients`
    );
  }

  /**
   * Handle WebSocket connection closed
   */
  handleClose(event) {
    console.log("🔌 WebSocket connection closed:", event.code, event.reason);
    this.setState("Disconnected");
    this.updateVisualIndicator();

    // Stop heartbeat monitoring
    this.stopHeartbeat();

    // Emit disconnection event
    this.emit("disconnected", {
      code: event.code,
      reason: event.reason,
      timestamp: Date.now(),
    });

    // Schedule reconnection if not a clean close
    if (!event.wasClean && !this.isReconnecting) {
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
   * Send message with queuing support
   */
  send(message) {
    const messageObj =
      typeof message === "string" ? JSON.parse(message) : message;

    // Add timestamp to message
    messageObj.timestamp = Date.now();

    if (this.state === "Connected" && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(messageObj));
        console.log("📤 Message sent:", messageObj);
        return true;
      } catch (error) {
        console.error("Failed to send message:", error);
        this.queueMessage(messageObj);
        return false;
      }
    } else {
      // Queue message for later sending
      this.queueMessage(messageObj);
      console.log("📮 Message queued (connection not ready):", messageObj);
      return false;
    }
  }

  /**
   * Queue message for offline mode
   */
  queueMessage(message) {
    if (this.messageQueue.length >= this.maxQueueSize) {
      // Remove oldest message to make room
      this.messageQueue.shift();
      console.warn("Message queue full, removing oldest message");
    }

    this.messageQueue.push({
      message,
      timestamp: Date.now(),
    });
  }

  /**
   * Process queued messages when connection is restored
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📦 Processing ${this.messageQueue.length} queued messages`);

    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];

    messagesToSend.forEach(({ message }) => {
      this.send(message);
    });
  }

  /**
   * Subscribe to message events (Event emitter pattern)
   */
  on(messageType, handler) {
    if (!this.eventHandlers.has(messageType)) {
      this.eventHandlers.set(messageType, []);
    }

    this.eventHandlers.get(messageType).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit events to registered handlers
   */
  emit(messageType, data) {
    const handlers = this.eventHandlers.get(messageType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${messageType}:`, error);
        }
      });
    }
  }

  /**
   * Get current connection state
   */
  getState() {
    return {
      state: this.state,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      serverUrl: this.serverUrl,
    };
  }

  /**
   * Set connection state and notify listeners
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;

    if (oldState !== newState) {
      console.log(`🔄 Connection state changed: ${oldState} → ${newState}`);
      this.emit("stateChange", { oldState, newState, timestamp: Date.now() });
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (
      this.isReconnecting ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("❌ Max reconnection attempts reached");
        this.emit("maxReconnectAttemptsReached", {
          attempts: this.reconnectAttempts,
        });
      }
      return;
    }

    this.isReconnecting = true;
    this.setState("Reconnecting");
    this.updateVisualIndicator();

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(
      `🔄 Scheduling reconnection attempt ${
        this.reconnectAttempts + 1
      } in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing intervals

    this.heartbeatInterval = setInterval(() => {
      if (this.state === "Connected" && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "ping", timestamp: Date.now() });

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn("⚠️ Heartbeat timeout - no pong received");
          this.ws.close();
        }, this.pongTimeout);
      }
    }, this.heartbeatDelay);
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Handle pong response
   */
  handlePong() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Update visual connection indicator
   */
  updateVisualIndicator() {
    const indicator = document.getElementById("ws-connection-indicator");
    if (!indicator) return;

    // Remove all state classes
    indicator.classList.remove(
      "connecting",
      "connected",
      "reconnecting",
      "disconnected"
    );

    // Add current state class
    indicator.classList.add(this.state.toLowerCase());

    // Update indicator text and title
    const stateInfo = {
      Connecting: { text: "🔌", title: "Connecting to server..." },
      Connected: { text: "✅", title: "Connected to server" },
      Reconnecting: {
        text: "🔄",
        title: `Reconnecting... (attempt ${this.reconnectAttempts})`,
      },
      Disconnected: { text: "❌", title: "Disconnected from server" },
    };

    const info = stateInfo[this.state] || {
      text: "❓",
      title: "Unknown state",
    };
    indicator.textContent = info.text;
    indicator.title = info.title;
  }

  /**
   * Manually disconnect
   */
  disconnect() {
    console.log("🛑 Manual disconnect requested");
    this.isReconnecting = false;

    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Close WebSocket connection
    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.disconnect();
    this.eventHandlers.clear();
    this.messageQueue = [];
  }

  /**
   * Send note on message
   */
  sendNoteOn(midiNumber, velocity = 64) {
    const message = {
      type: "note_on",
      midiNumber: parseInt(midiNumber),
      velocity: parseInt(velocity),
      source: "ui",
    };

    return this.send(message);
  }

  /**
   * Send note off message
   */
  sendNoteOff(midiNumber, velocity = 0) {
    const message = {
      type: "note_off",
      midiNumber: parseInt(midiNumber),
      velocity: parseInt(velocity),
      source: "ui",
    };

    return this.send(message);
  }

  /**
   * Send chord on message
   */
  sendChordOn(notes, chordName = null) {
    const message = {
      type: "chord_on",
      notes: notes.map((note) => ({
        midiNumber: parseInt(note.midiNumber),
        velocity: parseInt(note.velocity || 64),
      })),
      source: "ui",
    };

    if (chordName) {
      message.chordName = chordName;
    }

    return this.send(message);
  }

  /**
   * Send all notes off message
   */
  sendAllNotesOff() {
    const message = {
      type: "all_notes_off",
      source: "ui",
    };

    return this.send(message);
  }

  /**
   * Request state synchronization from server
   */
  requestStateSync() {
    const message = {
      type: "state_sync",
      source: "ui",
    };

    return this.send(message);
  }

  /**
   * Send heartbeat message
   */
  sendHeartbeat() {
    const message = {
      type: "heartbeat",
      source: "ui",
    };

    return this.send(message);
  }

  /**
   * Get last known piano state
   */
  getLastKnownState() {
    return (
      this.lastKnownState || {
        activeNotes: [],
        lastUpdateTimestamp: 0,
        activeClientCount: 0,
        stateVersion: 0,
        timestamp: 0,
      }
    );
  }

  /**
   * Check if a note is currently active according to last known state
   */
  isNoteActive(midiNumber) {
    const state = this.getLastKnownState();
    return state.activeNotes.some((note) => note.midiNumber === midiNumber);
  }
}

// Export for module systems or make globally available
if (typeof module !== "undefined" && module.exports) {
  module.exports = PianoWebSocketClient;
} else {
  window.PianoWebSocketClient = PianoWebSocketClient;
}

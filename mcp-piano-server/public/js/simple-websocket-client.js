/**
 * Simple Piano WebSocket Client
 * Compatible with the MCP server's WebSocket format
 */
class PianoWebSocketClient {
  constructor(serverUrl = null) {
    // WebSocket connection configuration
    this.serverUrl = serverUrl || this.getDefaultServerUrl();
    this.ws = null;
    this.state = "Disconnected";
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Event handlers
    this.eventHandlers = new Map();
    
    // Auto-connect
    this.connect();
  }

  /**
   * Get default server URL
   */
  getDefaultServerUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port || "3000";
    return `${protocol}//${host}:${port}`;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    console.log(`🔌 Connecting to WebSocket server: ${this.serverUrl}`);
    this.setState("Connecting");

    try {
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.onopen = (event) => {
        console.log("✅ WebSocket connected");
        this.setState("Connected");
        this.reconnectAttempts = 0;
        this.emit("connected", { timestamp: Date.now() });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", data);
          
          // Emit type-specific events
          if (data.type) {
            this.emit(data.type, data);
          }
          
          // Emit general message event
          this.emit("message", data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("🔌 WebSocket disconnected:", event.code, event.reason);
        this.setState("Disconnected");
        this.emit("disconnected", { code: event.code, reason: event.reason });
        
        // Auto-reconnect if not a clean close
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (event) => {
        console.error("❌ WebSocket error:", event);
        this.emit("error", { error: event });
      };
      
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Send message
   */
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("⚠️ WebSocket not connected, message not sent:", message);
      return false;
    }

    try {
      const messageString = JSON.stringify(message);
      this.ws.send(messageString);
      console.log("📤 WebSocket message sent:", message.type);
      return true;
    } catch (error) {
      console.error("❌ Failed to send WebSocket message:", error);
      return false;
    }
  }

  /**
   * Send note on event
   */
  sendNoteOn(midiNumber, velocity = 64) {
    return this.send({
      type: "note_on",
      midiNumber: midiNumber,
      velocity: velocity,
      timestamp: Date.now(),
      source: "ui"
    });
  }

  /**
   * Send note off event
   */
  sendNoteOff(midiNumber) {
    return this.send({
      type: "note_off",
      midiNumber: midiNumber,
      velocity: 0,
      timestamp: Date.now(),
      source: "ui"
    });
  }

  /**
   * Get connection state
   */
  getState() {
    return this.state;
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
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.setState("Disconnected");
  }
}
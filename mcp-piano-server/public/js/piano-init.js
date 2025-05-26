/**
 * Piano Initialization Script
 * Handles server connection, piano data fetching, and UI integration
 */

class PianoInitializer {
  constructor() {
    this.config = {
      apiBaseUrl: window.location.origin,
      connectionRetryDelay: 2000,
      maxRetryAttempts: 5,
      heartbeatInterval: 30000, // 30 seconds
    };

    this.state = {
      connectionStatus: "connecting",
      retryAttempts: 0,
      pianoData: null,
      heartbeatTimer: null,
      pianoInterface: null,
    };

    this.init();
  }

  /**
   * Initialize the piano system
   */
  async init() {
    console.log("🎹 Initializing Piano Interface...");

    // Update connection status to connecting
    this.updateConnectionStatus("connecting");

    try {
      // Fetch piano layout data from server
      await this.fetchPianoData();

      // Initialize the piano interface with server data
      await this.initializePianoInterface();

      // Set up resize observer for responsive updates
      this.setupResizeObserver();

      // Start connection monitoring
      this.startConnectionMonitoring();

      // Update connection status to connected
      this.updateConnectionStatus("connected");

      console.log("✅ Piano Interface initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize piano interface:", error);
      this.updateConnectionStatus("disconnected");
      this.scheduleRetry();
    }
  }

  /**
   * Fetch piano layout data from server
   */
  async fetchPianoData() {
    try {
      console.log("📡 Fetching piano layout from server...");

      const response = await fetch(
        `${this.config.apiBaseUrl}/api/piano-layout`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      this.state.pianoData = await response.json();
      console.log("✅ Piano data fetched successfully:", {
        totalKeys: this.state.pianoData.totalKeys,
        whiteKeys: this.state.pianoData.whiteKeys?.length || 0,
        blackKeys: this.state.pianoData.blackKeys?.length || 0,
      });

      return this.state.pianoData;
    } catch (error) {
      console.error("❌ Failed to fetch piano data:", error);

      // Fallback to client-side generation if server is unavailable
      console.log("🔄 Falling back to client-side piano generation...");
      this.state.pianoData = this.generateFallbackPianoData();

      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Generate fallback piano data when server is unavailable
   */
  generateFallbackPianoData() {
    const keys = [];
    const whiteKeys = [];
    const blackKeys = [];

    // Generate 88 keys from A0 (MIDI 21) to C8 (MIDI 108)
    for (let midiNote = 21; midiNote <= 108; midiNote++) {
      const noteInfo = this.getMidiNoteInfo(midiNote);
      const key = {
        noteNumber: midiNote,
        noteName: noteInfo.noteName,
        frequency: this.calculateFrequency(midiNote),
        color: noteInfo.isBlack ? "black" : "white",
        octave: noteInfo.octave,
        position: midiNote - 21, // 0-87 position
      };

      keys.push(key);

      if (noteInfo.isBlack) {
        blackKeys.push(key);
      } else {
        whiteKeys.push(key);
      }
    }

    return {
      keys,
      totalKeys: keys.length,
      whiteKeys,
      blackKeys,
    };
  }

  /**
   * Get note information from MIDI note number
   */
  getMidiNoteInfo(midiNote) {
    const noteNames = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const noteIndex = (midiNote - 12) % 12;
    const octave = Math.floor((midiNote - 12) / 12);
    const noteName = noteNames[noteIndex];
    const isBlack = noteName.includes("#");

    return {
      noteName: `${noteName}${octave}`,
      octave,
      isBlack,
    };
  }

  /**
   * Calculate frequency for MIDI note using A4 = 440Hz
   */
  calculateFrequency(midiNote) {
    return Math.round(440 * Math.pow(2, (midiNote - 69) / 12) * 100) / 100;
  }

  /**
   * Initialize the piano interface with server data
   */
  async initializePianoInterface() {
    // Wait for existing PianoInterface to be available
    if (typeof PianoInterface === "undefined") {
      throw new Error("PianoInterface class not found");
    }

    // Create piano interface instance with server data
    this.state.pianoInterface = new PianoInterface();

    // Override the generateKeyLayout method to use server data
    if (this.state.pianoData && this.state.pianoInterface) {
      this.enhancePianoInterface();
    }
  }

  /**
   * Enhance the piano interface with server data and data attributes
   */
  enhancePianoInterface() {
    const pianoInterface = this.state.pianoInterface;
    const serverData = this.state.pianoData;

    // Override the generateKeyLayout method
    const originalGenerateKeyLayout =
      pianoInterface.generateKeyLayout.bind(pianoInterface);

    pianoInterface.generateKeyLayout = () => {
      // Call original method first
      originalGenerateKeyLayout();

      // Enhance keys with server data and add data attributes
      pianoInterface.keys.forEach((key, index) => {
        if (serverData.keys[index]) {
          const serverKey = serverData.keys[index];

          // Add server data to key object
          key.frequency = serverKey.frequency;
          key.serverData = serverKey;
        }
      });

      // Add data attributes to rendered keys
      this.addDataAttributesToKeys();
    };

    // Override the renderKey method to add data attributes
    const originalRenderKey = pianoInterface.renderKey.bind(pianoInterface);

    pianoInterface.renderKey = (key) => {
      // Call original render method
      originalRenderKey(key);

      // Add data attributes to the rendered key
      this.addDataAttributesToKey(key);
    };
  }

  /**
   * Add data attributes to all piano keys
   */
  addDataAttributesToKeys() {
    // This will be called after keys are rendered
    setTimeout(() => {
      const canvas = document.getElementById("pianoKeyboard");
      if (canvas && this.state.pianoInterface) {
        // Add data attributes to canvas for key mapping
        canvas.setAttribute("data-total-keys", this.state.pianoData.totalKeys);
        canvas.setAttribute(
          "data-white-keys",
          this.state.pianoData.whiteKeys.length
        );
        canvas.setAttribute(
          "data-black-keys",
          this.state.pianoData.blackKeys.length
        );

        // Store key data for interaction handling
        canvas.pianoKeyData = this.state.pianoInterface.keys.map((key) => ({
          "data-midi": key.midiNote,
          "data-note": key.noteName,
          "data-octave": key.octave,
          "data-frequency":
            key.frequency || this.calculateFrequency(key.midiNote),
          "data-color": key.isBlack ? "black" : "white",
          "data-position": key.id,
        }));
      }
    }, 100);
  }

  /**
   * Add data attributes to a specific key
   */
  addDataAttributesToKey(key) {
    // Since we're using canvas, we store the data attributes in a way
    // that can be accessed during interaction events
    if (!key.dataAttributes) {
      key.dataAttributes = {
        "data-midi": key.midiNote,
        "data-note": key.noteName,
        "data-octave": key.octave,
        "data-frequency":
          key.frequency || this.calculateFrequency(key.midiNote),
        "data-color": key.isBlack ? "black" : "white",
        "data-position": key.id,
      };
    }
  }

  /**
   * Set up resize observer for responsive updates
   */
  setupResizeObserver() {
    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target.classList.contains("piano-keyboard-container")) {
            // Debounce resize handling
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
              if (this.state.pianoInterface) {
                this.state.pianoInterface.handleResize();
              }
            }, 150);
          }
        }
      });

      // Observe the piano container
      const pianoContainer = document.querySelector(
        ".piano-keyboard-container"
      );
      if (pianoContainer) {
        resizeObserver.observe(pianoContainer);
        console.log("✅ Resize observer set up for responsive updates");
      }
    } else {
      // Fallback for browsers without ResizeObserver
      window.addEventListener("resize", () => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          if (this.state.pianoInterface) {
            this.state.pianoInterface.handleResize();
          }
        }, 150);
      });
      console.log(
        "✅ Window resize listener set up (ResizeObserver not supported)"
      );
    }
  }

  /**
   * Start connection monitoring with heartbeat
   */
  startConnectionMonitoring() {
    // Clear any existing heartbeat
    if (this.state.heartbeatTimer) {
      clearInterval(this.state.heartbeatTimer);
    }

    // Set up heartbeat to monitor connection
    this.state.heartbeatTimer = setInterval(async () => {
      try {
        await this.checkServerConnection();
      } catch (error) {
        console.warn("⚠️ Connection check failed:", error);
        this.updateConnectionStatus("disconnected");
        this.scheduleRetry();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Check server connection with ping
   */
  async checkServerConnection() {
    const response = await fetch(`${this.config.apiBaseUrl}/api/ping`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Ping failed with status: ${response.status}`);
    }

    // If we were disconnected and now connected, update status
    if (this.state.connectionStatus === "disconnected") {
      this.updateConnectionStatus("connected");
      this.state.retryAttempts = 0;
    }
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(status) {
    this.state.connectionStatus = status;

    const statusIndicator = document.getElementById("connectionStatus");
    const statusText = statusIndicator?.querySelector(".status-text");

    if (statusIndicator && statusText) {
      // Remove existing status classes
      statusIndicator.classList.remove(
        "connecting",
        "connected",
        "disconnected"
      );

      // Add new status class
      statusIndicator.classList.add(status);

      const statusMessages = {
        connecting: "Connecting...",
        connected: "Connected",
        disconnected: "Disconnected",
      };

      statusText.textContent = statusMessages[status] || "Unknown";

      console.log(`🔗 Connection status updated: ${status}`);
    }
  }

  /**
   * Schedule retry attempt
   */
  scheduleRetry() {
    if (this.state.retryAttempts >= this.config.maxRetryAttempts) {
      console.error("❌ Max retry attempts reached. Please refresh the page.");
      return;
    }

    this.state.retryAttempts++;

    console.log(
      `🔄 Scheduling retry attempt ${this.state.retryAttempts}/${this.config.maxRetryAttempts} in ${this.config.connectionRetryDelay}ms`
    );

    setTimeout(() => {
      this.init();
    }, this.config.connectionRetryDelay);
  }

  /**
   * Get piano data for external access
   */
  getPianoData() {
    return this.state.pianoData;
  }

  /**
   * Get piano interface instance
   */
  getPianoInterface() {
    return this.state.pianoInterface;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.state.heartbeatTimer) {
      clearInterval(this.state.heartbeatTimer);
    }

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }
}

// Global instance for external access
window.pianoInitializer = null;

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.pianoInitializer = new PianoInitializer();
  });
} else {
  window.pianoInitializer = new PianoInitializer();
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (window.pianoInitializer) {
    window.pianoInitializer.destroy();
  }
});

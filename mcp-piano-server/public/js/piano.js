/**
 * MCP Piano Interface - 88-Key Piano Implementation
 * Handles canvas rendering, user interactions, and MCP server communication
 */

class PianoInterface {
  constructor() {
    // Piano configuration
    this.config = {
      // 88 keys total: A0 to C8
      totalKeys: 88,
      firstKeyMidiNote: 21, // A0
      lastKeyMidiNote: 108, // C8
      whiteKeyWidth: 24,
      whiteKeyHeight: 140,
      blackKeyWidth: 14,
      blackKeyHeight: 90,
      keyPadding: 1,
    };

    // Piano state
    this.state = {
      activeKeys: new Set(),
      volume: 75,
      octave: 4,
      sustainPedal: false,
      connectionStatus: "connecting", // 'connecting', 'connected', 'disconnected'
      mcpConnection: null,
    };

    // UI elements
    this.canvas = null;
    this.ctx = null;
    this.keys = [];

    // Initialize the interface
    this.init();
  }

  /**
   * Initialize the piano interface
   */
  init() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.setupInterface()
      );
    } else {
      this.setupInterface();
    }
  }

  /**
   * Set up the piano interface components
   */
  setupInterface() {
    this.setupCanvas();
    this.setupEventListeners();
    this.generateKeyLayout();
    this.renderPiano();
    this.setupMCPConnection();
    this.hideLoadingIndicator();
  }

  /**
   * Set up the canvas element
   */
  setupCanvas() {
    this.canvas = document.getElementById("pianoKeyboard");

    if (!this.canvas || !this.canvas.getContext) {
      console.warn("Canvas not supported, falling back to SVG");
      this.setupSVGFallback();
      return;
    }

    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();

    // Set up high DPI support
    this.setupHighDPI();
  }

  /**
   * Set up SVG fallback for browsers that don't support canvas
   */
  setupSVGFallback() {
    const canvas = document.getElementById("pianoKeyboard");
    const svg = document.getElementById("pianoKeyboardSVG");

    if (canvas && svg) {
      canvas.classList.add("hidden");
      svg.classList.remove("hidden");
      // SVG implementation would go here
      console.log("SVG fallback activated");
    }
  }

  /**
   * Set up high DPI support for canvas
   */
  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";

    this.ctx.scale(dpr, dpr);
  }

  /**
   * Resize canvas to fit container
   */
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();

    // Calculate optimal canvas size
    const availableWidth = containerRect.width - 32; // Account for padding
    const availableHeight = containerRect.height - 32;

    // Calculate piano dimensions
    const whiteKeysCount = this.getWhiteKeysCount();
    const pianoWidth =
      whiteKeysCount * (this.config.whiteKeyWidth + this.config.keyPadding);
    const pianoHeight = this.config.whiteKeyHeight;

    // Scale to fit container while maintaining aspect ratio
    const scaleX = availableWidth / pianoWidth;
    const scaleY = availableHeight / pianoHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    this.canvas.width = pianoWidth * scale;
    this.canvas.height = pianoHeight * scale;
    this.canvas.style.width = this.canvas.width + "px";
    this.canvas.style.height = this.canvas.height + "px";

    // Store scale for coordinate calculations
    this.scale = scale;
  }

  /**
   * Generate the layout of all 88 piano keys
   */
  generateKeyLayout() {
    this.keys = [];
    let whiteKeyIndex = 0;

    for (let i = 0; i < this.config.totalKeys; i++) {
      const midiNote = this.config.firstKeyMidiNote + i;
      const noteInfo = this.getMidiNoteInfo(midiNote);

      const key = {
        id: i,
        midiNote: midiNote,
        noteName: noteInfo.name,
        octave: noteInfo.octave,
        isBlack: noteInfo.isBlack,
        isActive: false,
        bounds: this.calculateKeyBounds(noteInfo, whiteKeyIndex),
      };

      if (!noteInfo.isBlack) {
        whiteKeyIndex++;
      }

      this.keys.push(key);
    }
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
    const noteIndex = (midiNote - 12) % 12; // Adjust for MIDI note numbering
    const octave = Math.floor((midiNote - 12) / 12);
    const noteName = noteNames[noteIndex];
    const isBlack = noteName.includes("#");

    return {
      name: noteName,
      octave: octave,
      isBlack: isBlack,
    };
  }

  /**
   * Calculate the bounding box for a key
   */
  calculateKeyBounds(noteInfo, whiteKeyIndex) {
    const scale = this.scale || 1;

    if (!noteInfo.isBlack) {
      // White key
      return {
        x:
          whiteKeyIndex *
          (this.config.whiteKeyWidth + this.config.keyPadding) *
          scale,
        y: 0,
        width: this.config.whiteKeyWidth * scale,
        height: this.config.whiteKeyHeight * scale,
      };
    } else {
      // Black key - positioned relative to adjacent white keys
      const blackKeyOffsets = {
        "C#": 0.7,
        "D#": 1.3,
        "F#": 2.7,
        "G#": 3.3,
        "A#": 3.9,
      };

      const baseOffset = blackKeyOffsets[noteInfo.name] || 0.7;
      const whiteKeyStart =
        (whiteKeyIndex - 1) *
        (this.config.whiteKeyWidth + this.config.keyPadding);

      return {
        x:
          (whiteKeyStart +
            this.config.whiteKeyWidth * baseOffset -
            this.config.blackKeyWidth / 2) *
          scale,
        y: 0,
        width: this.config.blackKeyWidth * scale,
        height: this.config.blackKeyHeight * scale,
      };
    }
  }

  /**
   * Get the count of white keys in the 88-key layout
   */
  getWhiteKeysCount() {
    return 52; // Standard 88-key piano has 52 white keys
  }

  /**
   * Render the piano on canvas
   */
  renderPiano() {
    if (!this.ctx) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set rendering properties
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    // Render white keys first
    this.keys
      .filter((key) => !key.isBlack)
      .forEach((key) => this.renderKey(key));

    // Render black keys on top
    this.keys
      .filter((key) => key.isBlack)
      .forEach((key) => this.renderKey(key));
  }

  /**
   * Render individual key
   */
  renderKey(key) {
    const { x, y, width, height } = key.bounds;
    const isActive = this.state.activeKeys.has(key.id);

    // Set fill style based on key type and state
    if (key.isBlack) {
      this.ctx.fillStyle = isActive ? "#4a4a4a" : "#1a1a1a";
    } else {
      this.ctx.fillStyle = isActive ? "#e8e8e8" : "#ffffff";
    }

    // Draw key background
    this.ctx.fillRect(x, y, width, height);

    // Draw key border
    this.ctx.strokeStyle = "#333333";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);

    // Add subtle gradient for 3D effect
    if (!isActive) {
      const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
      if (key.isBlack) {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      } else {
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.1)");
      }
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, width, height);
    }

    // Draw note name for larger keys
    if (width > 20 && !key.isBlack) {
      this.ctx.fillStyle = "#666666";
      this.ctx.font = `${Math.max(8, width / 4)}px Inter, sans-serif`;
      this.ctx.textAlign = "center";
      this.ctx.fillText(key.noteName, x + width / 2, y + height - 10);
    }
  }

  /**
   * Set up event listeners for user interactions
   */
  setupEventListeners() {
    // Canvas mouse events
    if (this.canvas) {
      this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
      this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
      this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));
      this.canvas.addEventListener("mouseleave", (e) =>
        this.handleMouseLeave(e)
      );

      // Touch events for mobile
      this.canvas.addEventListener("touchstart", (e) =>
        this.handleTouchStart(e)
      );
      this.canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e));
      this.canvas.addEventListener("touchend", (e) => this.handleTouchEnd(e));
    }

    // Keyboard events
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Control panel events
    this.setupControlEvents();

    // Window resize
    window.addEventListener("resize", () => this.handleResize());

    // Modal events
    this.setupModalEvents();
  }

  /**
   * Set up control panel event listeners
   */
  setupControlEvents() {
    // Volume control
    const volumeControl = document.getElementById("volumeControl");
    const volumeValue = document.querySelector(".volume-value");

    if (volumeControl && volumeValue) {
      volumeControl.addEventListener("input", (e) => {
        this.state.volume = parseInt(e.target.value);
        volumeValue.textContent = `${this.state.volume}%`;
      });
    }

    // Octave control
    const octaveControl = document.getElementById("octaveControl");
    if (octaveControl) {
      octaveControl.addEventListener("change", (e) => {
        this.state.octave = parseInt(e.target.value);
      });
    }

    // Sustain button
    const sustainButton = document.getElementById("sustainToggle");
    if (sustainButton) {
      sustainButton.addEventListener("click", () => {
        this.state.sustainPedal = !this.state.sustainPedal;
        sustainButton.classList.toggle("active", this.state.sustainPedal);
      });
    }

    // Fullscreen toggle
    const fullscreenButton = document.getElementById("fullscreenToggle");
    if (fullscreenButton) {
      fullscreenButton.addEventListener("click", () => this.toggleFullscreen());
    }
  }

  /**
   * Set up modal event listeners
   */
  setupModalEvents() {
    const helpButton = document.getElementById("helpToggle");
    const helpModal = document.getElementById("helpModal");
    const closeHelp = document.getElementById("closeHelp");

    if (helpButton && helpModal && closeHelp) {
      helpButton.addEventListener("click", () => {
        helpModal.classList.remove("hidden");
      });

      closeHelp.addEventListener("click", () => {
        helpModal.classList.add("hidden");
      });

      helpModal.addEventListener("click", (e) => {
        if (e.target === helpModal) {
          helpModal.classList.add("hidden");
        }
      });
    }
  }

  /**
   * Handle mouse down events
   */
  handleMouseDown(e) {
    e.preventDefault();
    const key = this.getKeyAtPosition(e.offsetX, e.offsetY);
    if (key) {
      this.playKey(key.id);
    }
  }

  /**
   * Handle mouse move events
   */
  handleMouseMove(e) {
    // Could be used for drag playing in the future
  }

  /**
   * Handle mouse up events
   */
  handleMouseUp(e) {
    // For now, stop all keys when mouse is released
    if (!this.state.sustainPedal) {
      this.stopAllKeys();
    }
  }

  /**
   * Handle mouse leave events
   */
  handleMouseLeave(e) {
    if (!this.state.sustainPedal) {
      this.stopAllKeys();
    }
  }

  /**
   * Handle touch start events
   */
  handleTouchStart(e) {
    e.preventDefault();
    for (let touch of e.touches) {
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const key = this.getKeyAtPosition(x, y);
      if (key) {
        this.playKey(key.id);
      }
    }
  }

  /**
   * Handle touch move events
   */
  handleTouchMove(e) {
    e.preventDefault();
    // Similar to touch start for drag playing
  }

  /**
   * Handle touch end events
   */
  handleTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0 && !this.state.sustainPedal) {
      this.stopAllKeys();
    }
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(e) {
    // Map computer keyboard to piano keys
    const keyMapping = {
      KeyA: 0, // C
      KeyW: 1, // C#
      KeyS: 2, // D
      KeyE: 3, // D#
      KeyD: 4, // E
      KeyF: 5, // F
      KeyT: 6, // F#
      KeyG: 7, // G
      KeyY: 8, // G#
      KeyH: 9, // A
      KeyU: 10, // A#
      KeyJ: 11, // B
    };

    if (keyMapping.hasOwnProperty(e.code) && !e.repeat) {
      e.preventDefault();
      const keyOffset = keyMapping[e.code];
      const baseKeyId = (this.state.octave - 1) * 12 + keyOffset;

      // Find the actual key ID in our keys array
      const key = this.keys.find((k) => {
        const noteInfo = this.getMidiNoteInfo(k.midiNote);
        const octaveOffset = (noteInfo.octave - 1) * 12;
        return octaveOffset + this.getNoteOffset(noteInfo.name) === baseKeyId;
      });

      if (key) {
        this.playKey(key.id);
      }
    }
  }

  /**
   * Handle key up events
   */
  handleKeyUp(e) {
    if (!this.state.sustainPedal) {
      // Could implement individual key release here
    }
  }

  /**
   * Get note offset within octave
   */
  getNoteOffset(noteName) {
    const offsets = {
      C: 0,
      "C#": 1,
      D: 2,
      "D#": 3,
      E: 4,
      F: 5,
      "F#": 6,
      G: 7,
      "G#": 8,
      A: 9,
      "A#": 10,
      B: 11,
    };
    return offsets[noteName] || 0;
  }

  /**
   * Get key at specific canvas position
   */
  getKeyAtPosition(x, y) {
    // Check black keys first (they're on top)
    for (let key of this.keys.filter((k) => k.isBlack)) {
      if (this.isPointInKey(x, y, key)) {
        return key;
      }
    }

    // Then check white keys
    for (let key of this.keys.filter((k) => !k.isBlack)) {
      if (this.isPointInKey(x, y, key)) {
        return key;
      }
    }

    return null;
  }

  /**
   * Check if point is within key bounds
   */
  isPointInKey(x, y, key) {
    const { x: keyX, y: keyY, width, height } = key.bounds;
    return x >= keyX && x <= keyX + width && y >= keyY && y <= keyY + height;
  }

  /**
   * Play a piano key
   */
  playKey(keyId) {
    if (this.state.activeKeys.has(keyId)) return;

    this.state.activeKeys.add(keyId);
    const key = this.keys[keyId];

    // Send note to MCP server
    this.sendNoteOn(key.midiNote, this.state.volume);

    // Update visual
    this.renderPiano();

    console.log(
      `Playing key: ${key.noteName}${key.octave} (MIDI: ${key.midiNote})`
    );
  }

  /**
   * Stop a piano key
   */
  stopKey(keyId) {
    if (!this.state.activeKeys.has(keyId)) return;

    this.state.activeKeys.delete(keyId);
    const key = this.keys[keyId];

    // Send note off to MCP server
    this.sendNoteOff(key.midiNote);

    // Update visual
    this.renderPiano();
  }

  /**
   * Stop all active keys
   */
  stopAllKeys() {
    for (let keyId of this.state.activeKeys) {
      this.stopKey(keyId);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.canvas && this.ctx) {
      this.resizeCanvas();
      this.generateKeyLayout();
      this.renderPiano();
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Set up MCP server connection
   */
  setupMCPConnection() {
    // This would be implemented to connect to the actual MCP server
    // For now, simulate connection status updates
    this.updateConnectionStatus("connecting");

    setTimeout(() => {
      this.updateConnectionStatus("connected");
    }, 2000);
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(status) {
    this.state.connectionStatus = status;
    const statusIndicator = document.getElementById("connectionStatus");
    const statusText = statusIndicator?.querySelector(".status-text");

    if (statusIndicator && statusText) {
      statusIndicator.className = `status-indicator ${status}`;

      const statusMessages = {
        connecting: "Connecting...",
        connected: "Connected",
        disconnected: "Disconnected",
      };

      statusText.textContent = statusMessages[status] || "Unknown";
    }
  }

  /**
   * Send note on event to MCP server
   */
  sendNoteOn(midiNote, velocity) {
    // This would send the note to the MCP server
    console.log(`Note ON: ${midiNote}, velocity: ${velocity}`);

    // TODO: Implement actual MCP communication
    if (this.state.mcpConnection) {
      // Send to MCP server
    }
  }

  /**
   * Send note off event to MCP server
   */
  sendNoteOff(midiNote) {
    // This would send the note off to the MCP server
    console.log(`Note OFF: ${midiNote}`);

    // TODO: Implement actual MCP communication
    if (this.state.mcpConnection) {
      // Send to MCP server
    }
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator() {
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) {
      setTimeout(() => {
        loadingIndicator.classList.add("hidden");
      }, 1000);
    }
  }
}

// Initialize the piano interface when the script loads
new PianoInterface();

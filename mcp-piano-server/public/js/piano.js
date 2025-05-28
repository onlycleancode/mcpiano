/**
 * MCP Piano Interface - 88-Key Piano Implementation
 * Handles canvas rendering, user interactions, and MCP server communication
 */

class PianoInterface {
  constructor() {
    // Piano configuration with responsive scaling parameters
    this.config = {
      // 88 keys total: A0 to C8
      totalKeys: 88,
      firstKeyMidiNote: 21, // A0
      lastKeyMidiNote: 108, // C8
      // Responsive scaling parameters
      minWhiteKeyWidth: 20, // Minimum white key width in pixels
      maxWhiteKeyWidth: 50, // Maximum white key width in pixels
      defaultWhiteKeyWidth: 24, // Default white key width
      whiteKeyHeight: 140,
      blackKeyWidthRatio: 0.58, // Black key width as ratio of white key width
      blackKeyHeightRatio: 0.64, // Black key height as ratio of white key height
      keyPadding: 1,
      // Touch device scaling factors
      touchMinHeight: 120,
      touchOptimalHeight: 160,
    };

    // Piano state
    this.state = {
      activeKeys: new Set(),
      volume: 75,
      octave: 4,
      sustainPedal: false,
      connectionStatus: "connecting", // 'connecting', 'connected', 'disconnected'
      mcpConnection: null,
      // Responsive state
      currentKeyWidth: this.config.defaultWhiteKeyWidth,
      isHorizontalScrollMode: false,
      // Audio engine state
      audioEngineReady: false,
      audioContextStarted: false,
    };

    // UI elements
    this.canvas = null;
    this.ctx = null;
    this.keys = [];

    // Audio engine
    this.audioEngine = null;

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
    this.setupAudioEngine();
    this.generateKeyLayout();
    this.renderPiano();
    this.updateScrollIndicators();
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
   * Resize canvas to fit container with responsive scaling
   */
  resizeCanvas() {
    const container = this.canvas.parentElement.parentElement; // Get piano-keyboard-container
    const containerRect = container.getBoundingClientRect();

    // Calculate available space
    const availableWidth = containerRect.width - 32; // Account for container padding
    const availableHeight = containerRect.height - 32;

    // Detect if device supports touch
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Calculate optimal key dimensions
    const whiteKeysCount = this.getWhiteKeysCount();
    this.calculateOptimalKeySize(
      availableWidth,
      availableHeight,
      isTouchDevice
    );

    // Calculate piano dimensions with current key size
    const pianoWidth =
      whiteKeysCount * (this.state.currentKeyWidth + this.config.keyPadding);
    const pianoHeight = this.getOptimalPianoHeight(
      availableHeight,
      isTouchDevice
    );

    // Determine if we need horizontal scrolling
    this.state.isHorizontalScrollMode = pianoWidth > availableWidth;

    // Set canvas dimensions
    if (this.state.isHorizontalScrollMode) {
      // Use full piano width, enable horizontal scrolling
      this.canvas.width = pianoWidth;
      this.canvas.height = pianoHeight;
      this.canvas.style.width = pianoWidth + "px";
      this.canvas.style.height = pianoHeight + "px";

      // Ensure container allows horizontal scroll
      container.style.justifyContent = "flex-start";
    } else {
      // Fit within container
      this.canvas.width = pianoWidth;
      this.canvas.height = pianoHeight;
      this.canvas.style.width = pianoWidth + "px";
      this.canvas.style.height = pianoHeight + "px";

      // Center in container
      container.style.justifyContent = "center";
    }

    // Store scale for coordinate calculations (always 1 for direct pixel mapping)
    this.scale = 1;

    // Update configuration for key calculations
    this.config.whiteKeyWidth = this.state.currentKeyWidth;
    this.config.blackKeyWidth = Math.round(
      this.state.currentKeyWidth * this.config.blackKeyWidthRatio
    );
    this.config.whiteKeyHeight = pianoHeight;
    this.config.blackKeyHeight = Math.round(
      pianoHeight * this.config.blackKeyHeightRatio
    );

    // Set up high DPI support
    this.setupHighDPI();
  }

  /**
   * Calculate optimal key size based on available space and constraints
   */
  calculateOptimalKeySize(availableWidth, availableHeight, isTouchDevice) {
    const whiteKeysCount = this.getWhiteKeysCount();

    // Calculate ideal white key width to fit container
    const idealKeyWidth =
      (availableWidth - whiteKeysCount * this.config.keyPadding) /
      whiteKeysCount;

    // Apply min/max constraints
    let optimalKeyWidth = Math.max(
      this.config.minWhiteKeyWidth,
      Math.min(idealKeyWidth, this.config.maxWhiteKeyWidth)
    );

    // For touch devices, ensure minimum interactive size
    if (isTouchDevice) {
      optimalKeyWidth = Math.max(optimalKeyWidth, 22); // Slightly larger minimum for touch
    }

    // Store the current key width
    this.state.currentKeyWidth = optimalKeyWidth;

    console.log(
      `Responsive scaling: Key width set to ${optimalKeyWidth}px (ideal: ${idealKeyWidth.toFixed(
        1
      )}px)`
    );
  }

  /**
   * Get optimal piano height based on available space and device type
   */
  getOptimalPianoHeight(availableHeight, isTouchDevice) {
    let targetHeight = this.config.whiteKeyHeight;

    if (isTouchDevice) {
      // Ensure minimum touch-friendly height
      targetHeight = Math.max(targetHeight, this.config.touchMinHeight);

      // Optimize for available space on touch devices
      if (availableHeight > 0) {
        targetHeight = Math.min(
          Math.max(availableHeight * 0.8, this.config.touchMinHeight),
          this.config.touchOptimalHeight
        );
      }
    } else {
      // For desktop, scale height based on available space
      if (availableHeight > 0 && availableHeight < targetHeight) {
        targetHeight = Math.max(availableHeight * 0.9, 100); // Minimum 100px height
      }
    }

    return Math.round(targetHeight);
  }

  /**
   * Set up the audio engine for realistic piano sounds
   */
  async setupAudioEngine() {
    try {
      console.log("🎵 Setting up Piano Audio Engine...");

      // Check if PianoAudioEngine is available
      if (typeof PianoAudioEngine === "undefined") {
        console.warn("⚠️ PianoAudioEngine not found. Audio will be disabled.");
        return;
      }

      // Create audio engine instance
      this.audioEngine = new PianoAudioEngine();

      // Initialize the audio engine
      const initialized = await this.audioEngine.initialize();
      if (initialized) {
        this.state.audioEngineReady = true;
        console.log("✅ Audio engine initialized successfully");

        // Set initial volume
        this.audioEngine.setVolume(this.state.volume / 100);

        // Listen for audio errors
        window.addEventListener("pianoAudioError", (event) => {
          console.error("🚨 Piano audio error:", event.detail.error);
          this.handleAudioEngineError(event.detail.error);
        });

        // Listen for sampler events
        window.addEventListener("pianoSamplerReady", (event) => {
          console.log("🎹 Piano sampler loaded successfully!");
          this.updateConnectionStatus("connected", "Piano Sampler Ready");
        });

        window.addEventListener("pianoSamplerError", (event) => {
          console.warn(
            "⚠️ Piano sampler failed to load, using synthesizer fallback"
          );
          this.updateConnectionStatus("connected", "Synthesizer Active");
        });

        // Add click handler to start audio context (required by browser policies)
        this.setupAudioContextActivation();
      } else {
        console.warn("⚠️ Failed to initialize audio engine");
      }
    } catch (error) {
      console.error("❌ Error setting up audio engine:", error);
    }
  }

  /**
   * Set up audio context activation on first user interaction
   */
  setupAudioContextActivation() {
    const activateAudio = async () => {
      if (!this.state.audioContextStarted && this.audioEngine) {
        const started = await this.audioEngine.startAudioContext();
        if (started) {
          this.state.audioContextStarted = true;
          console.log("🎵 Audio context activated");

          // Update connection status to show audio is ready
          this.updateConnectionStatus("connected");

          // Remove the activation listeners
          document.removeEventListener("click", activateAudio);
          document.removeEventListener("keydown", activateAudio);
          document.removeEventListener("touchstart", activateAudio);
        }
      }
    };

    // Add listeners for first user interaction
    document.addEventListener("click", activateAudio, { once: true });
    document.addEventListener("keydown", activateAudio, { once: true });
    document.addEventListener("touchstart", activateAudio, { once: true });
  }

  /**
   * Handle audio engine errors
   */
  handleAudioEngineError(error) {
    console.error("🚨 Audio engine error:", error);
    this.state.audioEngineReady = false;

    // Show user-friendly error message
    const statusIndicator = document.getElementById("connectionStatus");
    if (statusIndicator) {
      const statusText = statusIndicator.querySelector(".status-text");
      if (statusText) {
        statusText.textContent = "Audio Error";
        statusIndicator.className = "status-indicator disconnected";
      }
    }
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
          (this.state.currentKeyWidth + this.config.keyPadding) *
          scale,
        y: 0,
        width: this.state.currentKeyWidth * scale,
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
        (this.state.currentKeyWidth + this.config.keyPadding);

      // Calculate black key width dynamically
      const blackKeyWidth = Math.round(
        this.state.currentKeyWidth * this.config.blackKeyWidthRatio
      );

      return {
        x:
          (whiteKeyStart +
            this.state.currentKeyWidth * baseOffset -
            blackKeyWidth / 2) *
          scale,
        y: 0,
        width: blackKeyWidth * scale,
        height:
          Math.round(
            this.config.whiteKeyHeight * this.config.blackKeyHeightRatio
          ) * scale,
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

        // Update audio engine volume
        if (this.audioEngine && this.state.audioEngineReady) {
          this.audioEngine.setVolume(this.state.volume / 100);
        }
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

        // Update audio engine sustain pedal
        if (this.audioEngine && this.state.audioEngineReady) {
          this.audioEngine.setSustainPedal(this.state.sustainPedal);
        }

        console.log(
          `🎵 Sustain pedal: ${this.state.sustainPedal ? "ON" : "OFF"}`
        );
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
   * Handle touch start events with enhanced mobile support
   */
  handleTouchStart(e) {
    e.preventDefault();

    // Store active touch points
    if (!this.touchPoints) {
      this.touchPoints = new Map();
    }

    for (let touch of e.touches) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / this.scale;
      const y = (touch.clientY - rect.top) / this.scale;
      const key = this.getKeyAtPosition(x, y);

      if (key) {
        this.touchPoints.set(touch.identifier, key.id);
        this.playKey(key.id);
      }
    }
  }

  /**
   * Handle touch move events with drag support
   */
  handleTouchMove(e) {
    e.preventDefault();

    if (!this.touchPoints) return;

    // Handle drag playing across keys
    for (let touch of e.touches) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / this.scale;
      const y = (touch.clientY - rect.top) / this.scale;
      const key = this.getKeyAtPosition(x, y);

      const currentKeyId = this.touchPoints.get(touch.identifier);

      if (key && key.id !== currentKeyId) {
        // Stop the previous key if not sustaining
        if (currentKeyId !== undefined && !this.state.sustainPedal) {
          this.stopKey(currentKeyId);
        }

        // Play the new key
        this.touchPoints.set(touch.identifier, key.id);
        this.playKey(key.id);
      } else if (!key && currentKeyId !== undefined) {
        // Touch moved outside any key
        if (!this.state.sustainPedal) {
          this.stopKey(currentKeyId);
        }
        this.touchPoints.delete(touch.identifier);
      }
    }
  }

  /**
   * Handle touch end events with proper cleanup
   */
  handleTouchEnd(e) {
    e.preventDefault();

    if (!this.touchPoints) return;

    // Handle ended touches
    const activeTouchIds = Array.from(e.touches).map(
      (touch) => touch.identifier
    );

    for (let [touchId, keyId] of this.touchPoints.entries()) {
      if (!activeTouchIds.includes(touchId)) {
        // This touch ended
        if (!this.state.sustainPedal) {
          this.stopKey(keyId);
        }
        this.touchPoints.delete(touchId);
      }
    }

    // Clean up if no active touches
    if (e.touches.length === 0) {
      this.touchPoints.clear();
      if (!this.state.sustainPedal) {
        this.stopAllKeys();
      }
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

    // Calculate velocity based on volume setting (0.0 to 1.0)
    const velocity = this.state.volume / 100;

    // Play note with audio engine
    if (
      this.audioEngine &&
      this.state.audioEngineReady &&
      this.state.audioContextStarted
    ) {
      this.audioEngine.playNote(key.midiNote, velocity);
    }

    // Send note to MCP server
    this.sendNoteOn(key.midiNote, this.state.volume);

    // Update visual
    this.renderPiano();

    console.log(
      `Playing key: ${key.noteName}${key.octave} (MIDI: ${
        key.midiNote
      }, velocity: ${velocity.toFixed(2)})`
    );
  }

  /**
   * Stop a piano key
   */
  stopKey(keyId) {
    if (!this.state.activeKeys.has(keyId)) return;

    this.state.activeKeys.delete(keyId);
    const key = this.keys[keyId];

    // Stop note with audio engine (updated method name)
    if (
      this.audioEngine &&
      this.state.audioEngineReady &&
      this.state.audioContextStarted
    ) {
      this.audioEngine.stopNote(key.midiNote);
    }

    // Send note off to MCP server
    this.sendNoteOff(key.midiNote);

    // Update visual
    this.renderPiano();
  }

  /**
   * Stop all active keys
   */
  stopAllKeys() {
    // Stop all notes with audio engine (updated method name)
    if (
      this.audioEngine &&
      this.state.audioEngineReady &&
      this.state.audioContextStarted
    ) {
      this.audioEngine.stopAll();
    }

    for (let keyId of this.state.activeKeys) {
      const key = this.keys[keyId];
      // Send note off to MCP server
      this.sendNoteOff(key.midiNote);
    }

    this.state.activeKeys.clear();
    this.renderPiano();
  }

  /**
   * Handle window resize with enhanced responsive behavior
   */
  handleResize() {
    if (this.canvas && this.ctx) {
      // Debounce resize handling for better performance
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.resizeCanvas();
        this.generateKeyLayout();
        this.renderPiano();
        this.updateScrollIndicators();
      }, 150);
    }
  }

  /**
   * Update scroll indicators and center piano if needed
   */
  updateScrollIndicators() {
    const container = this.canvas.parentElement.parentElement;

    if (this.state.isHorizontalScrollMode) {
      // Add scroll indicator class for styling
      container.classList.add("horizontal-scroll-mode");

      // Center the piano initially on small screens
      const containerWidth = container.clientWidth;
      const canvasWidth = this.canvas.width;
      const scrollLeft = Math.max(0, (canvasWidth - containerWidth) / 2);
      container.scrollLeft = scrollLeft;
    } else {
      container.classList.remove("horizontal-scroll-mode");
      container.scrollLeft = 0;
    }
  }

  /**
   * Scroll to a specific piano key (useful for mobile navigation)
   */
  scrollToKey(keyId) {
    if (!this.state.isHorizontalScrollMode) return;

    const key = this.keys[keyId];
    if (!key) return;

    const container = this.canvas.parentElement.parentElement;
    const containerWidth = container.clientWidth;
    const keyX = key.bounds.x;
    const keyWidth = key.bounds.width;

    // Calculate optimal scroll position to center the key
    const scrollLeft = keyX + keyWidth / 2 - containerWidth / 2;

    // Smooth scroll to the position
    container.scrollTo({
      left: Math.max(
        0,
        Math.min(scrollLeft, this.canvas.width - containerWidth)
      ),
      behavior: "smooth",
    });
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
  updateConnectionStatus(status, message = "") {
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

    if (message) {
      console.log(message);
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

  /**
   * Cleanup and dispose of resources
   */
  dispose() {
    // Stop all active notes
    this.stopAllKeys();

    // Dispose of audio engine
    if (this.audioEngine) {
      this.audioEngine.dispose();
      this.audioEngine = null;
    }

    // Clear state
    this.state.audioEngineReady = false;
    this.state.audioContextStarted = false;

    console.log("🗑️ Piano Interface disposed");
  }
}

// Initialize the piano interface when the script loads
// Note: Initialization is now handled by piano-init.js
// new PianoInterface();

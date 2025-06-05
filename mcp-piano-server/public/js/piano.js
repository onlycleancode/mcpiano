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
      remoteActiveKeys: new Set(), // Track remote note events separately
      volume: 75,
      octave: 4,
      sustainPedal: false,
      connectionStatus: "disconnected", // 'connecting', 'connected', 'disconnected'
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

    // WebSocket client for real-time communication
    this.wsClient = null;

    // Piano renderer for key highlighting
    this.pianoRenderer = null;

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
    this.setupWebSocketConnection(); // Add WebSocket setup
    this.setupPianoRenderer(); // Initialize piano renderer

    // Render immediately after setup
    this.renderPiano();

    console.log("🎹 Piano interface setup complete");
  }

  /**
   * Set up the canvas element
   */
  setupCanvas() {
    this.canvas = document.getElementById("pianoKeyboard");

    if (!this.canvas) {
      console.error("❌ Canvas element not found!");
      this.setupSVGFallback();
      return;
    }

    if (!this.canvas.getContext) {
      console.warn("❌ Canvas not supported, falling back to SVG");
      this.setupSVGFallback();
      return;
    }

    console.log("✅ Canvas element found, setting up context...");
    this.ctx = this.canvas.getContext("2d");

    if (!this.ctx) {
      console.error("❌ Failed to get 2D context from canvas!");
      this.setupSVGFallback();
      return;
    }

    console.log("✅ Canvas 2D context obtained successfully");

    // Clear any existing canvas text content
    this.canvas.innerHTML = "";

    // Force canvas to be visible
    this.canvas.style.display = "block";
    this.canvas.style.visibility = "visible";

    this.resizeCanvas();
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

    console.log(`📱 Device pixel ratio: ${dpr}`);
    console.log(`📐 Canvas bounding rect: ${rect.width}x${rect.height}`);

    // Set the actual canvas size in memory (scaled for high DPI)
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    console.log(
      `🖼️ Canvas internal dimensions: ${this.canvas.width}x${this.canvas.height}`
    );

    // Scale the canvas back down using CSS
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";

    console.log(
      `🎨 Canvas CSS dimensions: ${this.canvas.style.width} x ${this.canvas.style.height}`
    );

    // Scale the drawing context so everything draws at the correct size
    this.ctx.scale(dpr, dpr);

    console.log(`✅ High DPI setup complete`);
  }

  /**
   * Resize canvas to fit container with responsive scaling
   */
  resizeCanvas() {
    const container = this.canvas.parentElement.parentElement; // Get piano-keyboard-container
    const containerRect = container.getBoundingClientRect();

    console.log(
      `📐 Container dimensions: ${containerRect.width}x${containerRect.height}`
    );

    // Calculate available space
    const availableWidth = containerRect.width - 32; // Account for container padding
    const availableHeight = containerRect.height - 32;

    console.log(`📐 Available space: ${availableWidth}x${availableHeight}`);

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

    console.log(`🎹 Calculated piano dimensions: ${pianoWidth}x${pianoHeight}`);

    // Determine if we need horizontal scrolling
    this.state.isHorizontalScrollMode = pianoWidth > availableWidth;

    // Set canvas style dimensions first
    if (this.state.isHorizontalScrollMode) {
      // Use full piano width, enable horizontal scrolling
      this.canvas.style.width = pianoWidth + "px";
      this.canvas.style.height = pianoHeight + "px";

      // Ensure container allows horizontal scroll
      container.style.justifyContent = "flex-start";
      console.log(`🎹 Horizontal scroll mode: ${pianoWidth}x${pianoHeight}`);
    } else {
      // Fit within container
      this.canvas.style.width = pianoWidth + "px";
      this.canvas.style.height = pianoHeight + "px";

      // Center in container
      container.style.justifyContent = "center";
      console.log(`🎹 Fit mode: ${pianoWidth}x${pianoHeight}`);
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

    // Set up high DPI support after setting style dimensions
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
   * Set up the audio engine for realistic piano sounds with optimization features
   */
  async setupAudioEngine() {
    try {
      console.log("🎵 Setting up Piano Audio Engine with optimizations...");

      // Update audio status to initializing
      this.updateAudioStatus("initializing", "Initializing...");

      // Check if PianoAudioEngine is available
      if (typeof PianoAudioEngine === "undefined") {
        console.warn("⚠️ PianoAudioEngine not found. Audio will be disabled.");
        this.updateAudioStatus("error", "Audio Disabled");
        return;
      }

      // Create audio engine instance
      this.audioEngine = new PianoAudioEngine();
      this.updateAudioStatus("loading", "Loading Engine...");

      // Listen for sample preloading events
      this.setupPreloadingEventListeners();

      // Initialize the audio engine
      const initialized = await this.audioEngine.initialize();
      if (initialized) {
        this.state.audioEngineReady = true;
        console.log("✅ Audio engine initialized successfully");
        this.updateAudioStatus("ready", "Ready");

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
          this.updateAudioStatus("ready", "Sampler Ready");
        });

        window.addEventListener("pianoSamplerError", (event) => {
          console.warn(
            "⚠️ Piano sampler failed to load, using synthesizer fallback"
          );
          this.updateConnectionStatus("connected", "Synthesizer Active");
          this.updateAudioStatus("ready", "Synth Ready");
        });

        // Add click handler to start audio context (required by browser policies)
        this.setupAudioContextActivation();
      } else {
        console.warn("⚠️ Failed to initialize audio engine");
        this.updateAudioStatus("error", "Init Failed");
      }
    } catch (error) {
      console.error("❌ Error setting up audio engine:", error);
      this.updateAudioStatus("error", "Setup Error");
    }
  }

  /**
   * Set up event listeners for sample preloading progress
   */
  setupPreloadingEventListeners() {
    window.addEventListener("pianoSamplerReady", (event) => {
      console.log("🎹 Piano sampler loaded successfully!");
      this.updateConnectionStatus("connected", "Piano Sampler Ready");
      this.updateAudioStatus("ready", "Sampler Ready");
    });

    window.addEventListener("pianoSamplerError", (event) => {
      console.warn(
        "⚠️ Piano sampler failed to load, using synthesizer fallback"
      );
      this.updateConnectionStatus("connected", "Synthesizer Active");
      this.updateAudioStatus("ready", "Synth Ready");
    });
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

    // Update audio status indicator
    this.updateAudioStatus("error", "Audio Error");

    // Show user-friendly error message in connection status as well
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
    if (!this.ctx) {
      console.warn("❌ Cannot render piano: Canvas context not available");
      return;
    }

    if (!this.keys || this.keys.length === 0) {
      console.warn("❌ Cannot render piano: No keys generated");
      return;
    }

    console.log(
      `🎹 Rendering piano with ${this.keys.length} keys on canvas ${this.canvas.width}x${this.canvas.height}`
    );

    // Get the actual display dimensions (not internal canvas dimensions)
    const displayWidth = this.canvas.offsetWidth;
    const displayHeight = this.canvas.offsetHeight;

    console.log(`📐 Canvas display size: ${displayWidth}x${displayHeight}`);

    // Clear canvas completely
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Set a background to ensure canvas is working
    this.ctx.fillStyle = "#f5f5f5";
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Set rendering properties
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    // Render white keys first
    const whiteKeys = this.keys.filter((key) => !key.isBlack);
    const blackKeys = this.keys.filter((key) => key.isBlack);

    console.log(
      `🎹 Rendering ${whiteKeys.length} white keys and ${blackKeys.length} black keys`
    );

    whiteKeys.forEach((key) => this.renderKey(key));
    blackKeys.forEach((key) => this.renderKey(key));

    // Force canvas update
    this.ctx.save();
    this.ctx.restore();

    console.log("✅ Piano rendering complete");
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

    // Sustain button with enhanced feedback
    const sustainButton = document.getElementById("sustainToggle");
    const sustainText = sustainButton?.querySelector(".sustain-text");
    if (sustainButton) {
      sustainButton.addEventListener("click", () => {
        this.state.sustainPedal = !this.state.sustainPedal;
        sustainButton.classList.toggle("active", this.state.sustainPedal);

        // Update sustain text
        if (sustainText) {
          sustainText.textContent = this.state.sustainPedal ? "On" : "Off";
        }

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
   * Set up WebSocket connection for real-time communication
   */
  setupWebSocketConnection() {
    try {
      console.log("🔌 Initializing WebSocket connection...");

      // Initialize WebSocket client
      this.wsClient = new PianoWebSocketClient();

      // Subscribe to WebSocket messages for remote note events
      this.wsClient.on("note_on", (data) => {
        console.log("📨 Remote note_on received:", data);
        this.handleRemoteNoteOn(data);
      });

      this.wsClient.on("note_off", (data) => {
        console.log("📨 Remote note_off received:", data);
        this.handleRemoteNoteOff(data);
      });

      // Handle connection state changes
      this.wsClient.on("connected", () => {
        console.log("✅ WebSocket connected");
        this.updateConnectionStatus("connected", "Connected to server");
      });

      this.wsClient.on("disconnected", (data) => {
        console.log("❌ WebSocket disconnected:", data);
        this.updateConnectionStatus("disconnected", "Disconnected from server");
      });

      this.wsClient.on("error", (error) => {
        console.error("❌ WebSocket error:", error);
        this.updateConnectionStatus("disconnected", "Connection error");
      });

      // Handle state synchronization
      this.wsClient.on("state_sync", (stateInfo) => {
        console.log("🔄 State sync received:", stateInfo);
        this.handleStateSync(stateInfo);
      });

      // Update initial connection status
      this.updateConnectionStatus("connecting", "Connecting to server...");

      console.log("✅ WebSocket client initialized");
    } catch (error) {
      console.error("❌ Failed to initialize WebSocket connection:", error);
      this.updateConnectionStatus("disconnected", "Connection failed");
    }
  }

  /**
   * Handle remote note_on events from WebSocket
   */
  handleRemoteNoteOn(data) {
    const { midiNumber, velocity } = data;

    // Add to remote active keys for visual distinction
    this.state.remoteActiveKeys.add(midiNumber);

    // Find the key and highlight it with remote styling
    const keyId = this.findKeyByMidiNote(midiNumber);
    if (keyId !== -1) {
      // Highlight key with remote visual feedback
      this.highlightRemoteKey(keyId, velocity);
    }

    // Play the note through audio engine if available
    if (this.audioEngine && this.state.audioEngineReady) {
      this.audioEngine.playNote(midiNumber, velocity);
    }
  }

  /**
   * Handle remote note_off events from WebSocket
   */
  handleRemoteNoteOff(data) {
    const { midiNumber } = data;

    // Remove from remote active keys
    this.state.remoteActiveKeys.delete(midiNumber);

    // Find the key and unhighlight it
    const keyId = this.findKeyByMidiNote(midiNumber);
    if (keyId !== -1) {
      // Unhighlight remote key
      this.unhighlightRemoteKey(keyId);
    }

    // Stop the note through audio engine if available
    if (this.audioEngine && this.state.audioEngineReady) {
      this.audioEngine.stopNote(midiNumber);
    }
  }

  /**
   * Handle state synchronization from server
   */
  handleStateSync(stateInfo) {
    // Clear current remote keys
    this.state.remoteActiveKeys.clear();

    // Apply remote active notes from server state
    if (stateInfo.activeNotes && Array.isArray(stateInfo.activeNotes)) {
      stateInfo.activeNotes.forEach((noteData) => {
        this.state.remoteActiveKeys.add(noteData.midiNumber);

        // Highlight the key
        const keyId = this.findKeyByMidiNote(noteData.midiNumber);
        if (keyId !== -1) {
          this.highlightRemoteKey(keyId, noteData.velocity || 64);
        }
      });
    }

    // Update connection status with client count info
    const clientCount = stateInfo.activeClientCount || 0;
    this.updateConnectionStatus(
      "connected",
      `Connected (${clientCount} clients)`
    );

    // Re-render piano to show updated state
    this.renderPiano();
  }

  /**
   * Find key ID by MIDI note number
   */
  findKeyByMidiNote(midiNumber) {
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i].midiNote === midiNumber) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Highlight key with remote visual feedback
   */
  highlightRemoteKey(keyId, velocity) {
    if (keyId < 0 || keyId >= this.keys.length) return;

    const key = this.keys[keyId];
    if (!key) return;

    // Mark key as remotely active for visual distinction
    key.remoteActive = true;
    key.remoteVelocity = velocity;

    // Re-render the key with remote styling
    this.renderKey(key);
  }

  /**
   * Unhighlight remote key
   */
  unhighlightRemoteKey(keyId) {
    if (keyId < 0 || keyId >= this.keys.length) return;

    const key = this.keys[keyId];
    if (!key) return;

    // Remove remote active state
    key.remoteActive = false;
    key.remoteVelocity = 0;

    // Re-render the key
    this.renderKey(key);
  }

  /**
   * Set up the piano renderer for key highlighting
   */
  setupPianoRenderer() {
    if (this.canvas && this.ctx) {
      this.pianoRenderer = new PianoRenderer(this.canvas, this.ctx);
      console.log("✅ Piano renderer initialized");
    }
  }

  /**
   * Enhanced key rendering with remote vs local visual feedback
   */
  renderKey(key) {
    if (!this.ctx || !key.bounds) return;

    const ctx = this.ctx;
    const bounds = key.bounds;

    // Determine key state and colors
    let fillColor,
      strokeColor,
      strokeWidth = 1;

    if (key.isBlack) {
      // Black key colors
      if (key.active) {
        // Local active - bright highlight
        fillColor = "#4a90e2"; // Bright blue for local
        strokeColor = "#2c5aa0";
        strokeWidth = 2;
      } else if (key.remoteActive) {
        // Remote active - different color to distinguish
        fillColor = "#e24a90"; // Pink/magenta for remote
        strokeColor = "#a02c5a";
        strokeWidth = 2;
      } else {
        // Inactive black key
        fillColor = "#2c2c2c";
        strokeColor = "#1a1a1a";
      }
    } else {
      // White key colors
      if (key.active) {
        // Local active - bright highlight
        fillColor = "#e8f4fd"; // Light blue for local
        strokeColor = "#4a90e2";
        strokeWidth = 2;
      } else if (key.remoteActive) {
        // Remote active - different color to distinguish
        fillColor = "#fde8f4"; // Light pink for remote
        strokeColor = "#e24a90";
        strokeWidth = 2;
      } else {
        // Inactive white key
        fillColor = "#ffffff";
        strokeColor = "#cccccc";
      }
    }

    // Draw key fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw key border
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Add velocity-based visual feedback for active keys
    if (key.active || key.remoteActive) {
      const velocity = key.active
        ? key.velocity || 64
        : key.remoteVelocity || 64;
      const opacity = Math.max(0.1, Math.min(0.8, velocity / 127));

      // Add a subtle glow effect
      const glowColor = key.active
        ? "rgba(74, 144, 226, " + opacity + ")"
        : "rgba(226, 74, 144, " + opacity + ")";

      ctx.save();
      ctx.globalAlpha = opacity * 0.5;
      ctx.fillStyle = glowColor;
      ctx.fillRect(
        bounds.x + 1,
        bounds.y + 1,
        bounds.width - 2,
        bounds.height - 2
      );
      ctx.restore();
    }

    // Draw note label for white keys
    if (!key.isBlack && bounds.height > 60) {
      ctx.fillStyle = key.active || key.remoteActive ? "#333" : "#999";
      ctx.font = `${Math.min(12, bounds.width * 0.4)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      const noteText = key.note + key.octave;
      ctx.fillText(
        noteText,
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height - 5
      );
    }
  }

  /**
   * Enhanced playKey method with WebSocket integration
   */
  playKey(keyId) {
    if (keyId < 0 || keyId >= this.keys.length) return;

    const key = this.keys[keyId];
    if (key.active) return; // Already playing

    // Calculate velocity based on UI interaction (simplified)
    const velocity = 64 + Math.floor(Math.random() * 40); // Random velocity between 64-103

    // Mark key as locally active
    key.active = true;
    key.velocity = velocity;
    this.state.activeKeys.add(keyId);

    // Play audio locally
    if (this.audioEngine && this.state.audioEngineReady) {
      this.audioEngine.playNote(key.midiNote, velocity);
    }

    // Send note_on event to server via WebSocket
    if (this.wsClient && this.wsClient.getState() === "Connected") {
      this.wsClient.sendNoteOn(key.midiNote, velocity);
    }

    // Re-render the key with local active styling
    this.renderKey(key);

    console.log(
      `🎹 Local note ON: ${key.note}${key.octave} (${key.midiNote}) velocity: ${velocity}`
    );
  }

  /**
   * Enhanced stopKey method with WebSocket integration
   */
  stopKey(keyId) {
    if (keyId < 0 || keyId >= this.keys.length) return;

    const key = this.keys[keyId];
    if (!key.active) return; // Not currently playing locally

    // Mark key as locally inactive
    key.active = false;
    key.velocity = 0;
    this.state.activeKeys.delete(keyId);

    // Stop audio locally
    if (this.audioEngine && this.state.audioEngineReady) {
      this.audioEngine.stopNote(key.midiNote);
    }

    // Send note_off event to server via WebSocket
    if (this.wsClient && this.wsClient.getState() === "Connected") {
      this.wsClient.sendNoteOff(key.midiNote);
    }

    // Re-render the key
    this.renderKey(key);

    console.log(
      `🎹 Local note OFF: ${key.note}${key.octave} (${key.midiNote})`
    );
  }

  /**
   * Enhanced stopAllKeys method with WebSocket integration
   */
  stopAllKeys() {
    // Stop all local keys
    for (const keyId of this.state.activeKeys) {
      const key = this.keys[keyId];
      key.active = false;
      key.velocity = 0;

      // Stop audio
      if (this.audioEngine && this.state.audioEngineReady) {
        this.audioEngine.stopNote(key.midiNote);
      }

      // Send note off to server
      if (this.wsClient && this.wsClient.getState() === "Connected") {
        this.wsClient.sendNoteOff(key.midiNote);
      }
    }

    // Clear local active keys
    this.state.activeKeys.clear();

    // Note: Don't clear remote keys here as they should be managed by remote events

    this.renderPiano();
  }

  /**
   * Set up MCP server connection (legacy method, now uses WebSocket)
   */
  setupMCPConnection() {
    // This method is now handled by setupWebSocketConnection()
    // Kept for backward compatibility
    console.log("📝 MCP connection now handled via WebSocket");
  }

  /**
   * Enhanced connection status update with WebSocket state
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

      const displayText = message || statusMessages[status] || "Unknown";
      statusText.textContent = displayText;

      // Add visual feedback for connection state
      if (status === "connected") {
        statusIndicator.style.borderColor = "#4CAF50";
      } else if (status === "connecting") {
        statusIndicator.style.borderColor = "#FF9800";
      } else {
        statusIndicator.style.borderColor = "#F44336";
      }
    }

    if (message) {
      console.log(`🔌 Connection: ${status} - ${message}`);
    }
  }

  /**
   * Send note on event to server (legacy method, now uses WebSocket)
   */
  sendNoteOn(midiNote, velocity) {
    // This method is now handled by wsClient.sendNoteOn() in playKey()
    console.log(
      `📤 Note ON sent via WebSocket: ${midiNote}, velocity: ${velocity}`
    );
  }

  /**
   * Send note off event to server (legacy method, now uses WebSocket)
   */
  sendNoteOff(midiNote) {
    // This method is now handled by wsClient.sendNoteOff() in stopKey()
    console.log(`📤 Note OFF sent via WebSocket: ${midiNote}`);
  }

  /**
   * Enhanced cleanup and dispose of resources
   */
  dispose() {
    // Stop all active notes
    this.stopAllKeys();

    // Disconnect WebSocket
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.wsClient = null;
    }

    // Dispose of audio engine
    if (this.audioEngine) {
      this.audioEngine.dispose();
      this.audioEngine = null;
    }

    // Clear state
    this.state.audioEngineReady = false;
    this.state.audioContextStarted = false;
    this.state.activeKeys.clear();
    this.state.remoteActiveKeys.clear();

    console.log("🗑️ Piano Interface disposed with WebSocket cleanup");
  }

  /**
   * Update the audio engine status indicator
   * @param {string} status - Status: 'initializing', 'loading', 'ready', 'error'
   * @param {string} message - Status message to display
   */
  updateAudioStatus(status, message) {
    const audioStatus = document.getElementById("audioStatus");
    const audioStatusText = audioStatus?.querySelector(".audio-status-text");

    if (audioStatus && audioStatusText) {
      // Remove all status classes
      audioStatus.classList.remove("ready", "error", "loading");

      // Add current status class
      if (status !== "initializing") {
        audioStatus.classList.add(status);
      }

      // Update status text
      audioStatusText.textContent = message;

      console.log(`🎛️ Audio Status: ${status} - ${message}`);
    }
  }
}

// Initialize the piano interface when the script loads
// Note: Initialization is now handled by piano-init.js
// new PianoInterface();

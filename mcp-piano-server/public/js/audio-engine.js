/**
 * Piano Audio Engine - High-quality piano sound synthesis using Tone.js
 * Provides realistic piano sounds with velocity sensitivity and polyphony
 * Enhanced with piano sampler for ultra-realistic sound
 */

class PianoAudioEngine {
  constructor() {
    this.isInitialized = false;
    this.isAudioContextStarted = false;
    this.synth = null;
    this.sampler = null;
    this.reverb = null;
    this.compressor = null;
    this.masterVolume = null;
    this.activeNotes = new Map(); // Track active notes for polyphony
    this.sustainPedal = false;
    this.sustainedNotes = new Set(); // Notes held by sustain pedal

    // Audio engine configuration
    this.config = {
      polyphony: 32, // Maximum simultaneous notes
      reverbAmount: 0.3,
      reverbDecay: 2.5,
      compressorThreshold: -24,
      compressorRatio: 8,
      masterVolumeDb: -12,
      velocityCurve: "exponential", // How velocity affects volume
      useSampler: true, // Prefer sampler over synthesizer
      samplerFallback: true, // Fall back to synth if sampler fails
    };

    // Sample configuration with strategically placed sample points
    this.sampleConfig = {
      // University of Iowa samples (high quality, free for any use)
      baseUrl:
        "https://theremin.music.uiowa.edu/sound%20files/MIS/Piano_Other/piano/",
      urls: {
        // Low range - deep bass notes
        A0: "Piano.mf.A0.aiff",
        C2: "Piano.mf.C2.aiff",
        F2: "Piano.mf.F2.aiff",

        // Mid-low range
        C3: "Piano.mf.C3.aiff",
        F3: "Piano.mf.F3.aiff",
        A3: "Piano.mf.A3.aiff",

        // Mid range (most important for realistic sound)
        C4: "Piano.mf.C4.aiff",
        E4: "Piano.mf.E4.aiff",
        G4: "Piano.mf.G4.aiff",
        A4: "Piano.mf.A4.aiff",

        // Mid-high range
        C5: "Piano.mf.C5.aiff",
        F5: "Piano.mf.F5.aiff",
        A5: "Piano.mf.A5.aiff",

        // High range
        C6: "Piano.mf.C6.aiff",
        F6: "Piano.mf.F6.aiff",
        C7: "Piano.mf.C7.aiff",
      },
      // Fallback samples (if University of Iowa samples fail)
      fallbackUrls: {
        C4: "/assets/samples/fallback/C4.mp3",
        E4: "/assets/samples/fallback/E4.mp3",
        G4: "/assets/samples/fallback/G4.mp3",
        C5: "/assets/samples/fallback/C5.mp3",
      },
    };

    this.samplerReady = false;
    this.synthReady = false;

    console.log("🎵 PianoAudioEngine created with sampler support");
  }

  /**
   * Initialize the audio engine with Tone.js
   * Must be called after user interaction due to browser audio policies
   */
  async initialize() {
    try {
      console.log("🎹 Initializing Piano Audio Engine with Sampler...");

      // Check if Tone.js is available
      if (typeof Tone === "undefined") {
        throw new Error(
          "Tone.js library not loaded. Please ensure the Tone.js script is included."
        );
      }

      // Initialize audio effects chain first
      await this.initializeEffects();

      // Initialize sampler and synthesizer
      if (this.config.useSampler) {
        await this.initializeSampler();
      }

      // Always initialize synthesizer as fallback
      await this.initializeSynthesizer();

      this.isInitialized = true;
      console.log("✅ Piano Audio Engine initialized successfully");
      console.log(`🎛️ Polyphony: ${this.config.polyphony} voices`);
      console.log(`🔊 Master Volume: ${this.config.masterVolumeDb}dB`);
      console.log(`🌊 Reverb: ${this.config.reverbAmount * 100}% wet`);
      console.log(`🎹 Sampler Ready: ${this.samplerReady}`);
      console.log(`🎵 Synthesizer Ready: ${this.synthReady}`);

      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Piano Audio Engine:", error);
      this.handleAudioError(error);
      return false;
    }
  }

  /**
   * Initialize audio effects chain
   */
  async initializeEffects() {
    // Create reverb effect for spatial depth
    this.reverb = new Tone.Reverb({
      decay: this.config.reverbDecay,
      wet: this.config.reverbAmount,
      preDelay: 0.01,
    });

    // Create compressor for dynamic control
    this.compressor = new Tone.Compressor({
      threshold: this.config.compressorThreshold,
      ratio: this.config.compressorRatio,
      attack: 0.003,
      release: 0.1,
    });

    // Create master volume control
    this.masterVolume = new Tone.Volume(this.config.masterVolumeDb);

    // Wait for reverb to be ready
    await this.reverb.ready;

    console.log("🎛️ Audio effects chain initialized");
  }

  /**
   * Initialize piano sampler with high-quality samples
   */
  async initializeSampler() {
    try {
      console.log("🎹 Loading piano sampler...");

      // Create sampler with piano samples
      this.sampler = new Tone.Sampler({
        urls: this.sampleConfig.urls,
        baseUrl: this.sampleConfig.baseUrl,
        onload: () => {
          this.onSamplerReady();
        },
        onerror: (error) => {
          console.warn("⚠️ Sampler loading error:", error);
          this.onSamplerError(error);
        },
        attack: 0.01,
        release: 1.0,
        curve: "exponential",
      });

      // Connect sampler to effects chain
      this.sampler.chain(
        this.reverb,
        this.compressor,
        this.masterVolume,
        Tone.Destination
      );

      console.log("🎹 Piano sampler created, loading samples...");

      // Set a timeout for sample loading
      setTimeout(() => {
        if (!this.samplerReady) {
          console.warn(
            "⚠️ Sampler loading timeout, using synthesizer fallback"
          );
          this.onSamplerError(new Error("Sample loading timeout"));
        }
      }, 10000); // 10 second timeout
    } catch (error) {
      console.error("❌ Error creating sampler:", error);
      this.onSamplerError(error);
    }
  }

  /**
   * Initialize synthesizer as fallback
   */
  async initializeSynthesizer() {
    try {
      console.log("🎵 Initializing synthesizer...");

      // Create the main piano synthesizer with multiple oscillators for realistic sound
      this.synth = new Tone.PolySynth({
        maxPolyphony: this.config.polyphony,
        voice: Tone.Synth,
        options: {
          oscillator: {
            type: "triangle",
            harmonicity: 2,
            modulationType: "sine",
            modulationIndex: 0.5,
          },
          envelope: {
            attack: 0.02,
            decay: 0.3,
            sustain: 0.4,
            release: 1.2,
            attackCurve: "exponential",
            decayCurve: "exponential",
            releaseCurve: "exponential",
          },
          filterEnvelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.3,
            release: 0.8,
            baseFrequency: 300,
            octaves: 4,
          },
        },
      });

      // Connect synthesizer to effects chain
      this.synth.chain(
        this.reverb,
        this.compressor,
        this.masterVolume,
        Tone.Destination
      );

      this.synthReady = true;
      console.log("✅ Synthesizer initialized");
    } catch (error) {
      console.error("❌ Error creating synthesizer:", error);
      throw error;
    }
  }

  /**
   * Called when sampler is ready
   */
  onSamplerReady() {
    this.samplerReady = true;
    console.log("✅ Piano sampler loaded successfully");
    console.log(
      `🎹 Loaded ${Object.keys(this.sampleConfig.urls).length} sample points`
    );

    // Emit custom event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pianoSamplerReady", {
          detail: { engine: this },
        })
      );
    }
  }

  /**
   * Called when sampler fails to load
   */
  onSamplerError(error) {
    console.warn("⚠️ Piano sampler failed to load:", error);
    this.samplerReady = false;

    if (this.config.samplerFallback && this.synthReady) {
      console.log("🎵 Using synthesizer fallback");
    } else {
      console.error("❌ No audio source available");
    }

    // Emit custom event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pianoSamplerError", {
          detail: { error, engine: this },
        })
      );
    }
  }

  /**
   * Get the active audio source (sampler or synthesizer)
   */
  getActiveAudioSource() {
    if (this.samplerReady && this.sampler) {
      return this.sampler;
    } else if (this.synthReady && this.synth) {
      return this.synth;
    }
    return null;
  }

  /**
   * Get audio source type
   */
  getAudioSourceType() {
    if (this.samplerReady && this.sampler) {
      return "sampler";
    } else if (this.synthReady && this.synth) {
      return "synthesizer";
    }
    return "none";
  }

  /**
   * Start the audio context (required by browser audio policies)
   * Must be called in response to user interaction
   */
  async startAudioContext() {
    try {
      if (this.isAudioContextStarted) {
        return true;
      }

      if (!this.isInitialized) {
        console.warn(
          "⚠️ Audio engine not initialized. Call initialize() first."
        );
        return false;
      }

      // Start Tone.js audio context
      if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("🎵 Audio context started");
      }

      this.isAudioContextStarted = true;
      return true;
    } catch (error) {
      console.error("❌ Failed to start audio context:", error);
      this.handleAudioError(error);
      return false;
    }
  }

  /**
   * Play a piano note with velocity sensitivity and ADSR envelope
   * @param {string|number} midiNumber - MIDI note number (21-108) or note name (e.g., 'C4')
   * @param {number} velocity - Velocity from 0-127 (MIDI standard) or 0.0-1.0 (normalized)
   * @param {number} duration - Note duration in seconds (optional, for automatic release)
   */
  playNote(midiNumber, velocity = 90, duration = null) {
    try {
      if (!this.isInitialized || !this.isAudioContextStarted) {
        console.warn(
          "⚠️ Audio engine not ready. Initialize and start audio context first."
        );
        return false;
      }

      // Get active audio source
      const audioSource = this.getActiveAudioSource();
      if (!audioSource) {
        console.warn("⚠️ No audio source available");
        return false;
      }

      // Convert MIDI number to note name if needed
      const noteName =
        typeof midiNumber === "number"
          ? this.midiToNoteName(midiNumber)
          : midiNumber;

      // Normalize velocity to 0.0-1.0 range
      let normalizedVelocity;
      if (velocity > 1.0) {
        // MIDI velocity (0-127) - convert to 0.0-1.0
        normalizedVelocity = Math.max(0, Math.min(127, velocity)) / 127;
      } else {
        // Already normalized (0.0-1.0)
        normalizedVelocity = Math.max(0, Math.min(1, velocity));
      }

      // Map velocity to volume range (-20 to 0 dB) as specified
      const velocityDb = -20 + normalizedVelocity * 20;

      // Apply velocity curve for more realistic dynamics
      const adjustedVelocity = this.applyVelocityCurve(normalizedVelocity);

      // Configure ADSR envelope for realistic attack/release
      if (audioSource.envelope) {
        // Adjust envelope based on velocity for more realistic response
        const velocityFactor = normalizedVelocity;
        audioSource.envelope.attack = 0.01 + velocityFactor * 0.02; // 0.01-0.03s attack
        audioSource.envelope.decay = 0.1 + velocityFactor * 0.2; // 0.1-0.3s decay
        audioSource.envelope.sustain = 0.3 + velocityFactor * 0.4; // 0.3-0.7 sustain level
        audioSource.envelope.release = 0.8 + velocityFactor * 0.4; // 0.8-1.2s release
      }

      // Play the note with ADSR envelope
      if (duration) {
        // Play note with specific duration and automatic release
        audioSource.triggerAttackRelease(
          noteName,
          duration,
          undefined,
          adjustedVelocity
        );

        console.log(
          `🎵 Playing note: ${noteName} (MIDI: ${
            typeof midiNumber === "number" ? midiNumber : "N/A"
          }, ` +
            `velocity: ${velocity}, dB: ${velocityDb.toFixed(
              1
            )}, duration: ${duration}s, ` +
            `source: ${this.getAudioSourceType()})`
        );
      } else {
        // Start note (will need manual release)
        audioSource.triggerAttack(noteName, undefined, adjustedVelocity);

        // Track active note with enhanced metadata
        this.activeNotes.set(noteName, {
          midiNumber:
            typeof midiNumber === "number"
              ? midiNumber
              : this.noteNameToMidi(noteName),
          velocity: adjustedVelocity,
          originalVelocity: velocity,
          velocityDb: velocityDb,
          startTime: Tone.now(),
          source: this.getAudioSourceType(),
        });

        console.log(
          `🎵 Playing note: ${noteName} (MIDI: ${
            typeof midiNumber === "number" ? midiNumber : "N/A"
          }, ` +
            `velocity: ${velocity}, dB: ${velocityDb.toFixed(1)}, ` +
            `source: ${this.getAudioSourceType()})`
        );
      }

      return true;
    } catch (error) {
      console.error("❌ Error playing note:", error);
      this.handleAudioError(error);
      return false;
    }
  }

  /**
   * Play multiple notes simultaneously (chord)
   * @param {number[]} midiNumbers - Array of MIDI note numbers
   * @param {number} velocity - Velocity from 0-127 (MIDI standard) or 0.0-1.0 (normalized)
   * @param {number} duration - Note duration in seconds (optional, for automatic release)
   */
  playChord(midiNumbers, velocity = 90, duration = null) {
    try {
      if (!this.isInitialized || !this.isAudioContextStarted) {
        console.warn(
          "⚠️ Audio engine not ready. Initialize and start audio context first."
        );
        return false;
      }

      if (!Array.isArray(midiNumbers) || midiNumbers.length === 0) {
        console.warn("⚠️ Invalid chord: midiNumbers must be a non-empty array");
        return false;
      }

      // Get active audio source
      const audioSource = this.getActiveAudioSource();
      if (!audioSource) {
        console.warn("⚠️ No audio source available");
        return false;
      }

      // Normalize velocity
      let normalizedVelocity;
      if (velocity > 1.0) {
        normalizedVelocity = Math.max(0, Math.min(127, velocity)) / 127;
      } else {
        normalizedVelocity = Math.max(0, Math.min(1, velocity));
      }

      // Convert MIDI numbers to note names and ensure no phase issues
      const noteNames = midiNumbers.map((midi) => this.midiToNoteName(midi));
      const adjustedVelocity = this.applyVelocityCurve(normalizedVelocity);
      const velocityDb = -20 + normalizedVelocity * 20;

      // Play all notes simultaneously to avoid phase issues
      const playTime = Tone.now();

      if (duration) {
        // Play chord with specific duration
        noteNames.forEach((noteName) => {
          audioSource.triggerAttackRelease(
            noteName,
            duration,
            playTime,
            adjustedVelocity
          );
        });
      } else {
        // Start all notes simultaneously
        noteNames.forEach((noteName, index) => {
          audioSource.triggerAttack(noteName, playTime, adjustedVelocity);

          // Track each note in the chord
          this.activeNotes.set(noteName, {
            midiNumber: midiNumbers[index],
            velocity: adjustedVelocity,
            originalVelocity: velocity,
            velocityDb: velocityDb,
            startTime: playTime,
            source: this.getAudioSourceType(),
            isChordNote: true,
            chordId: `chord_${playTime}`, // Group chord notes together
          });
        });
      }

      console.log(
        `🎵 Playing chord: [${noteNames.join(", ")}] (MIDI: [${midiNumbers.join(
          ", "
        )}], ` +
          `velocity: ${velocity}, dB: ${velocityDb.toFixed(1)}, ` +
          `${
            duration ? `duration: ${duration}s, ` : ""
          }source: ${this.getAudioSourceType()})`
      );

      return true;
    } catch (error) {
      console.error("❌ Error playing chord:", error);
      this.handleAudioError(error);
      return false;
    }
  }

  /**
   * Stop a specific note with immediate release and short fade
   * @param {string|number} midiNumber - MIDI note number or note name to stop
   */
  stopNote(midiNumber) {
    try {
      if (!this.isInitialized || !this.isAudioContextStarted) {
        return false;
      }

      const audioSource = this.getActiveAudioSource();
      if (!audioSource) {
        return false;
      }

      // Convert MIDI number to note name if needed
      const noteName =
        typeof midiNumber === "number"
          ? this.midiToNoteName(midiNumber)
          : midiNumber;

      // Check if note is currently active
      if (!this.activeNotes.has(noteName)) {
        console.log(`🎵 Note ${noteName} is not currently playing`);
        return true;
      }

      // Immediate release with short fade (0.05 seconds) to avoid clicks
      const releaseTime = 0.05;

      // Check if sustain pedal is active
      if (this.sustainPedal) {
        // Add to sustained notes instead of releasing
        this.sustainedNotes.add(noteName);
        console.log(`🎵 Note ${noteName} sustained by pedal`);
        return true;
      }

      // Perform immediate release with short fade
      if (audioSource.triggerRelease) {
        audioSource.triggerRelease(noteName, `+${releaseTime}`);
      } else {
        // Fallback for sources without triggerRelease
        audioSource.releaseAll();
      }

      // Remove from active notes
      this.activeNotes.delete(noteName);

      console.log(
        `🎵 Stopped note: ${noteName} (MIDI: ${
          typeof midiNumber === "number" ? midiNumber : "N/A"
        }, ` + `fade: ${releaseTime}s)`
      );

      return true;
    } catch (error) {
      console.error("❌ Error stopping note:", error);
      this.handleAudioError(error);
      return false;
    }
  }

  /**
   * Stop all currently playing notes and clear scheduled events
   */
  stopAll() {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Cancel all scheduled events in Tone.js transport
      if (typeof Tone !== "undefined" && Tone.Transport) {
        Tone.Transport.cancel();
      }

      // Stop notes on all available sources with immediate release
      if (this.samplerReady && this.sampler) {
        this.sampler.releaseAll(Tone.now() + 0.05); // 50ms fade to avoid clicks
      }
      if (this.synthReady && this.synth) {
        this.synth.releaseAll(Tone.now() + 0.05); // 50ms fade to avoid clicks
      }

      // Clear all tracking data
      const activeCount = this.activeNotes.size;
      const sustainedCount = this.sustainedNotes.size;

      this.activeNotes.clear();
      this.sustainedNotes.clear();

      // Reset sustain pedal state
      this.sustainPedal = false;

      console.log(
        `🔇 All notes stopped (${activeCount} active, ${sustainedCount} sustained). ` +
          `Scheduled events cleared.`
      );

      return true;
    } catch (error) {
      console.error("❌ Error stopping all notes:", error);
      return false;
    }
  }

  // Backward compatibility methods
  /**
   * @deprecated Use stopNote() instead
   * Release a piano note (backward compatibility)
   */
  releaseNote(note) {
    console.warn("⚠️ releaseNote() is deprecated. Use stopNote() instead.");
    return this.stopNote(note);
  }

  /**
   * @deprecated Use stopAll() instead
   * Stop all currently playing notes (backward compatibility)
   */
  stopAllNotes() {
    console.warn("⚠️ stopAllNotes() is deprecated. Use stopAll() instead.");
    return this.stopAll();
  }

  /**
   * Set sustain pedal state
   * @param {boolean} sustained - Whether sustain pedal is pressed
   */
  setSustainPedal(sustained) {
    try {
      this.sustainPedal = sustained;

      if (!sustained && this.sustainedNotes.size > 0) {
        const audioSource = this.getActiveAudioSource();
        if (audioSource) {
          // Release all sustained notes when pedal is lifted
          for (const noteName of this.sustainedNotes) {
            audioSource.triggerRelease(noteName);
            this.activeNotes.delete(noteName);
          }
          console.log(
            `🎵 Released ${this.sustainedNotes.size} sustained notes`
          );
        }
        this.sustainedNotes.clear();
      }

      console.log(`🎵 Sustain pedal: ${sustained ? "ON" : "OFF"}`);
      return true;
    } catch (error) {
      console.error("❌ Error setting sustain pedal:", error);
      return false;
    }
  }

  /**
   * Set master volume
   * @param {number} volume - Volume from 0.0 to 1.0
   */
  setVolume(volume) {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Ensure volume is within valid range
      volume = Math.max(0, Math.min(1, volume));

      // Convert to decibels (-60dB to 0dB range)
      const volumeDb = volume === 0 ? -Infinity : -60 + volume * 60;

      this.masterVolume.volume.value = volumeDb;
      console.log(
        `🔊 Master volume set to ${(volume * 100).toFixed(
          0
        )}% (${volumeDb.toFixed(1)}dB)`
      );
      return true;
    } catch (error) {
      console.error("❌ Error setting volume:", error);
      return false;
    }
  }

  /**
   * Switch between sampler and synthesizer
   * @param {boolean} useSampler - Whether to use sampler (true) or synthesizer (false)
   */
  switchAudioSource(useSampler) {
    if (useSampler && this.samplerReady) {
      this.config.useSampler = true;
      console.log("🎹 Switched to piano sampler");
    } else if (!useSampler && this.synthReady) {
      this.config.useSampler = false;
      console.log("🎵 Switched to synthesizer");
    } else {
      console.warn("⚠️ Requested audio source not available");
      return false;
    }
    return true;
  }

  /**
   * Get current audio engine status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAudioContextStarted: this.isAudioContextStarted,
      audioContextState:
        typeof Tone !== "undefined" ? Tone.context.state : "unknown",
      activeNotes: this.activeNotes.size,
      sustainedNotes: this.sustainedNotes.size,
      sustainPedal: this.sustainPedal,
      polyphony: this.config.polyphony,
      samplerReady: this.samplerReady,
      synthReady: this.synthReady,
      activeSource: this.getAudioSourceType(),
      sampleCount: Object.keys(this.sampleConfig.urls).length,
    };
  }

  /**
   * Convert MIDI note number to note name
   * @param {number} midiNumber - MIDI note number (0-127)
   * @returns {string} Note name (e.g., 'C4')
   */
  midiToNoteName(midiNumber) {
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
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteIndex = midiNumber % 12;
    return noteNames[noteIndex] + octave;
  }

  /**
   * Convert note name to MIDI note number
   * @param {string} noteName - Note name (e.g., 'C4', 'F#3')
   * @returns {number} MIDI note number (0-127)
   */
  noteNameToMidi(noteName) {
    const noteMap = {
      C: 0,
      "C#": 1,
      DB: 1,
      D: 2,
      "D#": 3,
      EB: 3,
      E: 4,
      F: 5,
      "F#": 6,
      GB: 6,
      G: 7,
      "G#": 8,
      AB: 8,
      A: 9,
      "A#": 10,
      BB: 10,
      B: 11,
    };

    // Parse note name (e.g., "C4", "F#3", "Bb2")
    const match = noteName.match(/^([A-G][#B]?)(-?\d+)$/i);
    if (!match) {
      console.warn(`⚠️ Invalid note name: ${noteName}`);
      return 60; // Default to middle C
    }

    const notePart = match[1].toUpperCase();
    const octave = parseInt(match[2]);

    if (!(notePart in noteMap)) {
      console.warn(`⚠️ Invalid note: ${notePart}`);
      return 60; // Default to middle C
    }

    // Calculate MIDI number: (octave + 1) * 12 + note offset
    const midiNumber = (octave + 1) * 12 + noteMap[notePart];

    // Ensure MIDI number is within valid range (0-127)
    return Math.max(0, Math.min(127, midiNumber));
  }

  /**
   * Apply velocity curve for more realistic dynamics
   * @param {number} velocity - Raw velocity (0.0 to 1.0)
   * @returns {number} Adjusted velocity
   */
  applyVelocityCurve(velocity) {
    switch (this.config.velocityCurve) {
      case "linear":
        return velocity;
      case "exponential":
        return Math.pow(velocity, 1.5);
      case "logarithmic":
        return Math.log(velocity * 9 + 1) / Math.log(10);
      default:
        return velocity;
    }
  }

  /**
   * Handle audio-related errors
   * @param {Error} error - The error that occurred
   */
  handleAudioError(error) {
    console.error("🚨 Audio Engine Error:", error);

    // Check for common audio issues
    if (error.message.includes("AudioContext")) {
      console.error(
        "💡 Audio context issue. Try clicking on the page to start audio."
      );
    } else if (error.message.includes("Tone.js")) {
      console.error(
        "💡 Tone.js library issue. Check if the library is properly loaded."
      );
    } else if (error.message.includes("permission")) {
      console.error(
        "💡 Audio permission denied. Check browser audio settings."
      );
    } else if (
      error.message.includes("sample") ||
      error.message.includes("load")
    ) {
      console.error("💡 Sample loading issue. Using synthesizer fallback.");
    }

    // Emit custom event for error handling by the main application
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pianoAudioError", {
          detail: { error, engine: this },
        })
      );
    }
  }

  /**
   * Cleanup and dispose of audio resources
   */
  dispose() {
    try {
      if (this.sampler) {
        this.sampler.dispose();
      }
      if (this.synth) {
        this.synth.dispose();
      }
      if (this.reverb) {
        this.reverb.dispose();
      }
      if (this.compressor) {
        this.compressor.dispose();
      }
      if (this.masterVolume) {
        this.masterVolume.dispose();
      }

      this.activeNotes.clear();
      this.sustainedNotes.clear();
      this.isInitialized = false;
      this.isAudioContextStarted = false;
      this.samplerReady = false;
      this.synthReady = false;

      console.log("🗑️ Piano Audio Engine disposed");
    } catch (error) {
      console.error("❌ Error disposing audio engine:", error);
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PianoAudioEngine;
} else if (typeof window !== "undefined") {
  window.PianoAudioEngine = PianoAudioEngine;
}

console.log("🎵 Piano Audio Engine module loaded with sampler support");

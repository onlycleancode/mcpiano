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
   * Play a piano note with velocity sensitivity
   * @param {string|number} note - Note name (e.g., 'C4') or MIDI number
   * @param {number} velocity - Velocity from 0.0 to 1.0 (default: 0.7)
   * @param {number} duration - Note duration in seconds (optional, for automatic release)
   */
  playNote(note, velocity = 0.7, duration = null) {
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

      // Ensure velocity is within valid range
      velocity = Math.max(0, Math.min(1, velocity));

      // Convert MIDI number to note name if needed
      const noteName =
        typeof note === "number" ? this.midiToNoteName(note) : note;

      // Apply velocity curve for more realistic dynamics
      const adjustedVelocity = this.applyVelocityCurve(velocity);

      // Calculate volume based on velocity (-40dB to 0dB range)
      const velocityDb = -40 + adjustedVelocity * 40;

      // Play the note
      if (duration) {
        // Play note with specific duration
        audioSource.triggerAttackRelease(
          noteName,
          duration,
          undefined,
          adjustedVelocity
        );
      } else {
        // Start note (will need manual release)
        audioSource.triggerAttack(noteName, undefined, adjustedVelocity);
        this.activeNotes.set(noteName, {
          velocity: adjustedVelocity,
          startTime: Tone.now(),
          source: this.getAudioSourceType(),
        });
      }

      console.log(
        `🎵 Playing note: ${noteName} (velocity: ${velocity.toFixed(
          2
        )}, dB: ${velocityDb.toFixed(1)}, source: ${this.getAudioSourceType()})`
      );
      return true;
    } catch (error) {
      console.error("❌ Error playing note:", error);
      this.handleAudioError(error);
      return false;
    }
  }

  /**
   * Release a piano note
   * @param {string|number} note - Note name or MIDI number to release
   */
  releaseNote(note) {
    try {
      if (!this.isInitialized || !this.isAudioContextStarted) {
        return false;
      }

      const audioSource = this.getActiveAudioSource();
      if (!audioSource) {
        return false;
      }

      const noteName =
        typeof note === "number" ? this.midiToNoteName(note) : note;

      // Check if sustain pedal is active
      if (this.sustainPedal) {
        // Add to sustained notes instead of releasing
        this.sustainedNotes.add(noteName);
        console.log(`🎵 Note ${noteName} sustained by pedal`);
        return true;
      }

      // Release the note
      audioSource.triggerRelease(noteName);
      this.activeNotes.delete(noteName);

      console.log(`🎵 Released note: ${noteName}`);
      return true;
    } catch (error) {
      console.error("❌ Error releasing note:", error);
      this.handleAudioError(error);
      return false;
    }
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
   * Stop all currently playing notes
   */
  stopAllNotes() {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Stop notes on all available sources
      if (this.samplerReady && this.sampler) {
        this.sampler.releaseAll();
      }
      if (this.synthReady && this.synth) {
        this.synth.releaseAll();
      }

      this.activeNotes.clear();
      this.sustainedNotes.clear();

      console.log("🔇 All notes stopped");
      return true;
    } catch (error) {
      console.error("❌ Error stopping all notes:", error);
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

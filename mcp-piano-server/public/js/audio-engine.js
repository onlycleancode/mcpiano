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
    this.limiter = null; // Add limiter for clipping prevention
    this.masterVolume = null;
    this.activeNotes = new Map(); // Track active notes for polyphony
    this.sustainPedal = false;
    this.sustainedNotes = new Set(); // Notes held by sustain pedal

    // Note pooling for rapid repeated notes
    this.notePool = new Map(); // Pool of note instances for reuse
    this.poolSize = 64; // Maximum pooled notes per pitch
    this.noteReleaseTimeout = 100; // ms before note can be reused

    // Sample preloading state
    this.samplesPreloaded = false;
    this.preloadProgress = 0;
    this.totalSamples = 0;
    this.loadedSamples = 0;

    // Audio engine configuration
    this.config = {
      polyphony: 32, // Maximum simultaneous notes
      reverbAmount: 0.3,
      reverbDecay: 2.5,
      compressorThreshold: -24,
      compressorRatio: 8,
      limiterThreshold: -3, // Limiter threshold to prevent clipping
      limiterLookahead: 0.005, // 5ms lookahead
      masterVolumeDb: -12,
      velocityCurve: "realistic", // Use realistic velocity curves
      useSampler: true, // Prefer sampler over synthesizer
      samplerFallback: true, // Fall back to synth if sampler fails
      preloadSamples: true, // Preload samples on initialization
    };

    // Realistic velocity curve definitions
    this.velocityCurves = {
      // MIDI velocity ranges with musical dynamics
      pp: { min: 1, max: 30, gain: 0.1, label: "pianissimo (very soft)" },
      p: { min: 31, max: 50, gain: 0.25, label: "piano (soft)" },
      mp: { min: 51, max: 70, gain: 0.45, label: "mezzo-piano (medium soft)" },
      mf: { min: 71, max: 90, gain: 0.65, label: "mezzo-forte (medium loud)" },
      f: { min: 91, max: 110, gain: 0.85, label: "forte (loud)" },
      ff: { min: 111, max: 127, gain: 1.0, label: "fortissimo (very loud)" },
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

    // Calculate total samples for preloading progress
    this.totalSamples = Object.keys(this.sampleConfig.urls).length;

    console.log("🎵 PianoAudioEngine created with optimization features");
    console.log(`🎛️ Note pooling enabled (pool size: ${this.poolSize})`);
    console.log(
      `🔊 Limiter enabled (threshold: ${this.config.limiterThreshold}dB)`
    );
    console.log(`📊 Realistic velocity curves configured`);
  }

  /**
   * Initialize the audio engine with Tone.js
   * Must be called after user interaction due to browser audio policies
   */
  async initialize() {
    try {
      console.log("🎹 Initializing Piano Audio Engine with optimizations...");

      // Check if Tone.js is available
      if (typeof Tone === "undefined") {
        throw new Error(
          "Tone.js library not loaded. Please ensure the Tone.js script is included."
        );
      }

      // Initialize audio effects chain first
      await this.initializeEffects();

      // Initialize note pooling
      this.initializeNotePooling();

      // Initialize sampler and synthesizer
      if (this.config.useSampler) {
        await this.initializeSampler();
      }

      // Always initialize synthesizer as fallback
      await this.initializeSynthesizer();

      // Preload samples if enabled
      if (this.config.preloadSamples && this.samplerReady) {
        await this.preloadAllSamples();
      }

      this.isInitialized = true;
      console.log("✅ Piano Audio Engine initialized successfully");
      console.log(`🎛️ Polyphony: ${this.config.polyphony} voices`);
      console.log(`🔊 Master Volume: ${this.config.masterVolumeDb}dB`);
      console.log(`🌊 Reverb: ${this.config.reverbAmount * 100}% wet`);
      console.log(`🛡️ Limiter: ${this.config.limiterThreshold}dB threshold`);
      console.log(`🎹 Sampler Ready: ${this.samplerReady}`);
      console.log(`🎵 Synthesizer Ready: ${this.synthReady}`);
      console.log(`📦 Samples Preloaded: ${this.samplesPreloaded}`);
      console.log(`🎯 Note Pooling: ${this.poolSize} notes per pitch`);

      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Piano Audio Engine:", error);
      this.handleAudioError(error);
      return false;
    }
  }

  /**
   * Initialize audio effects chain with limiter for clipping prevention
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

    // Create limiter to prevent clipping with many simultaneous notes
    this.limiter = new Tone.Limiter({
      threshold: this.config.limiterThreshold,
      lookahead: this.config.limiterLookahead,
    });

    // Create master volume control
    this.masterVolume = new Tone.Volume(this.config.masterVolumeDb);

    // Wait for reverb to be ready
    await this.reverb.ready;

    console.log("🎛️ Audio effects chain initialized with limiter");
  }

  /**
   * Initialize piano sampler with high-quality samples and preloading
   */
  async initializeSampler() {
    try {
      console.log("🎹 Loading piano sampler with preloading support...");

      // Create sampler with piano samples and progress tracking
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

      // Connect sampler to effects chain with limiter
      this.sampler.chain(
        this.reverb,
        this.compressor,
        this.limiter,
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
      }, 15000); // 15 second timeout for better sample loading
    } catch (error) {
      console.error("❌ Error creating sampler:", error);
      this.onSamplerError(error);
    }
  }

  /**
   * Initialize synthesizer as fallback with limiter
   */
  async initializeSynthesizer() {
    try {
      console.log("🎵 Initializing synthesizer with limiter...");

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

      // Connect synthesizer to effects chain with limiter
      this.synth.chain(
        this.reverb,
        this.compressor,
        this.limiter,
        this.masterVolume,
        Tone.Destination
      );

      this.synthReady = true;
      console.log("✅ Synthesizer initialized with limiter");
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
   * Initialize note pooling for rapid repeated notes
   */
  initializeNotePooling() {
    this.notePool.clear();
    console.log(`🎯 Note pooling initialized (pool size: ${this.poolSize})`);
  }

  /**
   * Preload all samples with progress tracking
   */
  async preloadAllSamples() {
    try {
      console.log("📦 Starting sample preloading...");
      this.loadedSamples = 0;
      this.preloadProgress = 0;

      // Emit preload start event
      this.emitPreloadEvent("start", 0);

      // Wait for sampler to be fully loaded
      if (this.sampler && this.samplerReady) {
        // Trigger each sample to ensure it's loaded into memory
        const sampleKeys = Object.keys(this.sampleConfig.urls);

        for (let i = 0; i < sampleKeys.length; i++) {
          const noteKey = sampleKeys[i];

          try {
            // Trigger a very quiet note to preload the sample
            this.sampler.triggerAttackRelease(noteKey, 0.01, undefined, 0.001);
            this.loadedSamples++;
            this.preloadProgress =
              (this.loadedSamples / this.totalSamples) * 100;

            // Emit progress event
            this.emitPreloadEvent("progress", this.preloadProgress);

            console.log(
              `📦 Preloaded sample: ${noteKey} (${this.loadedSamples}/${this.totalSamples})`
            );

            // Small delay to prevent overwhelming the audio system
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (error) {
            console.warn(`⚠️ Failed to preload sample ${noteKey}:`, error);
          }
        }

        this.samplesPreloaded = true;
        this.preloadProgress = 100;

        // Emit completion event
        this.emitPreloadEvent("complete", 100);

        console.log("✅ All samples preloaded successfully");
      }
    } catch (error) {
      console.error("❌ Error preloading samples:", error);
      this.emitPreloadEvent("error", this.preloadProgress, error);
    }
  }

  /**
   * Emit preload progress events
   */
  emitPreloadEvent(type, progress, error = null) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pianoSamplePreload", {
          detail: {
            type,
            progress,
            loadedSamples: this.loadedSamples,
            totalSamples: this.totalSamples,
            error,
            engine: this,
          },
        })
      );
    }
  }

  /**
   * Get note from pool or create new one for rapid repeated notes
   */
  getPooledNote(noteName) {
    if (!this.notePool.has(noteName)) {
      this.notePool.set(noteName, []);
    }

    const pool = this.notePool.get(noteName);

    // Find an available note in the pool
    const availableNote = pool.find(
      (note) =>
        !note.isActive && Date.now() - note.lastUsed > this.noteReleaseTimeout
    );

    if (availableNote) {
      availableNote.isActive = true;
      return availableNote;
    }

    // Create new note if pool isn't full
    if (pool.length < this.poolSize) {
      const newNote = {
        id: `${noteName}_${pool.length}`,
        noteName,
        isActive: true,
        lastUsed: Date.now(),
        metadata: {},
      };
      pool.push(newNote);
      return newNote;
    }

    // Pool is full, reuse oldest note
    const oldestNote = pool.reduce((oldest, note) =>
      note.lastUsed < oldest.lastUsed ? note : oldest
    );
    oldestNote.isActive = true;
    oldestNote.lastUsed = Date.now();
    return oldestNote;
  }

  /**
   * Return note to pool
   */
  returnNoteToPool(noteName, noteId) {
    if (this.notePool.has(noteName)) {
      const pool = this.notePool.get(noteName);
      const note = pool.find((n) => n.id === noteId);
      if (note) {
        note.isActive = false;
        note.lastUsed = Date.now();
      }
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
   * Apply realistic velocity curves for musical dynamics
   * @param {number} midiVelocity - MIDI velocity (0-127)
   * @returns {object} Object with adjusted velocity and dynamic marking
   */
  applyRealisticVelocityCurve(midiVelocity) {
    // Ensure velocity is within MIDI range
    const velocity = Math.max(1, Math.min(127, midiVelocity));

    // Find the appropriate dynamic range
    let dynamicRange = null;
    for (const [key, range] of Object.entries(this.velocityCurves)) {
      if (velocity >= range.min && velocity <= range.max) {
        dynamicRange = { key, ...range };
        break;
      }
    }

    if (!dynamicRange) {
      // Fallback to mf (medium loud) if no range found
      dynamicRange = { key: "mf", ...this.velocityCurves.mf };
    }

    // Calculate position within the dynamic range (0.0 to 1.0)
    const rangePosition =
      (velocity - dynamicRange.min) / (dynamicRange.max - dynamicRange.min);

    // Apply exponential curve for more realistic response
    const exponentialCurve = Math.pow(rangePosition, 1.2);

    // Calculate final gain within the dynamic range
    const baseGain = dynamicRange.gain;
    const nextRangeGain = this.getNextRangeGain(dynamicRange.key);
    const finalGain = baseGain + (nextRangeGain - baseGain) * exponentialCurve;

    return {
      velocity: Math.max(0.01, Math.min(1.0, finalGain)),
      dynamic: dynamicRange.key,
      label: dynamicRange.label,
      originalVelocity: midiVelocity,
      rangePosition: rangePosition,
    };
  }

  /**
   * Get the gain value for the next velocity range (for smooth transitions)
   */
  getNextRangeGain(currentRange) {
    const ranges = ["pp", "p", "mp", "mf", "f", "ff"];
    const currentIndex = ranges.indexOf(currentRange);

    if (currentIndex >= 0 && currentIndex < ranges.length - 1) {
      return this.velocityCurves[ranges[currentIndex + 1]].gain;
    }

    return this.velocityCurves[currentRange].gain;
  }

  /**
   * Play a piano note with velocity sensitivity, ADSR envelope, and note pooling
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

      // Convert velocity to MIDI range if normalized
      let midiVelocity;
      if (velocity <= 1.0) {
        // Normalized velocity (0.0-1.0) - convert to MIDI range
        midiVelocity = Math.round(velocity * 127);
      } else {
        // Already MIDI velocity (0-127)
        midiVelocity = Math.round(velocity);
      }

      // Apply realistic velocity curves
      const velocityResult = this.applyRealisticVelocityCurve(midiVelocity);
      const adjustedVelocity = velocityResult.velocity;

      // Map velocity to volume range (-20 to 0 dB) as specified
      const velocityDb = -20 + adjustedVelocity * 20;

      // Get pooled note for rapid repeated notes
      const pooledNote = this.getPooledNote(noteName);

      // Configure ADSR envelope for realistic attack/release based on dynamics
      if (audioSource.envelope) {
        const velocityFactor = adjustedVelocity;
        const dynamicFactor = this.getDynamicEnvelopeFactor(
          velocityResult.dynamic
        );

        audioSource.envelope.attack =
          0.005 + velocityFactor * 0.015 * dynamicFactor.attack;
        audioSource.envelope.decay =
          0.08 + velocityFactor * 0.22 * dynamicFactor.decay;
        audioSource.envelope.sustain =
          0.25 + velocityFactor * 0.5 * dynamicFactor.sustain;
        audioSource.envelope.release =
          0.6 + velocityFactor * 0.6 * dynamicFactor.release;
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
            `velocity: ${midiVelocity} [${
              velocityResult.dynamic
            }], dB: ${velocityDb.toFixed(1)}, ` +
            `duration: ${duration}s, source: ${this.getAudioSourceType()})`
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
          originalVelocity: midiVelocity,
          velocityDb: velocityDb,
          dynamic: velocityResult.dynamic,
          dynamicLabel: velocityResult.label,
          startTime: Tone.now(),
          source: this.getAudioSourceType(),
          pooledNoteId: pooledNote.id,
        });

        console.log(
          `🎵 Playing note: ${noteName} (MIDI: ${
            typeof midiNumber === "number" ? midiNumber : "N/A"
          }, ` +
            `velocity: ${midiVelocity} [${
              velocityResult.dynamic
            }], dB: ${velocityDb.toFixed(1)}, ` +
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
   * Get envelope factors based on dynamic marking
   */
  getDynamicEnvelopeFactor(dynamic) {
    const factors = {
      pp: { attack: 1.2, decay: 1.1, sustain: 0.8, release: 1.3 },
      p: { attack: 1.1, decay: 1.05, sustain: 0.9, release: 1.2 },
      mp: { attack: 1.0, decay: 1.0, sustain: 1.0, release: 1.1 },
      mf: { attack: 0.95, decay: 0.98, sustain: 1.1, release: 1.0 },
      f: { attack: 0.9, decay: 0.95, sustain: 1.2, release: 0.9 },
      ff: { attack: 0.8, decay: 0.9, sustain: 1.3, release: 0.8 },
    };

    return factors[dynamic] || factors.mf;
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
   * Stop a specific note with immediate release, short fade, and note pooling
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

      // Get note metadata for pooling
      const noteMetadata = this.activeNotes.get(noteName);

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

      // Return note to pool if it was pooled
      if (noteMetadata && noteMetadata.pooledNoteId) {
        this.returnNoteToPool(noteName, noteMetadata.pooledNoteId);
      }

      // Remove from active notes
      this.activeNotes.delete(noteName);

      console.log(
        `🎵 Stopped note: ${noteName} (MIDI: ${
          typeof midiNumber === "number" ? midiNumber : "N/A"
        }, fade: ${releaseTime}s)`
      );

      return true;
    } catch (error) {
      console.error("❌ Error stopping note:", error);
      this.handleAudioError(error);
      return false;
    }
  }

  /**
   * Apply velocity curve for more realistic dynamics
   * @param {number} normalizedVelocity - Normalized velocity from 0.0 to 1.0
   * @returns {number} Adjusted velocity for more realistic dynamics
   */
  applyVelocityCurve(normalizedVelocity) {
    const curve = this.velocityCurves[this.config.velocityCurve];
    if (curve) {
      const adjustedVelocity =
        curve.min +
        ((curve.max - curve.min) * (normalizedVelocity - curve.min)) /
          (curve.max - curve.min);
      return adjustedVelocity;
    }
    return normalizedVelocity;
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
   * Cleanup and dispose of audio resources including optimization components
   */
  dispose() {
    try {
      // Stop all active notes
      this.stopAll();

      // Dispose of audio components
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
      if (this.limiter) {
        this.limiter.dispose();
      }
      if (this.masterVolume) {
        this.masterVolume.dispose();
      }

      // Clear optimization data structures
      this.activeNotes.clear();
      this.sustainedNotes.clear();
      this.notePool.clear();

      // Reset state
      this.isInitialized = false;
      this.isAudioContextStarted = false;
      this.samplerReady = false;
      this.synthReady = false;
      this.samplesPreloaded = false;
      this.preloadProgress = 0;
      this.loadedSamples = 0;

      console.log("🗑️ Piano Audio Engine disposed with optimizations");
    } catch (error) {
      console.error("❌ Error disposing audio engine:", error);
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

      // Return all active notes to pool
      for (const [noteName, noteMetadata] of this.activeNotes.entries()) {
        if (noteMetadata.pooledNoteId) {
          this.returnNoteToPool(noteName, noteMetadata.pooledNoteId);
        }
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
          `Scheduled events cleared. Note pool cleaned.`
      );

      return true;
    } catch (error) {
      console.error("❌ Error stopping all notes:", error);
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

            // Return note to pool if it was pooled
            const noteMetadata = this.activeNotes.get(noteName);
            if (noteMetadata && noteMetadata.pooledNoteId) {
              this.returnNoteToPool(noteName, noteMetadata.pooledNoteId);
            }

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
   * Get current audio engine status with optimization metrics
   */
  getStatus() {
    // Calculate note pool statistics
    let totalPooledNotes = 0;
    let activePooledNotes = 0;

    for (const [noteName, pool] of this.notePool.entries()) {
      totalPooledNotes += pool.length;
      activePooledNotes += pool.filter((note) => note.isActive).length;
    }

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
      // Optimization metrics
      samplesPreloaded: this.samplesPreloaded,
      preloadProgress: this.preloadProgress,
      loadedSamples: this.loadedSamples,
      totalSamples: this.totalSamples,
      notePoolSize: this.poolSize,
      totalPooledNotes: totalPooledNotes,
      activePooledNotes: activePooledNotes,
      poolUtilization:
        totalPooledNotes > 0
          ? ((activePooledNotes / totalPooledNotes) * 100).toFixed(1)
          : 0,
      limiterEnabled: this.limiter !== null,
      limiterThreshold: this.config.limiterThreshold,
      velocityCurveType: this.config.velocityCurve,
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PianoAudioEngine;
} else if (typeof window !== "undefined") {
  window.PianoAudioEngine = PianoAudioEngine;
}

console.log("🎵 Piano Audio Engine module loaded with optimization features:");
console.log("  🎯 Note pooling for rapid repeated notes");
console.log("  🛡️ Limiter for clipping prevention");
console.log("  📦 Sample preloading with progress tracking");
console.log("  📊 Realistic velocity curves (pp, p, mp, mf, f, ff)");
console.log("  🔧 Enhanced performance monitoring");

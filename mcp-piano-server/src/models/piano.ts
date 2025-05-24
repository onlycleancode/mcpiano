/**
 * Piano Model - Represents a complete 88-key piano with key management and lookup capabilities
 *
 * This class provides:
 * - All 88 keys generated on instantiation
 * - Key lookup by note name or MIDI number
 * - Visual position calculations for UI rendering
 * - Immutable data structures for thread safety
 * - Comprehensive error handling with detailed messages
 *
 * @example
 * ```typescript
 * const piano = new Piano();
 * const middleC = piano.getKey("C4"); // Get Middle C
 * const allKeys = piano.getAllKeys(); // Get all 88 keys
 * const range = piano.getKeyRange(); // Get A0 to C8 range
 * ```
 */

import { PianoKey } from "../types/piano.js";
import {
  midiToFrequency,
  noteNameToMidi,
  isBlackKey,
  getOctave,
  midiToNoteName,
} from "../utils/note-utils.js";
import { PIANO_MIDI_RANGE } from "../models/piano-constants.js";

export class Piano {
  private readonly _keys: readonly PianoKey[];
  private readonly _keyMap: ReadonlyMap<number, PianoKey>;
  private readonly _noteNameMap: ReadonlyMap<string, PianoKey>;

  /**
   * Initialize Piano with all 88 keys (A0 to C8)
   * Generates immutable data structures for optimal performance
   */
  constructor() {
    const keys: PianoKey[] = [];
    const keyMap = new Map<number, PianoKey>();
    const noteNameMap = new Map<string, PianoKey>();

    // Generate all 88 keys from A0 (MIDI 21) to C8 (MIDI 108)
    for (
      let midiNumber = PIANO_MIDI_RANGE.MIN;
      midiNumber <= PIANO_MIDI_RANGE.MAX;
      midiNumber++
    ) {
      const key = this.createPianoKey(midiNumber);
      keys.push(key);
      keyMap.set(midiNumber, key);

      // Add both sharp and flat notation to note name map for lookup
      noteNameMap.set(key.noteName, key);

      // Add enharmonic equivalent if it's a black key
      if (key.color === "black") {
        const flatNoteName = midiToNoteName(midiNumber, true);
        noteNameMap.set(flatNoteName, key);
      }
    }

    // Create immutable references
    this._keys = Object.freeze(keys);
    this._keyMap = keyMap;
    this._noteNameMap = noteNameMap;
  }

  /**
   * Create a single piano key with all required properties
   * Pure function - no side effects
   *
   * @param midiNumber - MIDI note number (21-108 for piano range)
   * @returns Complete PianoKey object with calculated properties
   */
  private createPianoKey(midiNumber: number): PianoKey {
    const noteName = midiToNoteName(midiNumber, false); // Use sharp notation by default
    const frequency = midiToFrequency(midiNumber);
    const color = isBlackKey(midiNumber) ? "black" : "white";
    const octave = getOctave(midiNumber);
    const position = this.calculateVisualPosition(midiNumber);

    return Object.freeze({
      noteNumber: midiNumber,
      noteName,
      frequency,
      color,
      octave,
      position,
    });
  }

  /**
   * Calculate visual position for piano keys
   * White keys are adjacent (0, 1, 2...), black keys are offset between white keys
   *
   * @param midiNumber - MIDI note number
   * @returns Visual position index for UI rendering
   */
  private calculateVisualPosition(midiNumber: number): number {
    // Calculate position based on actual visual layout
    // White keys get sequential positions, black keys get fractional positions between whites

    const noteIndex = midiNumber % 12;
    const octaveOffset = Math.floor((midiNumber - PIANO_MIDI_RANGE.MIN) / 12);

    // White key positions within an octave (7 white keys per octave)
    const whiteKeyPositions: Record<number, number> = {
      9: 0, // A
      11: 1, // B
      0: 2, // C
      2: 3, // D
      4: 4, // E
      5: 5, // F
      7: 6, // G
    };

    // Black key positions within an octave (offset between white keys)
    const blackKeyPositions: Record<number, number> = {
      10: 0.5, // A#/Bb (between A and B)
      1: 2.5, // C#/Db (between C and D)
      3: 3.5, // D#/Eb (between D and E)
      6: 5.5, // F#/Gb (between F and G)
      8: 6.5, // G#/Ab (between G and A)
    };

    const basePosition = octaveOffset * 7; // 7 white keys per octave

    if (whiteKeyPositions[noteIndex] !== undefined) {
      return basePosition + whiteKeyPositions[noteIndex];
    } else if (blackKeyPositions[noteIndex] !== undefined) {
      return basePosition + blackKeyPositions[noteIndex];
    }

    // Fallback - should never happen
    return midiNumber - PIANO_MIDI_RANGE.MIN;
  }

  /**
   * Get a piano key by note input (string or MIDI number)
   * Supports multiple input formats:
   * - Scientific notation: "C4", "F#3", "Bb5"
   * - MIDI numbers: 60 (Middle C), 69 (A4)
   * - Handles enharmonic equivalents: C# = Db
   *
   * @param noteInput - Note name in scientific notation or MIDI number
   * @returns PianoKey object or null if not found/invalid
   *
   * @example
   * ```typescript
   * piano.getKey("C4"); // Returns Middle C
   * piano.getKey(60);   // Returns Middle C (same as above)
   * piano.getKey("C#4"); // Returns C sharp 4
   * piano.getKey("Db4"); // Returns same key as C#4 (enharmonic)
   * ```
   */
  public getKey(noteInput: string | number): PianoKey | null {
    try {
      if (typeof noteInput === "number") {
        // Handle MIDI number input
        if (!Number.isInteger(noteInput)) {
          return null;
        }
        return this._keyMap.get(noteInput) || null;
      } else if (typeof noteInput === "string") {
        // Handle note name input
        const trimmed = noteInput.trim();
        if (trimmed === "") {
          return null;
        }

        // Try direct lookup first
        const directMatch = this._noteNameMap.get(trimmed);
        if (directMatch) {
          return directMatch;
        }

        // Try parsing as scientific notation and converting to MIDI
        try {
          const midiNumber = noteNameToMidi(trimmed);
          return this._keyMap.get(midiNumber) || null;
        } catch {
          // If parsing fails, return null
          return null;
        }
      }

      return null;
    } catch (error) {
      // Return null for any unexpected errors to maintain API contract
      return null;
    }
  }

  /**
   * Get all 88 piano keys
   * Returns immutable array for thread safety
   *
   * @returns Array of all piano keys from A0 to C8
   */
  public getAllKeys(): readonly PianoKey[] {
    return this._keys;
  }

  /**
   * Get the range of the piano (lowest and highest keys)
   *
   * @returns Object with min (A0) and max (C8) piano keys
   */
  public getKeyRange(): { min: PianoKey; max: PianoKey } {
    const minKey = this._keys[0]; // A0 (MIDI 21)
    const maxKey = this._keys[this._keys.length - 1]; // C8 (MIDI 108)

    if (!minKey || !maxKey) {
      throw new Error("Piano keys not properly initialized");
    }

    return {
      min: minKey,
      max: maxKey,
    };
  }

  /**
   * Get all white keys (natural notes)
   *
   * @returns Array of white piano keys
   */
  public getWhiteKeys(): PianoKey[] {
    return this._keys.filter((key) => key.color === "white");
  }

  /**
   * Get all black keys (accidental notes)
   *
   * @returns Array of black piano keys
   */
  public getBlackKeys(): PianoKey[] {
    return this._keys.filter((key) => key.color === "black");
  }

  /**
   * Get keys within a specific octave
   *
   * @param octave - Octave number (0-8 for piano range)
   * @returns Array of keys in the specified octave
   */
  public getKeysInOctave(octave: number): PianoKey[] {
    if (octave < 0 || octave > 8) {
      throw new Error(`Invalid octave: ${octave}. Must be between 0-8.`);
    }

    return this._keys.filter((key) => key.octave === octave);
  }

  /**
   * Get piano statistics
   *
   * @returns Object with piano key counts and statistics
   */
  public getStatistics(): {
    totalKeys: number;
    whiteKeys: number;
    blackKeys: number;
    octaves: number;
    frequencyRange: { min: number; max: number };
  } {
    const whiteKeys = this.getWhiteKeys();
    const blackKeys = this.getBlackKeys();
    const range = this.getKeyRange();

    return {
      totalKeys: this._keys.length,
      whiteKeys: whiteKeys.length,
      blackKeys: blackKeys.length,
      octaves: 9, // 0-8 octaves covered
      frequencyRange: {
        min: range.min.frequency,
        max: range.max.frequency,
      },
    };
  }

  /**
   * Check if a note input is valid for this piano
   *
   * @param noteInput - Note name or MIDI number to validate
   * @returns true if the note exists on this piano
   */
  public isValidNote(noteInput: string | number): boolean {
    return this.getKey(noteInput) !== null;
  }
}

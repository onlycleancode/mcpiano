/**
 * Pure utility functions for note manipulation and MIDI conversions
 */

import {
  A4_FREQUENCY,
  A4_MIDI_NUMBER,
  SHARP_NOTE_NAMES,
  FLAT_NOTE_NAMES,
  BLACK_KEY_INDICES,
  MIDI_CONSTANTS,
  PIANO_MIDI_RANGE,
  NOTE_NAME_PATTERNS,
  ENHARMONIC_EQUIVALENTS,
} from "../models/piano-constants.js";

/**
 * Convert MIDI note number to frequency in Hz
 * Uses the standard equal temperament formula: f = 440 * 2^((midiNumber - 69) / 12)
 *
 * @param midiNumber - MIDI note number (0-127)
 * @returns Frequency in Hz
 */
export function midiToFrequency(midiNumber: number): number {
  if (!Number.isInteger(midiNumber) || midiNumber < 0 || midiNumber > 127) {
    throw new Error(
      `Invalid MIDI number: ${midiNumber}. Must be integer between 0-127.`
    );
  }

  const frequency =
    A4_FREQUENCY * Math.pow(2, (midiNumber - A4_MIDI_NUMBER) / 12);
  return Math.round(frequency * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert note name to MIDI number
 * Parses scientific notation like "C4", "C#4", "Db4"
 * C4 = MIDI 60 (Middle C)
 *
 * @param noteName - Note in scientific notation (e.g., "C4", "F#3", "Bb5")
 * @returns MIDI note number or throws error if invalid
 */
export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(NOTE_NAME_PATTERNS.SCIENTIFIC_NOTATION);
  if (!match) {
    throw new Error(
      `Invalid note name format: ${noteName}. Expected format like "C4", "F#3", "Bb5".`
    );
  }

  const [, noteNamePart, octaveStr] = match;
  if (!noteNamePart || !octaveStr) {
    throw new Error(`Failed to parse note name: ${noteName}`);
  }

  const octave = parseInt(octaveStr, 10);

  // Find the chromatic index (0-11) for the note
  let chromaticIndex = SHARP_NOTE_NAMES.indexOf(noteNamePart as any);

  // If not found in sharp notation, try flat notation
  if (chromaticIndex === -1) {
    chromaticIndex = FLAT_NOTE_NAMES.indexOf(noteNamePart as any);
  }

  // If still not found, check enharmonic equivalents
  if (chromaticIndex === -1) {
    const enharmonic = ENHARMONIC_EQUIVALENTS[noteNamePart];
    if (enharmonic) {
      chromaticIndex = SHARP_NOTE_NAMES.indexOf(enharmonic as any);
      if (chromaticIndex === -1) {
        chromaticIndex = FLAT_NOTE_NAMES.indexOf(enharmonic as any);
      }
    }
  }

  if (chromaticIndex === -1) {
    throw new Error(`Unknown note name: ${noteNamePart}`);
  }

  // Calculate MIDI number: (octave + 1) * 12 + chromaticIndex
  // The +1 is because MIDI octave 0 starts at C-1 in scientific notation
  const midiNumber =
    (octave + 1) * MIDI_CONSTANTS.SEMITONES_PER_OCTAVE + chromaticIndex;

  if (
    midiNumber < MIDI_CONSTANTS.MIN_MIDI ||
    midiNumber > MIDI_CONSTANTS.MAX_MIDI
  ) {
    throw new Error(
      `Note ${noteName} results in MIDI number ${midiNumber} which is out of range (0-127).`
    );
  }

  return midiNumber;
}

/**
 * Determine if a MIDI number represents a black key on the piano
 *
 * @param midiNumber - MIDI note number (0-127)
 * @returns true if black key, false if white key
 */
export function isBlackKey(midiNumber: number): boolean {
  if (!Number.isInteger(midiNumber) || midiNumber < 0 || midiNumber > 127) {
    throw new Error(
      `Invalid MIDI number: ${midiNumber}. Must be integer between 0-127.`
    );
  }

  const chromaticIndex = midiNumber % MIDI_CONSTANTS.SEMITONES_PER_OCTAVE;
  return BLACK_KEY_INDICES.includes(chromaticIndex as any);
}

/**
 * Get the octave number for a given MIDI note number
 * Returns the octave in scientific notation (C4 = octave 4)
 *
 * @param midiNumber - MIDI note number (0-127)
 * @returns Octave number
 */
export function getOctave(midiNumber: number): number {
  if (!Number.isInteger(midiNumber) || midiNumber < 0 || midiNumber > 127) {
    throw new Error(
      `Invalid MIDI number: ${midiNumber}. Must be integer between 0-127.`
    );
  }

  // MIDI octave calculation: octave = floor(midiNumber / 12) - 1
  // The -1 is because MIDI note 60 (C4) is in octave 4, not 5
  return Math.floor(midiNumber / MIDI_CONSTANTS.SEMITONES_PER_OCTAVE) - 1;
}

/**
 * Validate note input and return standardized information
 * Accepts both string note names and MIDI numbers
 *
 * @param input - Note name (string) or MIDI number
 * @returns Validation result with error details if invalid
 */
export function validateNoteInput(input: string | number): {
  valid: boolean;
  midiNumber?: number;
  error?: string;
  noteName?: string;
  octave?: number;
  isBlackKey?: boolean;
  frequency?: number;
} {
  try {
    let midiNumber: number;

    if (typeof input === "number") {
      // Input is MIDI number
      if (!Number.isInteger(input) || input < 0 || input > 127) {
        return {
          valid: false,
          error: `Invalid MIDI number: ${input}. Must be integer between 0-127.`,
        };
      }
      midiNumber = input;
    } else if (typeof input === "string") {
      // Input is note name
      try {
        midiNumber = noteNameToMidi(input);
      } catch (error) {
        return {
          valid: false,
          error: `Invalid note name: ${input}. ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    } else {
      return {
        valid: false,
        error: `Invalid input type. Expected string or number, got ${typeof input}.`,
      };
    }

    // Generate additional information for valid input
    const octave = getOctave(midiNumber);
    const chromaticIndex = midiNumber % MIDI_CONSTANTS.SEMITONES_PER_OCTAVE;
    const noteName = `${SHARP_NOTE_NAMES[chromaticIndex]}${octave}`;
    const frequency = midiToFrequency(midiNumber);
    const blackKey = isBlackKey(midiNumber);

    return {
      valid: true,
      midiNumber,
      noteName,
      octave,
      isBlackKey: blackKey,
      frequency,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Convert MIDI number to note name in scientific notation
 *
 * @param midiNumber - MIDI note number (0-127)
 * @param useFlats - Whether to use flat notation for accidentals (default: false, uses sharps)
 * @returns Note name in scientific notation
 */
export function midiToNoteName(
  midiNumber: number,
  useFlats: boolean = false
): string {
  if (!Number.isInteger(midiNumber) || midiNumber < 0 || midiNumber > 127) {
    throw new Error(
      `Invalid MIDI number: ${midiNumber}. Must be integer between 0-127.`
    );
  }

  const octave = getOctave(midiNumber);
  const chromaticIndex = midiNumber % MIDI_CONSTANTS.SEMITONES_PER_OCTAVE;

  const noteName = useFlats
    ? FLAT_NOTE_NAMES[chromaticIndex]
    : SHARP_NOTE_NAMES[chromaticIndex];
  return `${noteName}${octave}`;
}

/**
 * Check if a MIDI number is within the standard 88-key piano range
 *
 * @param midiNumber - MIDI note number to check
 * @returns true if within piano range (21-108), false otherwise
 */
export function isWithinPianoRange(midiNumber: number): boolean {
  return (
    Number.isInteger(midiNumber) &&
    midiNumber >= PIANO_MIDI_RANGE.MIN &&
    midiNumber <= PIANO_MIDI_RANGE.MAX
  );
}

/**
 * Get the nearest MIDI number that is within the piano range
 *
 * @param midiNumber - MIDI note number to clamp
 * @returns Nearest valid piano MIDI number
 */
export function clampToPianoRange(midiNumber: number): number {
  if (midiNumber < PIANO_MIDI_RANGE.MIN) {
    return PIANO_MIDI_RANGE.MIN;
  }
  if (midiNumber > PIANO_MIDI_RANGE.MAX) {
    return PIANO_MIDI_RANGE.MAX;
  }
  return Math.round(midiNumber);
}

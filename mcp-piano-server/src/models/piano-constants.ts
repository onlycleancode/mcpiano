/**
 * Piano constants and mappings for musical computation
 */

// Base frequency constants
export const A0_FREQUENCY = 27.5; // A0 in Hz
export const A4_FREQUENCY = 440.0; // Concert pitch A4 in Hz
export const A4_MIDI_NUMBER = 69; // MIDI number for A4

// All 12 chromatic notes using sharp notation
export const SHARP_NOTE_NAMES = [
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
] as const;

// All 12 chromatic notes using flat notation
export const FLAT_NOTE_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

// Natural note names (white keys)
export const NATURAL_NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"] as const;

// Accidental note names (black keys) - sharp notation
export const SHARP_NOTE_NAMES_ONLY = ["C#", "D#", "F#", "G#", "A#"] as const;

// Accidental note names (black keys) - flat notation
export const FLAT_NOTE_NAMES_ONLY = ["Db", "Eb", "Gb", "Ab", "Bb"] as const;

// Enharmonic equivalents mapping
export const ENHARMONIC_EQUIVALENTS: Record<string, string> = {
  // Sharp to Flat
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",

  // Flat to Sharp
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
} as const;

// MIDI velocity ranges mapped to dynamic markings
export const VELOCITY_DYNAMICS = {
  // Pianissimo (very soft)
  pp: { min: 1, max: 31, name: "pianissimo", symbol: "pp" },

  // Piano (soft)
  p: { min: 32, max: 47, name: "piano", symbol: "p" },

  // Mezzo-piano (moderately soft)
  mp: { min: 48, max: 63, name: "mezzo-piano", symbol: "mp" },

  // Mezzo-forte (moderately loud)
  mf: { min: 64, max: 79, name: "mezzo-forte", symbol: "mf" },

  // Forte (loud)
  f: { min: 80, max: 95, name: "forte", symbol: "f" },

  // Fortissimo (very loud)
  ff: { min: 96, max: 127, name: "fortissimo", symbol: "ff" },
} as const;

// Reverse mapping: velocity to dynamic marking
export const VELOCITY_TO_DYNAMIC: Record<
  string,
  keyof typeof VELOCITY_DYNAMICS
> = {};

// Initialize the reverse mapping
Object.entries(VELOCITY_DYNAMICS).forEach(([dynamic, range]) => {
  for (let velocity = range.min; velocity <= range.max; velocity++) {
    VELOCITY_TO_DYNAMIC[velocity.toString()] =
      dynamic as keyof typeof VELOCITY_DYNAMICS;
  }
});

// Piano key pattern: which notes are black keys (by chromatic index)
export const BLACK_KEY_INDICES = [1, 3, 6, 8, 10] as const; // C#, D#, F#, G#, A#

// Piano key pattern: which notes are white keys (by chromatic index)
export const WHITE_KEY_INDICES = [0, 2, 4, 5, 7, 9, 11] as const; // C, D, E, F, G, A, B

// MIDI constants
export const MIDI_CONSTANTS = {
  MIN_MIDI: 0,
  MAX_MIDI: 127,
  MIDDLE_C: 60,
  CONCERT_A: 69,
  SEMITONES_PER_OCTAVE: 12,
} as const;

// Piano-specific MIDI range (88-key piano)
export const PIANO_MIDI_RANGE = {
  MIN: 21, // A0
  MAX: 108, // C8
  TOTAL_KEYS: 88,
} as const;

// Octave information
export const OCTAVE_INFO = {
  MIN_OCTAVE: 0, // A0, A#0, B0
  MAX_OCTAVE: 8, // C8
  MIDDLE_C_OCTAVE: 4,
} as const;

// Note name validation patterns
export const NOTE_NAME_PATTERNS = {
  // Matches scientific notation like "C4", "F#3", "Bb5"
  SCIENTIFIC_NOTATION: /^([A-G][#b]?)(-?\d+)$/,

  // Matches just the note name without octave like "C", "F#", "Bb"
  NOTE_NAME_ONLY: /^([A-G][#b]?)$/,

  // Matches sharp notes
  SHARP_NOTE: /^[A-G]#$/,

  // Matches flat notes
  FLAT_NOTE: /^[A-G]b$/,
} as const;

/**
 * Get dynamic marking for a given MIDI velocity
 */
export function getDynamicMarking(
  velocity: number
): (typeof VELOCITY_DYNAMICS)[keyof typeof VELOCITY_DYNAMICS] | null {
  const dynamicKey = VELOCITY_TO_DYNAMIC[velocity.toString()];
  return dynamicKey ? VELOCITY_DYNAMICS[dynamicKey] : null;
}

/**
 * Get velocity range for a dynamic marking
 */
export function getVelocityRange(
  dynamic: keyof typeof VELOCITY_DYNAMICS
): { min: number; max: number } | null {
  return VELOCITY_DYNAMICS[dynamic] || null;
}

/**
 * Check if a note name is a sharp note
 */
export function isSharpNote(noteName: string): boolean {
  return NOTE_NAME_PATTERNS.SHARP_NOTE.test(noteName);
}

/**
 * Check if a note name is a flat note
 */
export function isFlatNote(noteName: string): boolean {
  return NOTE_NAME_PATTERNS.FLAT_NOTE.test(noteName);
}

/**
 * Check if a note name is a natural note
 */
export function isNaturalNote(noteName: string): boolean {
  return NATURAL_NOTE_NAMES.includes(noteName as any);
}

/**
 * Get the enharmonic equivalent of a note name
 */
export function getEnharmonicEquivalent(noteName: string): string | null {
  return ENHARMONIC_EQUIVALENTS[noteName] || null;
}

/**
 * Get all possible note names (including enharmonic equivalents) for a chromatic index
 */
export function getNoteNamesForIndex(chromaticIndex: number): string[] {
  if (chromaticIndex < 0 || chromaticIndex >= 12) {
    throw new Error(`Invalid chromatic index: ${chromaticIndex}`);
  }

  const sharpName = SHARP_NOTE_NAMES[chromaticIndex];
  const flatName = FLAT_NOTE_NAMES[chromaticIndex];

  if (sharpName === flatName) {
    // Natural note
    return [sharpName];
  } else {
    // Accidental note - return both sharp and flat
    return [sharpName, flatName];
  }
}

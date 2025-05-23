/**
 * Piano data utilities for generating 88-key piano with proper note mappings,
 * frequencies, and MIDI support
 */

import {
  PianoKey,
  Piano,
  KeyColor,
  PIANO_RANGE,
  CHROMATIC_PATTERN,
} from "../types/piano.js";
import { CHROMATIC_NOTES } from "../config/index.js";

/**
 * Calculate frequency for a given MIDI note number using A4 = 440Hz as reference
 * Formula: f = 440 * 2^((n-69)/12) where n is MIDI note number
 */
export function calculateFrequency(midiNoteNumber: number): number {
  return Math.round(440 * Math.pow(2, (midiNoteNumber - 69) / 12) * 100) / 100;
}

/**
 * Convert MIDI note number to scientific notation (e.g., 60 -> "C4")
 */
export function midiToScientificNotation(midiNoteNumber: number): string {
  const noteIndex = midiNoteNumber % 12;
  const octave = Math.floor(midiNoteNumber / 12) - 1;
  return `${CHROMATIC_NOTES[noteIndex]}${octave}`;
}

/**
 * Get octave number from MIDI note number
 */
export function getOctaveFromMidi(midiNoteNumber: number): number {
  return Math.floor(midiNoteNumber / 12) - 1;
}

/**
 * Determine if a note is white or black based on its position in chromatic scale
 */
export function getKeyColor(midiNoteNumber: number): "white" | "black" {
  const noteIndex = midiNoteNumber % 12;
  const pattern = CHROMATIC_PATTERN[noteIndex];
  if (!pattern) {
    throw new Error(`Invalid note index: ${noteIndex}`);
  }
  return pattern.color;
}

/**
 * Calculate visual position for piano key (0-87 from left to right)
 * This accounts for the layout where black keys are positioned between white keys
 */
export function calculateKeyPosition(midiNoteNumber: number): number {
  // For 88-key piano, positions 0-87 from left to right
  return midiNoteNumber - PIANO_RANGE.MIN_MIDI_NOTE;
}

/**
 * Generate a single piano key object
 */
export function generatePianoKey(midiNoteNumber: number): PianoKey {
  return {
    noteNumber: midiNoteNumber,
    noteName: midiToScientificNotation(midiNoteNumber),
    frequency: calculateFrequency(midiNoteNumber),
    color: getKeyColor(midiNoteNumber),
    octave: getOctaveFromMidi(midiNoteNumber),
    position: calculateKeyPosition(midiNoteNumber),
  };
}

/**
 * Generate complete 88-key piano data structure
 */
export function generatePianoData(): Piano {
  const keys: PianoKey[] = [];

  // Generate all 88 keys from A0 (MIDI 21) to C8 (MIDI 108)
  for (
    let midiNote = PIANO_RANGE.MIN_MIDI_NOTE;
    midiNote <= PIANO_RANGE.MAX_MIDI_NOTE;
    midiNote++
  ) {
    keys.push(generatePianoKey(midiNote));
  }

  // Separate white and black keys for easy access
  const whiteKeys = keys.filter((key) => key.color === KeyColor.WHITE);
  const blackKeys = keys.filter((key) => key.color === KeyColor.BLACK);

  return {
    keys,
    totalKeys: keys.length,
    whiteKeys,
    blackKeys,
  };
}

/**
 * Find piano key by MIDI note number
 */
export function findKeyByMidiNote(
  piano: Piano,
  midiNoteNumber: number
): PianoKey | undefined {
  return piano.keys.find((key) => key.noteNumber === midiNoteNumber);
}

/**
 * Find piano key by scientific notation (e.g., "C4", "F#3")
 */
export function findKeyByNoteName(
  piano: Piano,
  noteName: string
): PianoKey | undefined {
  return piano.keys.find((key) => key.noteName === noteName);
}

/**
 * Get all keys in a specific octave
 */
export function getKeysInOctave(piano: Piano, octave: number): PianoKey[] {
  return piano.keys.filter((key) => key.octave === octave);
}

/**
 * Get keys within a specific MIDI range
 */
export function getKeysInRange(
  piano: Piano,
  startMidi: number,
  endMidi: number
): PianoKey[] {
  return piano.keys.filter(
    (key) => key.noteNumber >= startMidi && key.noteNumber <= endMidi
  );
}

/**
 * Convert scientific notation to MIDI note number
 */
export function scientificNotationToMidi(noteName: string): number | null {
  // Parse note name like "C4", "F#3", "Bb5"
  const match = noteName.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return null;

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr);

  // Convert note name to chromatic index
  let chromaticIndex = CHROMATIC_NOTES.indexOf(note as any);
  if (chromaticIndex === -1) {
    // Try finding enharmonic equivalent
    const enharmonic = getEnharmonicEquivalent(note);
    if (enharmonic) {
      chromaticIndex = CHROMATIC_NOTES.indexOf(enharmonic as any);
    }
  }

  if (chromaticIndex === -1) return null;

  // Calculate MIDI note number: (octave + 1) * 12 + chromaticIndex
  return (octave + 1) * 12 + chromaticIndex;
}

/**
 * Get enharmonic equivalent of a note (e.g., "C#" <-> "Db")
 */
export function getEnharmonicEquivalent(note: string): string | null {
  const enharmonicMap: Record<string, string> = {
    "C#": "Db",
    Db: "C#",
    "D#": "Eb",
    Eb: "D#",
    "F#": "Gb",
    Gb: "F#",
    "G#": "Ab",
    Ab: "G#",
    "A#": "Bb",
    Bb: "A#",
  };

  return enharmonicMap[note] || null;
}

/**
 * Get all notes of a specific name across all octaves on the piano
 */
export function getNotesOfName(piano: Piano, noteName: string): PianoKey[] {
  const baseNote = noteName.replace(/\d+$/, ""); // Remove octave number
  return piano.keys.filter((key) => {
    const keyBaseNote = key.noteName.replace(/\d+$/, "");
    const enharmonic = getEnharmonicEquivalent(baseNote);
    return (
      keyBaseNote === baseNote || (enharmonic && keyBaseNote === enharmonic)
    );
  });
}

/**
 * Piano data singleton - create once and reuse
 */
let pianoDataInstance: Piano | null = null;

/**
 * Get the piano data instance (creates it if it doesn't exist)
 */
export function getPianoData(): Piano {
  if (!pianoDataInstance) {
    pianoDataInstance = generatePianoData();
  }
  return pianoDataInstance;
}

/**
 * Validate that a MIDI note number is within piano range
 */
export function isValidPianoNote(midiNoteNumber: number): boolean {
  return (
    midiNoteNumber >= PIANO_RANGE.MIN_MIDI_NOTE &&
    midiNoteNumber <= PIANO_RANGE.MAX_MIDI_NOTE
  );
}

/**
 * Get the nearest valid piano note for a given MIDI number
 */
export function getNearestPianoNote(midiNoteNumber: number): number {
  if (midiNoteNumber < PIANO_RANGE.MIN_MIDI_NOTE) {
    return PIANO_RANGE.MIN_MIDI_NOTE;
  }
  if (midiNoteNumber > PIANO_RANGE.MAX_MIDI_NOTE) {
    return PIANO_RANGE.MAX_MIDI_NOTE;
  }
  return midiNoteNumber;
}

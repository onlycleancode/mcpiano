/**
 * Piano-specific type definitions for 88-key piano with MIDI support
 */

// Interface for a piano key with all necessary properties
export interface PianoKey {
  noteNumber: number; // MIDI note number (21-108 for 88-key piano)
  noteName: string; // Scientific notation (A0 to C8)
  frequency: number; // Hz - calculated using standard tuning
  color: "white" | "black";
  octave: number;
  position: number; // Visual position for UI (0-87 from left to right)
}

// Note format types for different notation systems
export type ScientificNotation = string; // e.g., "A0", "C4", "C#5", "Bb7"
export type FlatNotation = string; // e.g., "Ab", "Db", "Gb"
export type SharpNotation = string; // e.g., "A#", "C#", "F#"
export type MidiNumber = number; // 0-127, with 88-key piano using 21-108

// Union type for all supported note formats
export type NoteFormat =
  | ScientificNotation
  | FlatNotation
  | SharpNotation
  | MidiNumber;

// Velocity type for MIDI (0-127)
export type Velocity = number; // 0 = silent, 127 = maximum velocity

// Piano key color enumeration for better type safety
export enum KeyColor {
  WHITE = "white",
  BLACK = "black",
}

// Note names without octave information
export type NoteName =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";
export type FlatNoteName =
  | "C"
  | "Db"
  | "D"
  | "Eb"
  | "E"
  | "F"
  | "Gb"
  | "G"
  | "Ab"
  | "A"
  | "Bb"
  | "B";

// Octave range for 88-key piano (A0 to C8)
export type PianoOctave = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Piano range constants
export const PIANO_RANGE = {
  MIN_MIDI_NOTE: 21, // A0
  MAX_MIDI_NOTE: 108, // C8
  TOTAL_KEYS: 88,
  WHITE_KEYS: 52,
  BLACK_KEYS: 36,
} as const;

// Interface for a complete piano representation
export interface Piano {
  keys: PianoKey[];
  totalKeys: number;
  whiteKeys: PianoKey[];
  blackKeys: PianoKey[];
}

// Interface for note playing/triggering
export interface NoteEvent {
  noteNumber: number;
  velocity: Velocity;
  timestamp?: number;
  duration?: number; // in milliseconds
}

// Interface for chord representation
export interface PianoChord {
  name: string;
  notes: PianoKey[];
  rootNote: PianoKey;
  quality: string; // major, minor, diminished, etc.
}

// Interface for scale representation
export interface PianoScale {
  name: string;
  notes: PianoKey[];
  rootNote: PianoKey;
  intervals: number[]; // semitone intervals
}

// Type guards for runtime type checking
export function isValidMidiNote(note: number): note is MidiNumber {
  return Number.isInteger(note) && note >= 0 && note <= 127;
}

export function isValidPianoMidiNote(note: number): boolean {
  return (
    isValidMidiNote(note) &&
    note >= PIANO_RANGE.MIN_MIDI_NOTE &&
    note <= PIANO_RANGE.MAX_MIDI_NOTE
  );
}

export function isValidVelocity(velocity: number): velocity is Velocity {
  return Number.isInteger(velocity) && velocity >= 0 && velocity <= 127;
}

export function isValidOctave(octave: number): octave is PianoOctave {
  return Number.isInteger(octave) && octave >= 0 && octave <= 8;
}

// Helper type for key pattern (used for identifying white vs black keys)
export interface KeyPattern {
  noteIndex: number; // 0-11 (C=0, C#=1, D=2, etc.)
  color: KeyColor;
  isSharp: boolean;
}

// Standard chromatic scale pattern for one octave
export const CHROMATIC_PATTERN: KeyPattern[] = [
  { noteIndex: 0, color: KeyColor.WHITE, isSharp: false }, // C
  { noteIndex: 1, color: KeyColor.BLACK, isSharp: true }, // C#
  { noteIndex: 2, color: KeyColor.WHITE, isSharp: false }, // D
  { noteIndex: 3, color: KeyColor.BLACK, isSharp: true }, // D#
  { noteIndex: 4, color: KeyColor.WHITE, isSharp: false }, // E
  { noteIndex: 5, color: KeyColor.WHITE, isSharp: false }, // F
  { noteIndex: 6, color: KeyColor.BLACK, isSharp: true }, // F#
  { noteIndex: 7, color: KeyColor.WHITE, isSharp: false }, // G
  { noteIndex: 8, color: KeyColor.BLACK, isSharp: true }, // G#
  { noteIndex: 9, color: KeyColor.WHITE, isSharp: false }, // A
  { noteIndex: 10, color: KeyColor.BLACK, isSharp: true }, // A#
  { noteIndex: 11, color: KeyColor.WHITE, isSharp: false }, // B
];

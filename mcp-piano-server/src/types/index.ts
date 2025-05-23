/**
 * Type definitions for MCP Piano Server
 */

// Export all piano-specific types
export * from "./piano.js";

// Export piano constants and utilities
export * from "../models/piano-constants.js";
export * from "../utils/note-utils.js";

// Piano note representation
export interface Note {
  pitch: string; // e.g., "C4", "F#3", "Bb5"
  duration: number; // Duration in beats
  velocity?: number; // Note velocity (0-127), defaults to 64
  startTime: number; // Start time in beats from beginning
}

// Chord structure
export interface Chord {
  name: string; // e.g., "C major", "Am7", "G7"
  notes: Note[]; // Array of notes that make up the chord
  root: string; // Root note of the chord
  quality: ChordQuality;
}

// Chord quality types
export type ChordQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "dominant7"
  | "major7"
  | "minor7"
  | "sus2"
  | "sus4";

// Scale structure
export interface Scale {
  name: string; // e.g., "C major", "A minor", "G dorian"
  tonic: string; // Root note of the scale
  notes: string[]; // Array of note names in the scale
  intervals: number[]; // Semitone intervals from root
}

// Progression structure
export interface Progression {
  name?: string; // Optional name for the progression
  chords: Chord[]; // Array of chords in order
  timeSignature: TimeSignature;
  tempo: number; // BPM
  key: string; // Key signature
}

// Time signature
export interface TimeSignature {
  numerator: number; // Top number (beats per measure)
  denominator: number; // Bottom number (note value that gets the beat)
}

// Musical analysis result
export interface AnalysisResult {
  key: string;
  scale: Scale;
  chords: Chord[];
  tempo?: number;
  timeSignature?: TimeSignature;
  confidence: number; // Confidence level of analysis (0-1)
}

// Tool parameters for various piano operations
export interface GenerateProgressionParams {
  key: string;
  progressionType?: string;
  numChords?: number;
  tempo?: number;
  timeSignature?: TimeSignature;
}

export interface AnalyzeChordParams {
  notes: string[]; // Array of note names
}

export interface GenerateScaleParams {
  tonic: string;
  scaleType: string;
}

// Error types
export class PianoError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "PianoError";
  }
}

export class InvalidNoteError extends PianoError {
  constructor(note: string) {
    super(`Invalid note: ${note}`);
    this.code = "INVALID_NOTE";
  }
}

export class InvalidChordError extends PianoError {
  constructor(chord: string) {
    super(`Invalid chord: ${chord}`);
    this.code = "INVALID_CHORD";
  }
}

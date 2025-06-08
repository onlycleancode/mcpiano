/**
 * Type definitions for MCP Piano Server
 */

import type { WebSocket as WSWebSocket } from "ws";

// Export all piano-specific types
export * from "./piano.js";

// Export performance and reliability types
export * from "./performance.js";

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

// Validation constants
export const MIN_TEMPO = 40;
export const MAX_TEMPO = 300;
export const MIN_VELOCITY = 0;
export const MAX_VELOCITY = 127;
export const MIN_OCTAVE = 0;
export const MAX_OCTAVE = 9;

// WebSocket communication types
export interface PianoWebSocket {
  id: string;
  ws: WSWebSocket;
  isAlive: boolean;
}

// WebSocket message types for piano communication
export interface WebSocketMessage {
  type: string;
  timestamp: number;
  data?: any;
}

// Piano-specific WebSocket message types
export interface PianoKeyMessage extends WebSocketMessage {
  type: "piano-key-press" | "piano-key-release";
  data: {
    noteNumber: number;
    noteName: string;
    velocity: number;
    frequency: number;
  };
}

export interface PianoChordMessage extends WebSocketMessage {
  type: "piano-chord-play";
  data: {
    chord: Chord;
    velocity: number;
  };
}

export interface PianoProgressionMessage extends WebSocketMessage {
  type: "piano-progression-play";
  data: {
    progression: Progression;
  };
}

export interface PianoStatusMessage extends WebSocketMessage {
  type: "piano-status";
  data: {
    isPlaying: boolean;
    currentTempo: number;
    activeNotes: number[];
  };
}

// Union type for all piano WebSocket messages
export type PianoWebSocketMessage =
  | PianoKeyMessage
  | PianoChordMessage
  | PianoProgressionMessage
  | PianoStatusMessage
  | WebSocketMessage;

// WebSocket client status
export interface WebSocketClientStatus {
  id: string;
  connected: boolean;
  lastPing: number;
  lastPong: number;
}

/**
 * Configuration settings for MCP Piano Server
 */

import { TimeSignature } from "../types/index.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Default musical constants
export const DEFAULT_TEMPO = 120;
export const DEFAULT_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
};
export const DEFAULT_VELOCITY = 64;
export const DEFAULT_KEY = "C";

// Note and chord definitions
export const CHROMATIC_NOTES = [
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

export const ENHARMONIC_EQUIVALENTS: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

// Major scale intervals (in semitones)
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Common chord progressions
export const COMMON_PROGRESSIONS: Record<string, number[]> = {
  "I-V-vi-IV": [0, 4, 5, 3], // Very common in pop music
  "vi-IV-I-V": [5, 3, 0, 4], // Very popular in modern music
  "I-vi-IV-V": [0, 5, 3, 4], // Classic '50s progression
  "ii-V-I": [1, 4, 0], // Jazz standard
  "I-IV-V": [0, 3, 4], // Basic blues/rock
  "vi-V-IV-V": [5, 4, 3, 4], // Common in ballads
};

// Scale types and their intervals
export const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// Chord quality intervals (from root note)
export const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9],
  half_diminished7: [0, 3, 6, 10],
  augmented7: [0, 4, 8, 10],
  major6: [0, 4, 7, 9],
  minor6: [0, 3, 7, 9],
  add9: [0, 4, 7, 14],
  minor_add9: [0, 3, 7, 14],
};

// Server configuration
export interface ServerConfig {
  name: string;
  version: string;
  port: number;
  nodeEnv: string;
  maxToolExecutionTime: number; // in milliseconds
  enableDebugLogging: boolean;
}

export const SERVER_CONFIG: ServerConfig = {
  name: "piano-server",
  version: "1.0.0",
  port: parseInt(process.env.MCP_PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  maxToolExecutionTime: 30000, // 30 seconds
  enableDebugLogging: process.env.NODE_ENV === "development",
};

// Helper function to get server URL based on configuration
export function getServerUrl(): string {
  const { port } = SERVER_CONFIG;
  return `ws://localhost:${port}`;
}

// Helper function to get available endpoints
export function getAvailableEndpoints(): string[] {
  return [
    "tools/list - List all available piano tools",
    "tools/call - Execute a specific piano tool",
    "initialize - Initialize MCP connection",
    "ping - Health check endpoint",
  ];
}

// Validation constants
export const MIN_TEMPO = 40;
export const MAX_TEMPO = 300;
export const MIN_VELOCITY = 0;
export const MAX_VELOCITY = 127;
export const MIN_OCTAVE = 0;
export const MAX_OCTAVE = 9;

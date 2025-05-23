/**
 * Demo script showing how to use the piano data model
 */

import {
  getPianoData,
  findKeyByMidiNote,
  findKeyByNoteName,
  getKeysInOctave,
} from "../utils/piano-data.js";
import { PIANO_RANGE } from "../types/piano.js";

// Generate and display basic piano information
export function demonstratePianoData(): void {
  console.log("=== Piano Data Model Demo ===\n");

  // Get the complete piano data
  const piano = getPianoData();

  console.log(`Total keys: ${piano.totalKeys}`);
  console.log(`White keys: ${piano.whiteKeys.length}`);
  console.log(`Black keys: ${piano.blackKeys.length}`);
  console.log(
    `MIDI range: ${PIANO_RANGE.MIN_MIDI_NOTE} to ${PIANO_RANGE.MAX_MIDI_NOTE}\n`
  );

  // Show first and last keys
  console.log("=== Piano Range ===");
  const firstKey = piano.keys[0];
  const lastKey = piano.keys[piano.keys.length - 1];

  console.log(
    `Lowest key: ${firstKey.noteName} (MIDI ${firstKey.noteNumber}) - ${firstKey.frequency} Hz`
  );
  console.log(
    `Highest key: ${lastKey.noteName} (MIDI ${lastKey.noteNumber}) - ${lastKey.frequency} Hz\n`
  );

  // Demonstrate finding keys by different methods
  console.log("=== Finding Keys ===");

  // Find middle C (C4)
  const middleC = findKeyByNoteName(piano, "C4");
  if (middleC) {
    console.log(
      `Middle C: ${middleC.noteName} (MIDI ${middleC.noteNumber}) - ${middleC.frequency} Hz - ${middleC.color} key`
    );
  }

  // Find A4 (concert pitch)
  const concertA = findKeyByMidiNote(piano, 69);
  if (concertA) {
    console.log(
      `Concert A: ${concertA.noteName} (MIDI ${concertA.noteNumber}) - ${concertA.frequency} Hz - ${concertA.color} key`
    );
  }

  // Show keys in octave 4
  console.log("\n=== Octave 4 Keys ===");
  const octave4Keys = getKeysInOctave(piano, 4);
  octave4Keys.forEach((key) => {
    console.log(
      `${key.noteName}: MIDI ${key.noteNumber}, ${key.frequency} Hz, ${key.color} key`
    );
  });

  // Show pattern of white and black keys in first octave
  console.log("\n=== Key Color Pattern (Octave 0-1) ===");
  for (let i = 0; i < 24 && i < piano.keys.length; i++) {
    const key = piano.keys[i];
    const color = key.color === "white" ? "W" : "B";
    console.log(`${key.noteName.padEnd(3)} [${color}]`);
  }
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstratePianoData();
}

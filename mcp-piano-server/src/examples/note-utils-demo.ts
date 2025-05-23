/**
 * Demo script showing how to use the note utilities and piano constants
 */

import {
  midiToFrequency,
  noteNameToMidi,
  isBlackKey,
  getOctave,
  validateNoteInput,
  midiToNoteName,
  isWithinPianoRange,
  clampToPianoRange,
} from "../utils/note-utils.js";

import {
  getDynamicMarking,
  getVelocityRange,
  A0_FREQUENCY,
  A4_FREQUENCY,
  VELOCITY_DYNAMICS,
} from "../models/piano-constants.js";

export function demonstrateNoteUtils(): void {
  console.log("=== Note Utilities Demo ===\n");

  // Demonstrate frequency calculations
  console.log("=== Frequency Calculations ===");
  console.log(
    `A0 (MIDI 21): ${midiToFrequency(21)} Hz (Expected ~${A0_FREQUENCY} Hz)`
  );
  console.log(
    `A4 (MIDI 69): ${midiToFrequency(
      69
    )} Hz (Concert Pitch: ${A4_FREQUENCY} Hz)`
  );
  console.log(`C4 (MIDI 60): ${midiToFrequency(60)} Hz (Middle C)`);
  console.log(
    `C8 (MIDI 108): ${midiToFrequency(108)} Hz (Highest piano note)\n`
  );

  // Demonstrate note name to MIDI conversion
  console.log("=== Note Name to MIDI Conversions ===");
  const testNotes = ["C4", "C#4", "Db4", "A0", "C8", "F#3", "Bb5"];
  testNotes.forEach((note) => {
    try {
      const midi = noteNameToMidi(note);
      console.log(`${note} -> MIDI ${midi}`);
    } catch (error) {
      console.log(
        `${note} -> ERROR: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  });
  console.log();

  // Demonstrate MIDI to note name conversion
  console.log("=== MIDI to Note Name Conversions ===");
  const testMidiNumbers = [21, 60, 69, 108, 64, 71];
  testMidiNumbers.forEach((midi) => {
    const sharpName = midiToNoteName(midi, false);
    const flatName = midiToNoteName(midi, true);
    console.log(`MIDI ${midi} -> ${sharpName} (sharp) / ${flatName} (flat)`);
  });
  console.log();

  // Demonstrate black/white key detection
  console.log("=== Black/White Key Detection ===");
  console.log("First octave pattern (C to B):");
  for (let midi = 60; midi < 72; midi++) {
    const noteName = midiToNoteName(midi);
    const keyType = isBlackKey(midi) ? "BLACK" : "WHITE";
    console.log(`${noteName}: ${keyType} key`);
  }
  console.log();

  // Demonstrate octave detection
  console.log("=== Octave Detection ===");
  const octaveTestNotes = [21, 24, 36, 48, 60, 72, 84, 96, 108];
  octaveTestNotes.forEach((midi) => {
    const octave = getOctave(midi);
    const noteName = midiToNoteName(midi);
    console.log(`${noteName} (MIDI ${midi}) is in octave ${octave}`);
  });
  console.log();

  // Demonstrate piano range validation
  console.log("=== Piano Range Validation ===");
  const rangeTestNotes = [20, 21, 60, 108, 109];
  rangeTestNotes.forEach((midi) => {
    const inRange = isWithinPianoRange(midi);
    const clamped = clampToPianoRange(midi);
    console.log(
      `MIDI ${midi}: In piano range? ${inRange}, Clamped: ${clamped}`
    );
  });
  console.log();

  // Demonstrate input validation
  console.log("=== Input Validation ===");
  const testInputs: (string | number)[] = [
    "C4",
    "X4",
    60,
    128,
    "F#3",
    -1,
    "Bb5",
  ];
  testInputs.forEach((input) => {
    const result = validateNoteInput(input);
    if (result.valid) {
      console.log(
        `${input} -> Valid: MIDI ${result.midiNumber}, ${
          result.noteName
        }, Octave ${result.octave}, ${
          result.isBlackKey ? "Black" : "White"
        } key, ${result.frequency} Hz`
      );
    } else {
      console.log(`${input} -> Invalid: ${result.error}`);
    }
  });
  console.log();

  // Demonstrate velocity dynamics
  console.log("=== MIDI Velocity Dynamics ===");
  const testVelocities = [1, 31, 47, 63, 79, 95, 127];
  testVelocities.forEach((velocity) => {
    const dynamic = getDynamicMarking(velocity);
    if (dynamic) {
      console.log(`Velocity ${velocity}: ${dynamic.symbol} (${dynamic.name})`);
    } else {
      console.log(`Velocity ${velocity}: No dynamic marking found`);
    }
  });
  console.log();

  // Show velocity ranges for each dynamic marking
  console.log("=== Dynamic Marking Velocity Ranges ===");
  Object.entries(VELOCITY_DYNAMICS).forEach(([symbol, info]) => {
    console.log(
      `${info.symbol} (${info.name}): velocities ${info.min}-${info.max}`
    );
  });
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateNoteUtils();
}

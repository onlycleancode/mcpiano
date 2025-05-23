# Piano Data Model Documentation

## Overview

This project implements a comprehensive piano data model that represents an 88-key piano with proper note mappings, frequencies, and MIDI support. The model is designed to be accurate, efficient, and easy to use for music applications.

## Key Features

### 🎹 Complete 88-Key Piano Representation

- **MIDI Range**: 21 (A0) to 108 (C8)
- **52 White Keys**: Natural notes (C, D, E, F, G, A, B)
- **36 Black Keys**: Sharp/flat notes (C#/Db, D#/Eb, F#/Gb, G#/Ab, A#/Bb)
- **Accurate Frequencies**: Calculated using standard A4 = 440Hz tuning

### 🎵 Multiple Note Format Support

- **Scientific Notation**: "C4", "F#3", "Bb5"
- **MIDI Numbers**: 0-127 (piano uses 21-108)
- **Enharmonic Equivalents**: C# ↔ Db, F# ↔ Gb, etc.

### 🔧 TypeScript Type Safety

- Comprehensive interfaces and types
- Runtime type guards for validation
- Strict typing for better developer experience

## File Structure

```
src/
├── types/
│   ├── piano.ts          # Piano-specific type definitions
│   └── index.ts          # Main types export
├── utils/
│   └── piano-data.ts     # Piano data generation and utilities
├── config/
│   └── index.ts          # Musical constants and configuration
└── examples/
    └── piano-demo.ts     # Usage demonstration
```

## Core Types

### PianoKey Interface

```typescript
interface PianoKey {
  noteNumber: number; // MIDI note number (21-108)
  noteName: string; // Scientific notation (A0 to C8)
  frequency: number; // Hz - calculated frequency
  color: "white" | "black";
  octave: number;
  position: number; // Visual position (0-87)
}
```

### Piano Interface

```typescript
interface Piano {
  keys: PianoKey[]; // All 88 keys
  totalKeys: number; // 88
  whiteKeys: PianoKey[]; // 52 white keys
  blackKeys: PianoKey[]; // 36 black keys
}
```

### Supporting Types

- `Velocity`: MIDI velocity (0-127)
- `NoteFormat`: Union of all supported note formats
- `NoteEvent`: For note playing/triggering
- `PianoChord`: Chord representation
- `PianoScale`: Scale representation

## Key Functions

### Data Generation

```typescript
// Get the complete piano data (singleton pattern)
const piano = getPianoData();

// Generate individual key
const key = generatePianoKey(60); // Middle C
```

### Note Lookup

```typescript
// Find by MIDI number
const middleC = findKeyByMidiNote(piano, 60);

// Find by scientific notation
const concertA = findKeyByNoteName(piano, "A4");

// Get all keys in an octave
const octave4 = getKeysInOctave(piano, 4);
```

### Conversions

```typescript
// MIDI to scientific notation
const noteName = midiToScientificNotation(60); // "C4"

// Scientific notation to MIDI
const midiNumber = scientificNotationToMidi("A4"); // 69

// Calculate frequency
const frequency = calculateFrequency(69); // 440.0 Hz
```

### Validation

```typescript
// Check if MIDI note is valid for piano
const isValid = isValidPianoNote(21); // true (A0)

// Get nearest valid piano note
const nearest = getNearestPianoNote(10); // 21 (clamps to A0)
```

## Piano Specifications

### MIDI Range

- **Lowest Note**: A0 (MIDI 21) - 27.5 Hz
- **Highest Note**: C8 (MIDI 108) - 4186.01 Hz
- **Total Keys**: 88

### Key Distribution

- **White Keys**: 52 (natural notes)
- **Black Keys**: 36 (sharps/flats)
- **Octaves**: 0-8 (partial octaves at extremes)

### Frequency Calculation

Uses the standard equal temperament formula:

```
f = 440 × 2^((n-69)/12)
```

Where:

- `f` = frequency in Hz
- `n` = MIDI note number
- `69` = MIDI number for A4 (440 Hz)

## Usage Examples

### Basic Piano Data Access

```typescript
import { getPianoData } from "./utils/piano-data.js";

const piano = getPianoData();
console.log(`Piano has ${piano.totalKeys} keys`);
console.log(`Range: ${piano.keys[0].noteName} to ${piano.keys[87].noteName}`);
```

### Working with Specific Keys

```typescript
// Find middle C
const middleC = findKeyByNoteName(piano, "C4");
if (middleC) {
  console.log(`Middle C: MIDI ${middleC.noteNumber}, ${middleC.frequency} Hz`);
}

// Get all C notes across octaves
const allCs = getNotesOfName(piano, "C");
allCs.forEach((key) => {
  console.log(`${key.noteName}: ${key.frequency} Hz`);
});
```

### Type-Safe Operations

```typescript
import { isValidPianoMidiNote, Velocity } from "./types/piano.js";

function playNote(midiNote: number, velocity: Velocity) {
  if (isValidPianoMidiNote(midiNote)) {
    const key = findKeyByMidiNote(piano, midiNote);
    // Play the note...
  }
}
```

## Design Principles

### 1. **Accuracy**

- Precise frequency calculations
- Correct MIDI mappings
- Standard piano specifications

### 2. **Performance**

- Singleton pattern for piano data
- Efficient lookup methods
- Minimal memory footprint

### 3. **Type Safety**

- Comprehensive TypeScript types
- Runtime validation functions
- Clear interfaces

### 4. **Extensibility**

- Modular design
- Support for chords and scales
- Easy to add new features

## Integration with Existing Code

The piano data model integrates seamlessly with the existing MCP Piano Server configuration:

- Uses existing `CHROMATIC_NOTES` from config
- Compatible with existing `Note` and `Chord` interfaces
- Extends existing musical constants and types

## Future Enhancements

1. **Visual Layout**: More sophisticated positioning for UI rendering
2. **Chord Detection**: Advanced chord recognition algorithms
3. **Scale Generation**: Automatic scale generation on piano keys
4. **MIDI Integration**: Direct MIDI input/output support
5. **Audio Synthesis**: Integration with Web Audio API

## Technical Notes

- All frequencies are rounded to 2 decimal places for consistency
- Enharmonic equivalents are properly handled (C# ↔ Db)
- Position values are 0-indexed from left to right
- Type guards ensure runtime safety
- Singleton pattern prevents redundant data generation

This piano data model provides a solid foundation for any piano-related application, from simple note lookup to complex musical analysis and synthesis.

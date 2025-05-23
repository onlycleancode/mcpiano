# Piano Data Model - Subtasks 2.2 & 2.3 Implementation

## Completed Subtasks

### ✅ Subtask 2.2 - Piano Constants (`src/models/piano-constants.ts`)

Created comprehensive piano constants including:

#### Base Frequencies

- **A0 frequency**: 27.5 Hz as base reference
- **A4 frequency**: 440.0 Hz (concert pitch)
- **A4 MIDI number**: 69

#### Note Name Arrays

- **Sharp notation**: `['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']`
- **Flat notation**: `['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']`
- **Natural notes**: `['C', 'D', 'E', 'F', 'G', 'A', 'B']`
- **Accidentals**: Sharp and flat note arrays

#### Enharmonic Equivalents Mapping

```typescript
const ENHARMONIC_EQUIVALENTS = {
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
```

#### MIDI Velocity to Dynamic Markings

```typescript
const VELOCITY_DYNAMICS = {
  pp: { min: 1, max: 31, name: "pianissimo", symbol: "pp" },
  p: { min: 32, max: 47, name: "piano", symbol: "p" },
  mp: { min: 48, max: 63, name: "mezzo-piano", symbol: "mp" },
  mf: { min: 64, max: 79, name: "mezzo-forte", symbol: "mf" },
  f: { min: 80, max: 95, name: "forte", symbol: "f" },
  ff: { min: 96, max: 127, name: "fortissimo", symbol: "ff" },
};
```

#### Additional Constants

- Black/white key indices patterns
- MIDI range constants
- Octave information
- Note name validation patterns

### ✅ Subtask 2.3 - Note Utilities (`src/utils/note-utils.ts`)

Created pure utility functions for note manipulation:

#### Core Functions

##### `midiToFrequency(midiNumber: number): number`

- Uses formula: `440 * 2^((midiNumber - 69) / 12)`
- Returns frequency in Hz, rounded to 2 decimal places
- Validates MIDI input range (0-127)

##### `noteNameToMidi(noteName: string): number`

- Parses scientific notation like "C4", "C#4", "Db4"
- C4 = MIDI 60 (Middle C)
- Supports both sharp and flat notation
- Handles enharmonic equivalents
- Validates note format and range

##### `isBlackKey(midiNumber: number): boolean`

- Determines if MIDI number represents a black key
- Uses chromatic index pattern matching
- Returns true for black keys, false for white keys

##### `getOctave(midiNumber: number): number`

- Returns octave number in scientific notation
- C4 is in octave 4, A0 is in octave 0

##### `validateNoteInput(input: string | number)`

- Comprehensive validation for both note names and MIDI numbers
- Returns detailed information about valid notes
- Provides error messages for invalid input

#### Additional Utility Functions

- **`midiToNoteName()`**: Convert MIDI to scientific notation
- **`isWithinPianoRange()`**: Check if MIDI is within 88-key range
- **`clampToPianoRange()`**: Constrain MIDI to piano range

## File Structure

```
src/
├── models/
│   └── piano-constants.ts    # Piano constants and mappings
├── utils/
│   ├── piano-data.ts        # Piano data generation (existing)
│   └── note-utils.ts        # Note manipulation utilities (new)
├── types/
│   ├── piano.ts             # Piano types (existing)
│   └── index.ts             # Main types export (updated)
└── examples/
    ├── piano-demo.ts        # Piano data demo (existing)
    └── note-utils-demo.ts   # Note utils demo (new)
```

## Key Features

### 🎵 **Comprehensive Note Support**

- Scientific notation parsing ("C4", "F#3", "Bb5")
- Enharmonic equivalent handling (C# ↔ Db)
- Full MIDI range support (0-127)
- Piano-specific range validation (21-108)

### 🎹 **Frequency Calculations**

- Standard equal temperament tuning
- A4 = 440Hz reference
- Precise frequency calculations for all MIDI notes
- Rounded to 2 decimal places for consistency

### 🎼 **Dynamic Markings**

- MIDI velocity mapped to musical dynamics
- Six levels: pp, p, mp, mf, f, ff
- Bidirectional mapping (velocity ↔ dynamic)

### 🔧 **Type Safety & Validation**

- Comprehensive input validation
- Clear error messages
- TypeScript type safety
- Runtime bounds checking

## Usage Examples

### Basic Note Conversions

```typescript
import {
  midiToFrequency,
  noteNameToMidi,
  midiToNoteName,
} from "./utils/note-utils.js";

// Frequency calculations
const middleCFreq = midiToFrequency(60); // 261.63 Hz
const concertAFreq = midiToFrequency(69); // 440.0 Hz

// Note name conversions
const midiC4 = noteNameToMidi("C4"); // 60
const noteA4 = midiToNoteName(69); // "A4"
```

### Key Type Detection

```typescript
import { isBlackKey, getOctave } from "./utils/note-utils.js";

// Check key colors
console.log(isBlackKey(60)); // false (C4 is white)
console.log(isBlackKey(61)); // true (C#4 is black)

// Get octaves
console.log(getOctave(60)); // 4 (C4 is in octave 4)
console.log(getOctave(21)); // 0 (A0 is in octave 0)
```

### Comprehensive Validation

```typescript
import { validateNoteInput } from "./utils/note-utils.js";

const result = validateNoteInput("C4");
if (result.valid) {
  console.log(`MIDI: ${result.midiNumber}`); // 60
  console.log(`Frequency: ${result.frequency}`); // 261.63
  console.log(`Octave: ${result.octave}`); // 4
  console.log(`Black key: ${result.isBlackKey}`); // false
}
```

### Dynamic Markings

```typescript
import {
  getDynamicMarking,
  getVelocityRange,
} from "./models/piano-constants.js";

// Get dynamic for velocity
const dynamic = getDynamicMarking(80); // forte (f)
console.log(dynamic?.symbol); // "f"

// Get velocity range for dynamic
const range = getVelocityRange("mf");
console.log(`${range?.min}-${range?.max}`); // "64-79"
```

## Integration with Existing Code

The new piano constants and note utilities integrate seamlessly with the existing codebase:

- **Compatible with existing types**: Works with `PianoKey`, `Piano`, and other interfaces
- **Extends existing functionality**: Builds upon the piano data model
- **Type-safe exports**: All new functions and constants are properly typed
- **Consistent API**: Follows established patterns and conventions

## Performance Considerations

- **Pure functions**: All note utilities are stateless and side-effect free
- **Efficient calculations**: Frequency calculations use optimized formulas
- **Constant-time lookups**: Note name arrays enable O(1) lookups
- **Minimal memory footprint**: Constants are defined once and reused

## Testing & Validation

Demo files are provided to test all functionality:

- **`note-utils-demo.ts`**: Comprehensive demonstration of all note utilities
- **`piano-demo.ts`**: Original piano data model demonstration

Both demos can be run to verify correct implementation and provide usage examples.

## Next Steps

The piano data model now has:

1. ✅ Complete type definitions (Subtask 2.1)
2. ✅ Piano constants (Subtask 2.2)
3. ✅ Note utilities (Subtask 2.3)

This provides a solid foundation for:

- MIDI input/output processing
- Musical analysis algorithms
- User interface components
- Audio synthesis integration
- Real-time performance applications

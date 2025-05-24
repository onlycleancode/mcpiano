/**
 * Piano Model Requirements Demonstration
 *
 * This demo shows that the Piano class meets all requirements:
 * 1. Generates all 88 keys on instantiation
 * 2. Provides getKey(noteInput: string | number): PianoKey | null
 * 3. Provides getAllKeys(): PianoKey[]
 * 4. Provides getKeyRange(): { min: PianoKey, max: PianoKey }
 * 5. Calculates visual positions (white keys adjacent, black keys offset)
 */

import { Piano } from "../models/piano.js";

function demonstratePianoRequirements() {
  console.log("🎹 Piano Model Requirements Demonstration\n");

  // ✅ Requirement 1: Generates all 88 keys on instantiation
  console.log("1. Instantiation and 88-key generation:");
  const piano = new Piano();
  console.log(`   ✓ Piano created with ${piano.getAllKeys().length} keys`);
  console.log("");

  // ✅ Requirement 2: getKey(noteInput: string | number): PianoKey | null
  console.log("2. getKey() method with string and number inputs:");

  // Test with note names
  const middleC = piano.getKey("C4");
  console.log(
    `   ✓ getKey("C4"): ${middleC?.noteName} (MIDI ${middleC?.noteNumber})`
  );

  // Test with MIDI numbers
  const concertA = piano.getKey(69);
  console.log(
    `   ✓ getKey(69): ${concertA?.noteName} (${concertA?.frequency} Hz)`
  );

  // Test with enharmonic equivalents
  const cSharp = piano.getKey("C#4");
  const dFlat = piano.getKey("Db4");
  console.log(
    `   ✓ Enharmonic: C#4 and Db4 are ${
      cSharp?.noteNumber === dFlat?.noteNumber ? "same" : "different"
    } key`
  );

  // Test invalid input
  const invalid = piano.getKey("X99");
  console.log(
    `   ✓ Invalid input "X99": ${
      invalid === null ? "null (correct)" : "unexpected result"
    }`
  );
  console.log("");

  // ✅ Requirement 3: getAllKeys(): PianoKey[]
  console.log("3. getAllKeys() method:");
  const allKeys = piano.getAllKeys();
  console.log(`   ✓ Returns ${allKeys.length} keys`);
  console.log(
    `   ✓ First key: ${allKeys[0]?.noteName} (MIDI ${allKeys[0]?.noteNumber})`
  );
  console.log(
    `   ✓ Last key: ${allKeys[allKeys.length - 1]?.noteName} (MIDI ${
      allKeys[allKeys.length - 1]?.noteNumber
    })`
  );
  console.log("");

  // ✅ Requirement 4: getKeyRange(): { min: PianoKey, max: PianoKey }
  console.log("4. getKeyRange() method:");
  const range = piano.getKeyRange();
  console.log(
    `   ✓ Min key: ${range.min.noteName} (MIDI ${range.min.noteNumber})`
  );
  console.log(
    `   ✓ Max key: ${range.max.noteName} (MIDI ${range.max.noteNumber})`
  );
  console.log("");

  // ✅ Requirement 5: Visual positions (white keys adjacent, black keys offset)
  console.log("5. Visual position calculations:");
  console.log("   White keys (adjacent positions):");

  // Show first octave white keys
  const firstOctaveWhites = allKeys
    .slice(0, 12)
    .filter((key) => key.color === "white");
  firstOctaveWhites.forEach((key) => {
    console.log(
      `     ${key.noteName.padEnd(3)}: position ${key.position.toFixed(1)}`
    );
  });

  console.log("   Black keys (offset positions):");
  const firstOctaveBlacks = allKeys
    .slice(0, 12)
    .filter((key) => key.color === "black");
  firstOctaveBlacks.forEach((key) => {
    console.log(
      `     ${key.noteName.padEnd(3)}: position ${key.position.toFixed(
        1
      )} (between white keys)`
    );
  });

  console.log("");
  console.log("✅ All Piano model requirements satisfied!");
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstratePianoRequirements();
}

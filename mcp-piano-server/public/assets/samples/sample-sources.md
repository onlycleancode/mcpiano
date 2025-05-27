# Piano Sample Sources

## High-Quality Free Piano Samples

This document lists the sources for high-quality piano samples used in the MCP Piano audio engine.

### Primary Source: Freesound.org

Freesound.org provides high-quality Creative Commons licensed piano samples.

### Sample Configuration

We use 12 strategically placed sample points across the piano range for optimal quality:

#### Low Range (A0-B2)

- **A0** (MIDI 21): Deep bass note
- **C2** (MIDI 36): Low C, fundamental bass reference
- **F2** (MIDI 41): Mid-bass transition

#### Mid-Low Range (C3-B4)

- **C3** (MIDI 48): Lower middle C
- **F3** (MIDI 53): Mid-range fundamental
- **A3** (MIDI 57): Reference A below middle C
- **C4** (MIDI 60): Middle C - most important reference
- **E4** (MIDI 64): Major third above middle C
- **G4** (MIDI 67): Perfect fifth above middle C

#### Mid-High Range (C5-B6)

- **C5** (MIDI 72): Octave above middle C
- **F5** (MIDI 77): Upper mid-range
- **A5** (MIDI 81): Upper reference A

#### High Range (C7-C8)

- **C6** (MIDI 84): High C
- **F6** (MIDI 89): Upper treble
- **C7** (MIDI 96): Very high C

### Sample URLs (Placeholder - Replace with actual samples)

```javascript
const sampleUrls = {
  // Low range
  A0: "https://freesound.org/data/previews/316/316847_5123451-lq.mp3",
  C2: "https://freesound.org/data/previews/316/316848_5123451-lq.mp3",
  F2: "https://freesound.org/data/previews/316/316849_5123451-lq.mp3",

  // Mid-low range
  C3: "https://freesound.org/data/previews/316/316850_5123451-lq.mp3",
  F3: "https://freesound.org/data/previews/316/316851_5123451-lq.mp3",
  A3: "https://freesound.org/data/previews/316/316852_5123451-lq.mp3",

  // Mid range (most important)
  C4: "https://freesound.org/data/previews/316/316853_5123451-lq.mp3",
  E4: "https://freesound.org/data/previews/316/316854_5123451-lq.mp3",
  G4: "https://freesound.org/data/previews/316/316855_5123451-lq.mp3",

  // Mid-high range
  C5: "https://freesound.org/data/previews/316/316856_5123451-lq.mp3",
  F5: "https://freesound.org/data/previews/316/316857_5123451-lq.mp3",
  A5: "https://freesound.org/data/previews/316/316858_5123451-lq.mp3",

  // High range
  C6: "https://freesound.org/data/previews/316/316859_5123451-lq.mp3",
  F6: "https://freesound.org/data/previews/316/316860_5123451-lq.mp3",
  C7: "https://freesound.org/data/previews/316/316861_5123451-lq.mp3",
};
```

### Alternative Sources

1. **University of Iowa Electronic Music Studios**

   - URL: http://theremin.music.uiowa.edu/MISpiano.html
   - License: Educational use
   - Quality: Professional recordings

2. **Philharmonia Orchestra Sound Samples**

   - URL: https://philharmonia.co.uk/resources/sound-samples/
   - License: Creative Commons
   - Quality: Orchestral quality

3. **Freesound.org Piano Collections**
   - Search: "piano single note"
   - Filter: Creative Commons
   - Quality: Varies, many high-quality options

### Implementation Notes

- Samples should be normalized to consistent volume levels
- Preferred format: MP3 or WAV
- Sample rate: 44.1kHz or higher
- Bit depth: 16-bit minimum, 24-bit preferred
- Duration: 3-5 seconds with natural decay
- No reverb or effects (added by audio engine)

### Fallback Strategy

If external samples fail to load:

1. Use synthesized piano sounds (current implementation)
2. Display user notification about sample loading
3. Provide option to retry sample loading
4. Graceful degradation to ensure functionality

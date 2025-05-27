# Piano Samples Directory

This directory contains piano samples used by the MCP Piano audio engine.

## Directory Structure

```
samples/
├── README.md                 # This file
├── sample-sources.md         # Documentation of sample sources
└── fallback/                 # Local fallback samples
    ├── C4.mp3               # Middle C sample
    ├── E4.mp3               # E above middle C
    ├── G4.mp3               # G above middle C
    └── C5.mp3               # C above middle C
```

## Primary Samples

The audio engine primarily uses high-quality piano samples from the University of Iowa Electronic Music Studios:

- **Source**: https://theremin.music.uiowa.edu/MISpiano.html
- **License**: Free for any use (educational, commercial, personal)
- **Quality**: Professional Steinway Model B recordings
- **Format**: 16-bit, 44.1kHz, Stereo AIFF
- **Recording**: Neumann KM 84 microphones in professional studio

## Sample Points

The engine uses 16 strategically placed sample points across the piano range:

### Low Range

- A0 (MIDI 21) - Lowest piano note
- C2 (MIDI 36) - Low C reference
- F2 (MIDI 41) - Bass transition

### Mid-Low Range

- C3 (MIDI 48) - Lower middle register
- F3 (MIDI 53) - Mid-range fundamental
- A3 (MIDI 57) - Reference A below middle C

### Mid Range (Most Important)

- C4 (MIDI 60) - Middle C (primary reference)
- E4 (MIDI 64) - Major third above middle C
- G4 (MIDI 67) - Perfect fifth above middle C
- A4 (MIDI 69) - Concert pitch A (440Hz)

### Mid-High Range

- C5 (MIDI 72) - Octave above middle C
- F5 (MIDI 77) - Upper mid-range
- A5 (MIDI 81) - Upper reference A

### High Range

- C6 (MIDI 84) - High C
- F6 (MIDI 89) - Upper treble
- C7 (MIDI 96) - Very high C

## Fallback Samples

If the University of Iowa samples fail to load, the engine can use local fallback samples placed in the `fallback/` directory. These should be:

- **Format**: MP3 or WAV
- **Sample Rate**: 44.1kHz or higher
- **Bit Depth**: 16-bit minimum
- **Duration**: 2-5 seconds with natural decay
- **Volume**: Normalized to consistent levels

## Adding Custom Samples

To add your own piano samples:

1. **Record or obtain high-quality piano samples**

   - Use a real acoustic piano if possible
   - Record in a quiet environment
   - Capture the full natural decay

2. **Process the samples**

   - Normalize volume levels
   - Remove silence from the beginning
   - Ensure consistent format (44.1kHz, 16-bit minimum)
   - Keep natural reverb/room tone

3. **Name the files correctly**

   - Use note names: C4.mp3, Fs3.wav, Bb5.aiff, etc.
   - Sharp notes: use 's' (Fs4 for F#4)
   - Flat notes: use 'b' (Bb3 for Bb3)

4. **Update the configuration**
   - Modify `audio-engine.js` sample configuration
   - Add your samples to the `urls` object
   - Test with the audio test page

## Sample Quality Guidelines

### Excellent Quality

- Real acoustic piano recordings
- Professional microphones and preamps
- Anechoic or well-treated room
- Multiple velocity layers
- Long natural decay

### Good Quality

- Digital piano with high-quality samples
- Good room acoustics
- Single velocity layer
- Natural decay preserved

### Acceptable Quality

- Synthesized piano sounds
- Basic recording setup
- Processed/edited samples
- Artificial or shortened decay

## Testing Samples

Use the test page at `/test-audio.html` to:

1. Test sample loading
2. Compare sampler vs synthesizer
3. Check velocity response
4. Verify note mapping
5. Test polyphony and sustain

## Troubleshooting

### Samples Won't Load

- Check file paths and names
- Verify CORS headers for external samples
- Check browser console for errors
- Test with local fallback samples

### Poor Audio Quality

- Check sample rate and bit depth
- Verify volume normalization
- Test different sample sources
- Adjust audio engine settings

### Performance Issues

- Reduce number of sample points
- Use compressed formats (MP3)
- Implement sample streaming
- Optimize audio buffer sizes

## License Notes

- University of Iowa samples: Free for any use
- Custom samples: Ensure you have proper rights
- Commercial samples: Check licensing terms
- Attribution: Consider crediting sample sources

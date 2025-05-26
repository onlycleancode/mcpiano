/**
 * PianoRenderer - Handles visual rendering of 88-key piano interface
 * Calculates optimal dimensions and renders keys with proper spacing
 */
class PianoRenderer {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.ctx = context;

    // Piano configuration constants
    this.TOTAL_KEYS = 88;
    this.WHITE_KEYS = 52;
    this.BLACK_KEYS = 36;
    this.BLACK_KEY_WIDTH_RATIO = 0.6; // Black keys are 60% of white key width
    this.BLACK_KEY_HEIGHT_RATIO = 0.65; // Black keys are 65% of white key height
    this.BLACK_KEY_OFFSET_RATIO = 2 / 3; // Black keys positioned at 2/3 of white key width

    // Color scheme
    this.colors = {
      whiteKey: "#ffffff",
      whiteKeyPressed: "#e0e0e0",
      whiteKeyBorder: "#cccccc",
      blackKey: "#2c2c2c",
      blackKeyPressed: "#1a1a1a",
      blackKeyBorder: "#000000",
      keyboardBackground: "#f5f5f5",
    };

    // Key dimensions (calculated dynamically)
    this.keyDimensions = {
      whiteKeyWidth: 0,
      whiteKeyHeight: 0,
      blackKeyWidth: 0,
      blackKeyHeight: 0,
    };

    // Piano layout data
    this.keys = [];
    this.pressedKeys = new Set();

    this.initializePianoLayout();
  }

  /**
   * Calculate optimal key dimensions based on container size
   */
  calculateDimensions() {
    const containerWidth = this.canvas.width;
    const containerHeight = this.canvas.height;

    // Calculate white key dimensions
    this.keyDimensions.whiteKeyWidth = containerWidth / this.WHITE_KEYS;
    this.keyDimensions.whiteKeyHeight = containerHeight * 0.85; // Leave space for margins

    // Calculate black key dimensions
    this.keyDimensions.blackKeyWidth =
      this.keyDimensions.whiteKeyWidth * this.BLACK_KEY_WIDTH_RATIO;
    this.keyDimensions.blackKeyHeight =
      this.keyDimensions.whiteKeyHeight * this.BLACK_KEY_HEIGHT_RATIO;
  }

  /**
   * Initialize the complete piano layout with all 88 keys
   */
  initializePianoLayout() {
    this.keys = [];

    // Piano starts at A0 and ends at C8
    const noteNames = [
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
    ];
    const whiteNotes = ["C", "D", "E", "F", "G", "A", "B"];
    const blackNotes = ["C#", "D#", "F#", "G#", "A#"];

    let keyIndex = 0;
    let whiteKeyIndex = 0;

    // Start with A0, A#0, B0 (partial first octave)
    this.addKey("A", 0, keyIndex++, whiteKeyIndex++, false);
    this.addKey("A#", 0, keyIndex++, -1, true);
    this.addKey("B", 0, keyIndex++, whiteKeyIndex++, false);

    // Add complete octaves from C1 to B7
    for (let octave = 1; octave <= 7; octave++) {
      for (let noteIndex = 0; noteIndex < 12; noteIndex++) {
        const noteName = noteNames[noteIndex];
        const isBlack = blackNotes.includes(noteName);
        const currentWhiteIndex = isBlack ? -1 : whiteKeyIndex++;

        this.addKey(noteName, octave, keyIndex++, currentWhiteIndex, isBlack);
      }
    }

    // End with C8 (final key)
    this.addKey("C", 8, keyIndex++, whiteKeyIndex++, false);
  }

  /**
   * Add a key to the piano layout
   */
  addKey(noteName, octave, keyIndex, whiteKeyIndex, isBlack) {
    const key = {
      note: noteName,
      octave: octave,
      keyIndex: keyIndex,
      whiteKeyIndex: whiteKeyIndex,
      isBlack: isBlack,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      pressed: false,
    };

    this.keys.push(key);
  }

  /**
   * Calculate positions for all keys based on current dimensions
   */
  calculateKeyPositions() {
    const marginTop =
      (this.canvas.height - this.keyDimensions.whiteKeyHeight) / 2;

    // Position white keys first
    this.keys.forEach((key) => {
      if (!key.isBlack) {
        key.x = key.whiteKeyIndex * this.keyDimensions.whiteKeyWidth;
        key.y = marginTop;
        key.width = this.keyDimensions.whiteKeyWidth;
        key.height = this.keyDimensions.whiteKeyHeight;
      }
    });

    // Position black keys relative to white keys
    this.keys.forEach((key, index) => {
      if (key.isBlack) {
        const previousWhiteKey = this.findPreviousWhiteKey(index);
        if (previousWhiteKey) {
          // Position black key at 2/3 of the white key width
          key.x =
            previousWhiteKey.x +
            this.keyDimensions.whiteKeyWidth * this.BLACK_KEY_OFFSET_RATIO -
            this.keyDimensions.blackKeyWidth / 2;
          key.y = marginTop;
          key.width = this.keyDimensions.blackKeyWidth;
          key.height = this.keyDimensions.blackKeyHeight;
        }
      }
    });
  }

  /**
   * Find the previous white key for black key positioning
   */
  findPreviousWhiteKey(blackKeyIndex) {
    for (let i = blackKeyIndex - 1; i >= 0; i--) {
      if (!this.keys[i].isBlack) {
        return this.keys[i];
      }
    }
    return null;
  }

  /**
   * Render the complete piano keyboard
   */
  render() {
    this.calculateDimensions();
    this.calculateKeyPositions();

    // Clear canvas
    this.ctx.fillStyle = this.colors.keyboardBackground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render white keys first (behind black keys)
    this.keys.forEach((key) => {
      if (!key.isBlack) {
        this.renderKey(key);
      }
    });

    // Render black keys on top
    this.keys.forEach((key) => {
      if (key.isBlack) {
        this.renderKey(key);
      }
    });

    // Draw octave separators for visual grouping
    this.drawOctaveSeparators();
  }

  /**
   * Render an individual key
   */
  renderKey(key) {
    const isPressed = this.pressedKeys.has(key.keyIndex);

    // Determine colors based on key type and state
    let fillColor, borderColor;
    if (key.isBlack) {
      fillColor = isPressed
        ? this.colors.blackKeyPressed
        : this.colors.blackKey;
      borderColor = this.colors.blackKeyBorder;
    } else {
      fillColor = isPressed
        ? this.colors.whiteKeyPressed
        : this.colors.whiteKey;
      borderColor = this.colors.whiteKeyBorder;
    }

    // Draw key background
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(key.x, key.y, key.width, key.height);

    // Draw key border
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(key.x, key.y, key.width, key.height);

    // Add subtle shadow for depth (only for white keys)
    if (!key.isBlack && !isPressed) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      this.ctx.fillRect(key.x, key.y + key.height - 3, key.width, 3);
    }
  }

  /**
   * Draw visual separators between octaves for better grouping
   */
  drawOctaveSeparators() {
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.lineWidth = 2;

    // Find C keys (start of octaves) and draw separators
    this.keys.forEach((key) => {
      if (key.note === "C" && !key.isBlack && key.octave > 1) {
        const x = key.x - 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, key.y);
        this.ctx.lineTo(x, key.y + key.height);
        this.ctx.stroke();
      }
    });
  }

  /**
   * Get key at specific coordinates (for mouse/touch events)
   */
  getKeyAt(x, y) {
    // Check black keys first (they're on top)
    for (let key of this.keys) {
      if (key.isBlack && this.isPointInKey(x, y, key)) {
        return key;
      }
    }

    // Then check white keys
    for (let key of this.keys) {
      if (!key.isBlack && this.isPointInKey(x, y, key)) {
        return key;
      }
    }

    return null;
  }

  /**
   * Check if point is within key bounds
   */
  isPointInKey(x, y, key) {
    return (
      x >= key.x &&
      x <= key.x + key.width &&
      y >= key.y &&
      y <= key.y + key.height
    );
  }

  /**
   * Set key press state
   */
  setKeyPressed(keyIndex, pressed) {
    if (pressed) {
      this.pressedKeys.add(keyIndex);
    } else {
      this.pressedKeys.delete(keyIndex);
    }
  }

  /**
   * Get key by note and octave
   */
  getKey(note, octave) {
    return this.keys.find((key) => key.note === note && key.octave === octave);
  }

  /**
   * Get all keys
   */
  getAllKeys() {
    return this.keys;
  }

  /**
   * Clear all pressed keys
   */
  clearAllPressed() {
    this.pressedKeys.clear();
  }

  /**
   * Resize handler - recalculate everything when canvas size changes
   */
  handleResize() {
    this.render();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PianoRenderer;
}

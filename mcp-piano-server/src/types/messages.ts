/**
 * Message Protocol for MCP Piano Server
 * Defines message types, interfaces, validation, and serialization helpers
 */

// Message type enumeration for all supported message types
export enum MessageType {
  NOTE_ON = "note_on",
  NOTE_OFF = "note_off",
  CHORD_ON = "chord_on",
  ALL_NOTES_OFF = "all_notes_off",
  STATE_SYNC = "state_sync",
  HEARTBEAT = "heartbeat",
}

// Base message interface that all messages extend
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  source: "mcp" | "ui";
}

// Note message for individual key press/release events
export interface NoteMessage extends BaseMessage {
  type: MessageType.NOTE_ON | MessageType.NOTE_OFF;
  midiNumber: number;
  velocity: number;
}

// Chord message for multiple simultaneous notes
export interface ChordMessage extends BaseMessage {
  type: MessageType.CHORD_ON;
  notes: Array<{
    midiNumber: number;
    velocity: number;
  }>;
  chordName?: string;
}

// All notes off message to silence all playing notes
export interface AllNotesOffMessage extends BaseMessage {
  type: MessageType.ALL_NOTES_OFF;
}

// State synchronization message to sync piano state
export interface StateSyncMessage extends BaseMessage {
  type: MessageType.STATE_SYNC;
  activeNotes: Array<{
    midiNumber: number;
    velocity: number;
  }>;
  lastUpdateTimestamp: number;
  activeClientCount: number;
  stateVersion: number;
}

// Heartbeat message for connection monitoring
export interface HeartbeatMessage extends BaseMessage {
  type: MessageType.HEARTBEAT;
  clientId?: string;
}

// Union type for all possible messages
export type PianoMessage =
  | NoteMessage
  | ChordMessage
  | AllNotesOffMessage
  | StateSyncMessage
  | HeartbeatMessage;

// Message validation schemas
export const MessageValidationSchema = {
  // Validate MIDI number (0-127)
  isValidMidiNumber: (midiNumber: number): boolean => {
    return Number.isInteger(midiNumber) && midiNumber >= 0 && midiNumber <= 127;
  },

  // Validate velocity (0-127)
  isValidVelocity: (velocity: number): boolean => {
    return Number.isInteger(velocity) && velocity >= 0 && velocity <= 127;
  },

  // Validate timestamp
  isValidTimestamp: (timestamp: number): boolean => {
    return Number.isInteger(timestamp) && timestamp > 0;
  },

  // Validate source
  isValidSource: (source: string): source is "mcp" | "ui" => {
    return source === "mcp" || source === "ui";
  },

  // Validate message type
  isValidMessageType: (type: string): type is MessageType => {
    return Object.values(MessageType).includes(type as MessageType);
  },

  // Validate base message structure
  validateBaseMessage: (message: any): message is BaseMessage => {
    return (
      typeof message === "object" &&
      message !== null &&
      MessageValidationSchema.isValidMessageType(message.type) &&
      MessageValidationSchema.isValidTimestamp(message.timestamp) &&
      MessageValidationSchema.isValidSource(message.source)
    );
  },

  // Validate note message
  validateNoteMessage: (message: any): message is NoteMessage => {
    return (
      typeof message === "object" &&
      message !== null &&
      MessageValidationSchema.isValidMessageType(message.type) &&
      MessageValidationSchema.isValidTimestamp(message.timestamp) &&
      MessageValidationSchema.isValidSource(message.source) &&
      (message.type === MessageType.NOTE_ON ||
        message.type === MessageType.NOTE_OFF) &&
      typeof message.midiNumber === "number" &&
      typeof message.velocity === "number" &&
      MessageValidationSchema.isValidMidiNumber(message.midiNumber) &&
      MessageValidationSchema.isValidVelocity(message.velocity)
    );
  },

  // Validate chord message
  validateChordMessage: (message: any): message is ChordMessage => {
    return (
      typeof message === "object" &&
      message !== null &&
      MessageValidationSchema.isValidMessageType(message.type) &&
      MessageValidationSchema.isValidTimestamp(message.timestamp) &&
      MessageValidationSchema.isValidSource(message.source) &&
      message.type === MessageType.CHORD_ON &&
      Array.isArray(message.notes) &&
      message.notes.every(
        (note: any) =>
          typeof note === "object" &&
          note !== null &&
          typeof note.midiNumber === "number" &&
          typeof note.velocity === "number" &&
          MessageValidationSchema.isValidMidiNumber(note.midiNumber) &&
          MessageValidationSchema.isValidVelocity(note.velocity)
      ) &&
      (message.chordName === undefined || typeof message.chordName === "string")
    );
  },

  // Validate all notes off message
  validateAllNotesOffMessage: (message: any): message is AllNotesOffMessage => {
    return (
      typeof message === "object" &&
      message !== null &&
      MessageValidationSchema.isValidMessageType(message.type) &&
      MessageValidationSchema.isValidTimestamp(message.timestamp) &&
      MessageValidationSchema.isValidSource(message.source) &&
      message.type === MessageType.ALL_NOTES_OFF
    );
  },

  // Validate state sync message
  validateStateSyncMessage: (message: any): message is StateSyncMessage => {
    return (
      typeof message === "object" &&
      message !== null &&
      MessageValidationSchema.isValidMessageType(message.type) &&
      MessageValidationSchema.isValidTimestamp(message.timestamp) &&
      MessageValidationSchema.isValidSource(message.source) &&
      message.type === MessageType.STATE_SYNC &&
      Array.isArray(message.activeNotes) &&
      message.activeNotes.every(
        (note: any) =>
          typeof note === "object" &&
          note !== null &&
          typeof note.midiNumber === "number" &&
          typeof note.velocity === "number" &&
          MessageValidationSchema.isValidMidiNumber(note.midiNumber) &&
          MessageValidationSchema.isValidVelocity(note.velocity)
      ) &&
      typeof message.lastUpdateTimestamp === "number" &&
      MessageValidationSchema.isValidTimestamp(message.lastUpdateTimestamp) &&
      typeof message.activeClientCount === "number" &&
      message.activeClientCount >= 0 &&
      typeof message.stateVersion === "number" &&
      message.stateVersion >= 0
    );
  },

  // Validate heartbeat message
  validateHeartbeatMessage: (message: any): message is HeartbeatMessage => {
    return (
      typeof message === "object" &&
      message !== null &&
      MessageValidationSchema.isValidMessageType(message.type) &&
      MessageValidationSchema.isValidTimestamp(message.timestamp) &&
      MessageValidationSchema.isValidSource(message.source) &&
      message.type === MessageType.HEARTBEAT &&
      (message.clientId === undefined || typeof message.clientId === "string")
    );
  },

  // Validate any piano message
  validatePianoMessage: (message: any): message is PianoMessage => {
    if (!MessageValidationSchema.validateBaseMessage(message)) {
      return false;
    }

    switch (message.type) {
      case MessageType.NOTE_ON:
      case MessageType.NOTE_OFF:
        return MessageValidationSchema.validateNoteMessage(message);
      case MessageType.CHORD_ON:
        return MessageValidationSchema.validateChordMessage(message);
      case MessageType.ALL_NOTES_OFF:
        return MessageValidationSchema.validateAllNotesOffMessage(message);
      case MessageType.STATE_SYNC:
        return MessageValidationSchema.validateStateSyncMessage(message);
      case MessageType.HEARTBEAT:
        return MessageValidationSchema.validateHeartbeatMessage(message);
      default:
        return false;
    }
  },
};

// Serialization helpers for message handling
export class MessageSerializer {
  // Serialize a piano message to JSON string
  static serialize(message: PianoMessage): string {
    try {
      return JSON.stringify(message);
    } catch (error) {
      throw new Error(
        `Failed to serialize message: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Deserialize JSON string to piano message with validation
  static deserialize(data: string): PianoMessage {
    try {
      const parsed = JSON.parse(data);

      if (!MessageValidationSchema.validatePianoMessage(parsed)) {
        throw new Error("Invalid message format or content");
      }

      return parsed as PianoMessage;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("Invalid JSON format");
      }
      throw error;
    }
  }

  // Create a note message helper
  static createNoteMessage(
    type: MessageType.NOTE_ON | MessageType.NOTE_OFF,
    midiNumber: number,
    velocity: number,
    source: "mcp" | "ui" = "mcp"
  ): NoteMessage {
    return {
      type,
      midiNumber,
      velocity,
      timestamp: Date.now(),
      source,
    };
  }

  // Create a chord message helper
  static createChordMessage(
    notes: Array<{ midiNumber: number; velocity: number }>,
    chordName?: string,
    source: "mcp" | "ui" = "mcp"
  ): ChordMessage {
    const message: ChordMessage = {
      type: MessageType.CHORD_ON,
      notes,
      timestamp: Date.now(),
      source,
    };

    if (chordName !== undefined) {
      message.chordName = chordName;
    }

    return message;
  }

  // Create an all notes off message helper
  static createAllNotesOffMessage(
    source: "mcp" | "ui" = "mcp"
  ): AllNotesOffMessage {
    return {
      type: MessageType.ALL_NOTES_OFF,
      timestamp: Date.now(),
      source,
    };
  }

  // Create a state sync message helper
  static createStateSyncMessage(
    activeNotes: Array<{ midiNumber: number; velocity: number }>,
    lastUpdateTimestamp: number,
    activeClientCount: number,
    stateVersion: number,
    source: "mcp" | "ui" = "mcp"
  ): StateSyncMessage {
    return {
      type: MessageType.STATE_SYNC,
      activeNotes,
      timestamp: Date.now(),
      source,
      lastUpdateTimestamp,
      activeClientCount,
      stateVersion,
    };
  }

  // Create a heartbeat message helper
  static createHeartbeatMessage(
    clientId?: string,
    source: "mcp" | "ui" = "mcp"
  ): HeartbeatMessage {
    const message: HeartbeatMessage = {
      type: MessageType.HEARTBEAT,
      timestamp: Date.now(),
      source,
    };

    if (clientId !== undefined) {
      message.clientId = clientId;
    }

    return message;
  }
}

// Error classes for message handling
export class MessageValidationError extends Error {
  constructor(message: string, public readonly invalidMessage?: any) {
    super(message);
    this.name = "MessageValidationError";
  }
}

export class MessageSerializationError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = "MessageSerializationError";
  }
}

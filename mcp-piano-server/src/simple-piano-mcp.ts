/**
 * Simple MCP Piano Server
 * Provides basic piano note playing capabilities with WebSocket broadcasting
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocket } from "ws";
import { SERVER_CONFIG } from "./config/index.js";

// Simple in-memory note tracking
const currentlyPlayingNotes = new Set<string>();

// WebSocket client to connect to piano web server
let pianoWebSocketClient: WebSocket | null = null;

// Connect to piano web server as a client
function connectToPianoServer() {
  const pianoServerUrl = `ws://localhost:${SERVER_CONFIG.port}`;
  
  console.error(`🔌 Connecting to piano server at ${pianoServerUrl}...`);
  
  pianoWebSocketClient = new WebSocket(pianoServerUrl);

  pianoWebSocketClient.on("open", () => {
    console.error("✅ Connected to piano web server");
  });

  pianoWebSocketClient.on("close", () => {
    console.error("🔌 Disconnected from piano web server");
    pianoWebSocketClient = null;
    
    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      console.error("🔄 Attempting to reconnect to piano server...");
      connectToPianoServer();
    }, 5000);
  });

  pianoWebSocketClient.on("error", (error) => {
    console.error("❌ Piano server connection error:", error);
  });
}

// Send note events to piano web server
function sendNoteToPiano(
  type: "note_on" | "note_off",
  note: string,
  velocity: number = 64
) {
  if (!pianoWebSocketClient || pianoWebSocketClient.readyState !== WebSocket.OPEN) {
    console.error("⚠️ Piano server not connected, cannot send note");
    return;
  }

  // Convert note name to MIDI number for browser compatibility
  const midiNumber = noteNameToMidi(note);

  const message = JSON.stringify({
    type,
    midiNumber,
    velocity,
    timestamp: Date.now(),
    source: "mcp"  // Required by piano server message format
  });

  try {
    pianoWebSocketClient.send(message);
    console.error(
      `📤 Sent ${type}: ${note} (MIDI: ${midiNumber}) to piano server`
    );
  } catch (error) {
    console.error("❌ Failed to send message to piano server:", error);
  }
}

// Simple note name to MIDI conversion
function noteNameToMidi(noteName: string): number {
  const noteMap: { [key: string]: number } = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };

  const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) return 60; // Default to C4

  const [, note, octaveStr] = match;
  if (!note || !octaveStr) return 60; // Default to C4 if invalid
  const octave = parseInt(octaveStr);
  const noteValue = noteMap[note] || 0;

  return (octave + 1) * 12 + noteValue;
}

// Create server instance
const server = new Server({
  name: "piano-server",
  version: "1.0.0",
});

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "play_piano_note",
        description: "Play a single piano note",
        inputSchema: {
          type: "object",
          properties: {
            note: {
              type: "string",
              description:
                "Note to play in scientific notation (e.g., 'C4', 'F#3')",
            },
            velocity: {
              type: "number",
              minimum: 0,
              maximum: 127,
              default: 80,
              description: "Note velocity (0-127), defaults to 80",
            },
            duration: {
              type: "number",
              minimum: 100,
              default: 1000,
              description: "Duration in milliseconds, defaults to 1000ms",
            },
          },
          required: ["note"],
        },
      },
      {
        name: "stop_piano_note",
        description: "Stop a specific piano note",
        inputSchema: {
          type: "object",
          properties: {
            note: {
              type: "string",
              description: "Note to stop in scientific notation (e.g., 'C4')",
            },
          },
          required: ["note"],
        },
      },
      {
        name: "stop_all_piano_notes",
        description: "Stop all currently playing piano notes",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_currently_playing_notes",
        description: "Get list of currently playing notes",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_piano_info",
        description: "Get piano information and available note range",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "play_piano_melody",
        description: "Play a sequence of piano notes as a melody with timing",
        inputSchema: {
          type: "object",
          properties: {
            notes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  note: {
                    type: "string",
                    description: "Note in scientific notation (e.g., 'C4', 'F#3')",
                  },
                  duration: {
                    type: "number",
                    minimum: 50,
                    default: 500,
                    description: "Note duration in milliseconds",
                  },
                  velocity: {
                    type: "number",
                    minimum: 0,
                    maximum: 127,
                    default: 80,
                    description: "Note velocity (0-127)",
                  },
                  delay: {
                    type: "number",
                    minimum: 0,
                    default: 0,
                    description: "Delay before this note in milliseconds",
                  },
                },
                required: ["note"],
              },
              description: "Array of notes to play in sequence",
            },
            tempo: {
              type: "number",
              minimum: 60,
              maximum: 200,
              default: 120,
              description: "Tempo in BPM (beats per minute), defaults to 120",
            },
          },
          required: ["notes"],
        },
      },
      {
        name: "play_piano_chord",
        description: "Play multiple piano notes simultaneously as a chord",
        inputSchema: {
          type: "object",
          properties: {
            notes: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Array of notes to play simultaneously (e.g., ['C4', 'E4', 'G4'])",
            },
            velocity: {
              type: "number",
              minimum: 0,
              maximum: 127,
              default: 80,
              description: "Velocity for all notes (0-127), defaults to 80",
            },
            duration: {
              type: "number",
              minimum: 100,
              default: 2000,
              description: "Duration in milliseconds, defaults to 2000ms",
            },
          },
          required: ["notes"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "play_piano_note": {
      const {
        note,
        velocity = 80,
        duration = 1000,
      } = args as {
        note: string;
        velocity?: number;
        duration?: number;
      };

      // Validate note format (simplified)
      if (!note || typeof note !== "string") {
        return {
          content: [
            {
              type: "text",
              text: "❌ Invalid note format. Use scientific notation like 'C4', 'F#3'",
            },
          ],
          isError: true,
        };
      }

      // Add to playing notes
      currentlyPlayingNotes.add(note);

      // Send note_on to piano server
      sendNoteToPiano("note_on", note, velocity);

      // Schedule note off
      setTimeout(() => {
        currentlyPlayingNotes.delete(note);
        // Send note_off to piano server
        sendNoteToPiano("note_off", note, 0);
      }, duration);

      return {
        content: [
          {
            type: "text",
            text: `🎹 Playing note: ${note} for ${duration}ms at velocity ${velocity}`,
          },
        ],
      };
    }

    case "stop_piano_note": {
      const { note } = args as { note: string };

      if (currentlyPlayingNotes.has(note)) {
        currentlyPlayingNotes.delete(note);
        // Send note_off to piano server
        sendNoteToPiano("note_off", note, 0);

        return {
          content: [
            {
              type: "text",
              text: `🛑 Stopped note: ${note}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `ℹ️ Note ${note} was not playing`,
            },
          ],
        };
      }
    }

    case "stop_all_piano_notes": {
      const stoppedNotes = Array.from(currentlyPlayingNotes);

      // Send note_off for all playing notes to piano server
      stoppedNotes.forEach((note) => {
        sendNoteToPiano("note_off", note, 0);
      });

      currentlyPlayingNotes.clear();

      return {
        content: [
          {
            type: "text",
            text: `🛑 Stopped ${stoppedNotes.length} playing notes`,
          },
        ],
      };
    }

    case "get_currently_playing_notes": {
      const playingNotes = Array.from(currentlyPlayingNotes);

      return {
        content: [
          {
            type: "text",
            text:
              playingNotes.length > 0
                ? `🎵 Currently playing: ${playingNotes.join(", ")}`
                : "🔇 No notes currently playing",
          },
        ],
      };
    }

    case "get_piano_info": {
      return {
        content: [
          {
            type: "text",
            text: `🎹 Piano Information:
- Note Range: A0 to C8 (88 keys)
- Format: Scientific notation (e.g., C4, F#3, Bb5)
- Velocity: 0-127 (MIDI standard)
- Duration: Milliseconds (default 1000ms)
- WebSocket: Connected to piano server: ${pianoWebSocketClient?.readyState === WebSocket.OPEN ? 'Yes' : 'No'}

💡 Example: play_piano_note with note="C4", velocity=80, duration=500

Available tools:
- play_piano_note: Play individual notes
- play_piano_melody: Play sequences/melodies 
- play_piano_chord: Play multiple notes simultaneously
- stop_piano_note: Stop specific notes  
- stop_all_piano_notes: Stop all notes
- get_currently_playing_notes: Check what's playing
- get_piano_info: Show this information`,
          },
        ],
      };
    }

    case "play_piano_melody": {
      const {
        notes,
        tempo = 120,
      } = args as {
        notes: Array<{
          note: string;
          duration?: number;
          velocity?: number;
          delay?: number;
        }>;
        tempo?: number;
      };

      if (!notes || !Array.isArray(notes) || notes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Invalid melody format. Provide an array of notes with 'note' property.",
            },
          ],
          isError: true,
        };
      }

      // Calculate timing based on tempo
      const beatDuration = 60000 / tempo; // milliseconds per beat

      let totalDuration = 0;
      let currentTime = 0;

      // Schedule all notes in the melody
      for (const noteData of notes) {
        const {
          note,
          duration = beatDuration,
          velocity = 80,
          delay = 0,
        } = noteData;

        // Validate note format
        if (!note || typeof note !== "string") {
          continue;
        }

        currentTime += delay;

        // Schedule note on
        setTimeout(() => {
          currentlyPlayingNotes.add(note);
          sendNoteToPiano("note_on", note, velocity);
        }, currentTime);

        // Schedule note off
        setTimeout(() => {
          currentlyPlayingNotes.delete(note);
          sendNoteToPiano("note_off", note, 0);
        }, currentTime + duration);

        currentTime += duration;
        totalDuration = Math.max(totalDuration, currentTime);
      }

      return {
        content: [
          {
            type: "text",
            text: `🎵 Playing melody with ${notes.length} notes at ${tempo} BPM (${Math.round(totalDuration / 1000)}s duration)`,
          },
        ],
      };
    }

    case "play_piano_chord": {
      const {
        notes,
        velocity = 80,
        duration = 2000,
      } = args as {
        notes: string[];
        velocity?: number;
        duration?: number;
      };

      if (!notes || !Array.isArray(notes) || notes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Invalid chord format. Provide an array of note strings.",
            },
          ],
          isError: true,
        };
      }

      // Play all notes simultaneously
      notes.forEach((note) => {
        if (note && typeof note === "string") {
          currentlyPlayingNotes.add(note);
          sendNoteToPiano("note_on", note, velocity);
        }
      });

      // Schedule chord off
      setTimeout(() => {
        notes.forEach((note) => {
          if (note && typeof note === "string") {
            currentlyPlayingNotes.delete(note);
            sendNoteToPiano("note_off", note, 0);
          }
        });
      }, duration);

      return {
        content: [
          {
            type: "text",
            text: `🎹 Playing chord: [${notes.join(", ")}] for ${duration}ms at velocity ${velocity}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  // Connect to piano web server first
  connectToPianoServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    "🎹 Simple Piano MCP Server started! Connecting to piano web server..."
  );
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.error("\n🛑 Shutting down Piano MCP Server...");

  // Close WebSocket connection to piano server
  if (pianoWebSocketClient && pianoWebSocketClient.readyState === WebSocket.OPEN) {
    pianoWebSocketClient.close();
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error("\n🛑 Shutting down Piano MCP Server...");

  // Close WebSocket connection to piano server
  if (pianoWebSocketClient && pianoWebSocketClient.readyState === WebSocket.OPEN) {
    pianoWebSocketClient.close();
  }

  process.exit(0);
});

main().catch((error) => {
  console.error("❌ Failed to start Piano MCP Server:", error);
  process.exit(1);
});

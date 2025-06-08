/**
 * Test Client for MCP Piano Server
 * Demonstrates the piano server capabilities
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";

class PianoTestClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;

  constructor() {
    this.client = new Client({
      name: "piano-test-client",
      version: "1.0.0",
    });
  }

  /**
   * Helper to safely extract text from result content
   */
  private extractResultText(result: any): string {
    if (
      result.content &&
      Array.isArray(result.content) &&
      result.content.length > 0
    ) {
      const firstContent = result.content[0];
      if (
        firstContent &&
        typeof firstContent === "object" &&
        "text" in firstContent
      ) {
        return firstContent.text as string;
      }
    }
    return "No response content";
  }

  /**
   * Connect to the piano server
   */
  async connectToServer(serverPath: string): Promise<void> {
    try {
      this.transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
      });

      await this.client.connect(this.transport);
      console.log("✅ Connected to Piano MCP Server");

      // List available tools
      const toolsResult = await this.client.listTools();
      console.log("\n🎵 Available tools:");
      toolsResult.tools.forEach((tool) => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
    } catch (error) {
      console.error("❌ Failed to connect to server:", error);
      throw error;
    }
  }

  /**
   * Test playing a single note
   */
  async testPlayNote(
    note: string,
    velocity = 80,
    duration = 1000
  ): Promise<void> {
    try {
      console.log(`\n🎹 Testing: Playing note ${note}...`);
      const result = await this.client.callTool({
        name: "play_piano_note",
        arguments: { note, velocity, duration },
      });

      console.log(`   ${this.extractResultText(result)}`);
    } catch (error) {
      console.error(`❌ Error playing note ${note}:`, error);
    }
  }

  /**
   * Test stopping a note
   */
  async testStopNote(note: string): Promise<void> {
    try {
      console.log(`\n🛑 Testing: Stopping note ${note}...`);
      const result = await this.client.callTool({
        name: "stop_piano_note",
        arguments: { note },
      });

      console.log(`   ${this.extractResultText(result)}`);
    } catch (error) {
      console.error(`❌ Error stopping note ${note}:`, error);
    }
  }

  /**
   * Test getting currently playing notes
   */
  async testGetPlayingNotes(): Promise<void> {
    try {
      console.log("\n🔍 Testing: Getting currently playing notes...");
      const result = await this.client.callTool({
        name: "get_currently_playing_notes",
        arguments: {},
      });

      console.log(`   ${this.extractResultText(result)}`);
    } catch (error) {
      console.error("❌ Error getting playing notes:", error);
    }
  }

  /**
   * Test stopping all notes
   */
  async testStopAllNotes(): Promise<void> {
    try {
      console.log("\n🛑 Testing: Stopping all notes...");
      const result = await this.client.callTool({
        name: "stop_all_piano_notes",
        arguments: {},
      });

      console.log(`   ${this.extractResultText(result)}`);
    } catch (error) {
      console.error("❌ Error stopping all notes:", error);
    }
  }

  /**
   * Test getting piano info
   */
  async testGetPianoInfo(): Promise<void> {
    try {
      console.log("\n📋 Testing: Getting piano info...");
      const result = await this.client.callTool({
        name: "get_piano_info",
        arguments: {},
      });

      console.log(`   ${this.extractResultText(result)}`);
    } catch (error) {
      console.error("❌ Error getting piano info:", error);
    }
  }

  /**
   * Play a simple melody (Twinkle Twinkle Little Star)
   */
  async playTwinkleTwinkle(): Promise<void> {
    console.log("\n🎼 Playing Twinkle Twinkle Little Star...");

    const melody = [
      { note: "C4", duration: 500 },
      { note: "C4", duration: 500 },
      { note: "G4", duration: 500 },
      { note: "G4", duration: 500 },
      { note: "A4", duration: 500 },
      { note: "A4", duration: 500 },
      { note: "G4", duration: 1000 },
      { note: "F4", duration: 500 },
      { note: "F4", duration: 500 },
      { note: "E4", duration: 500 },
      { note: "E4", duration: 500 },
      { note: "D4", duration: 500 },
      { note: "D4", duration: 500 },
      { note: "C4", duration: 1000 },
    ];

    for (const { note, duration } of melody) {
      await this.testPlayNote(note, 80, duration);
      // Wait for the note to finish before playing the next one
      await new Promise((resolve) => setTimeout(resolve, duration + 100));
    }

    console.log("🎵 Melody complete!");
  }

  /**
   * Run comprehensive tests
   */
  async runTests(): Promise<void> {
    console.log("\n🧪 Starting Piano Server Tests...\n");

    // Test piano info
    await this.testGetPianoInfo();

    // Test playing some notes
    await this.testPlayNote("C4", 80, 2000);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await this.testPlayNote("E4", 100, 1500);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await this.testPlayNote("G4", 60, 1000);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Test getting currently playing notes
    await this.testGetPlayingNotes();

    // Test stopping a specific note
    await this.testStopNote("E4");
    await this.testGetPlayingNotes();

    // Test stopping all notes
    await this.testStopAllNotes();
    await this.testGetPlayingNotes();

    // Play a melody
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.playTwinkleTwinkle();

    console.log("\n✅ All tests completed!");
  }

  /**
   * Interactive mode for manual testing
   */
  async interactiveMode(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n🎹 Interactive Piano Mode");
    console.log("Commands:");
    console.log(
      "  play <note> [velocity] [duration] - Play a note (e.g., 'play C4 80 1000')"
    );
    console.log("  stop <note> - Stop a note (e.g., 'stop C4')");
    console.log("  stop-all - Stop all notes");
    console.log("  playing - Show currently playing notes");
    console.log("  info - Show piano info");
    console.log("  twinkle - Play Twinkle Twinkle Little Star");
    console.log("  quit - Exit");

    while (true) {
      try {
        const input = await rl.question("\nPiano> ");
        const parts = input.trim().split(" ");
        const command = parts[0]?.toLowerCase();

        if (!command) {
          console.log("❌ Please enter a command. Type 'quit' to exit.");
          continue;
        }

        if (command === "quit" || command === "exit") {
          break;
        } else if (command === "play" && parts.length >= 2 && parts[1]) {
          const note = parts[1];
          const velocity = parts[2] ? parseInt(parts[2]) : 80;
          const duration = parts[3] ? parseInt(parts[3]) : 1000;
          await this.testPlayNote(note, velocity, duration);
        } else if (command === "stop" && parts.length >= 2 && parts[1]) {
          const note = parts[1];
          await this.testStopNote(note);
        } else if (command === "stop-all") {
          await this.testStopAllNotes();
        } else if (command === "playing") {
          await this.testGetPlayingNotes();
        } else if (command === "info") {
          await this.testGetPianoInfo();
        } else if (command === "twinkle") {
          await this.playTwinkleTwinkle();
        } else {
          console.log("❌ Unknown command. Type 'quit' to exit.");
        }
      } catch (error) {
        console.error("❌ Error:", error);
      }
    }

    rl.close();
  }

  /**
   * Cleanup and close connection
   */
  async cleanup(): Promise<void> {
    try {
      await this.client.close();
    } catch (error) {
      // Ignore cleanup errors
    }
    console.log("🔌 Disconnected from server");
  }
}

// Main execution
async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node test-client.js <path_to_piano_server>");
    console.log("Example: node test-client.js dist/simple-piano-mcp.js");
    return;
  }

  const serverPath = process.argv[2];
  if (!serverPath) {
    console.log("❌ Server path is required");
    return;
  }

  const client = new PianoTestClient();

  try {
    await client.connectToServer(serverPath);

    // Check if we should run tests or interactive mode
    const mode = process.argv[3] || "test";

    if (mode === "interactive" || mode === "-i") {
      await client.interactiveMode();
    } else {
      await client.runTests();
    }
  } catch (error) {
    console.error("❌ Client error:", error);
  } finally {
    await client.cleanup();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n👋 Goodbye!");
  process.exit(0);
});

main().catch(console.error);

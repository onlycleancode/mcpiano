#!/usr/bin/env node

/**
 * Extended Piano Test - Longer notes for better visibility
 * Tests with extended duration and multiple notes
 */

import WebSocket from "ws";

async function testExtendedPianoPlay() {
  console.log("🎹 Extended Piano Test - Longer Notes");
  console.log("=" .repeat(50));
  console.log("⚠️  IMPORTANT: Open http://localhost:3000 in your browser NOW!");
  console.log("    You should see a piano interface");
  console.log("");
  
  // Wait for user to open browser
  await new Promise(resolve => {
    console.log("⏳ Waiting 5 seconds for you to open the browser...");
    setTimeout(resolve, 5000);
  });
  
  // Connect directly to piano web server WebSocket
  const pianoWS = new WebSocket("ws://localhost:3000");
  
  pianoWS.on("open", () => {
    console.log("✅ Connected to piano web server");
    console.log("");
    
    // Test sequence with longer notes and clear feedback
    const testSequence = [
      { note: "C4", midi: 60, duration: 3000, name: "Middle C" },
      { note: "E4", midi: 64, duration: 3000, name: "E above middle C" },
      { note: "G4", midi: 67, duration: 3000, name: "G above middle C" },
      { note: "C5", midi: 72, duration: 4000, name: "High C" }
    ];
    
    let currentTest = 0;
    
    function playNextNote() {
      if (currentTest >= testSequence.length) {
        console.log("\n🎵 Test sequence complete!");
        console.log("Did you see the piano keys press and hear the notes?");
        pianoWS.close();
        return;
      }
      
      const test = testSequence[currentTest];
      console.log(`🎼 [${currentTest + 1}/4] Playing ${test.name} (${test.note}) for ${test.duration}ms`);
      console.log(`   👀 WATCH: The ${test.note} key should light up and play audio`);
      
      // Send note_on message
      const noteOnMessage = {
        type: "note_on",
        midiNumber: test.midi,
        velocity: 100, // Louder for better audio
        timestamp: Date.now(),
        source: "mcp"
      };
      
      pianoWS.send(JSON.stringify(noteOnMessage));
      console.log(`   📤 Sent note_on for ${test.note}`);
      
      // Schedule note_off
      setTimeout(() => {
        const noteOffMessage = {
          type: "note_off",
          midiNumber: test.midi,
          velocity: 0,
          timestamp: Date.now(),
          source: "mcp"
        };
        
        pianoWS.send(JSON.stringify(noteOffMessage));
        console.log(`   📤 Sent note_off for ${test.note}`);
        console.log("");
        
        currentTest++;
        
        // Wait a bit before next note
        setTimeout(playNextNote, 1000);
        
      }, test.duration);
    }
    
    // Start the sequence
    playNextNote();
  });
  
  pianoWS.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === "connection-established") {
      console.log("🔗 Piano server confirmed connection");
    } else if (message.type === "state_sync") {
      console.log("🔄 Received state sync from piano server");
    }
  });
  
  pianoWS.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
  });
  
  pianoWS.on("close", () => {
    console.log("🔌 Disconnected from piano server");
    console.log("");
    console.log("🎯 Test Summary:");
    console.log("   - You should have seen 4 piano keys light up");
    console.log("   - You should have heard 4 different notes play");
    console.log("   - Each note should have played for 3-4 seconds");
    console.log("");
    console.log("❓ If you didn't see/hear anything:");
    console.log("   1. Make sure browser is open to http://localhost:3000");
    console.log("   2. Check browser console for errors (F12)");
    console.log("   3. Make sure audio is enabled in browser");
  });
}

// Also test via MCP server with longer duration
async function testViaMCPServer() {
  console.log("\n🎹 Testing via MCP Server (5 second note)");
  console.log("=" .repeat(50));
  
  const { spawn } = await import("child_process");
  
  const mcpProcess = spawn("node", ["dist/simple-piano-mcp.js"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, MCP_PORT: "3000" }
  });
  
  mcpProcess.stderr.on("data", (data) => {
    console.log("🔍 MCP:", data.toString().trim());
  });
  
  // Wait for connection
  setTimeout(() => {
    // Send initialization
    const initMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      }
    }) + "\n";
    
    mcpProcess.stdin.write(initMessage);
    
    setTimeout(() => {
      // Play a long C4 note
      console.log("\n🎼 Playing 5-second C4 note via MCP server...");
      const playMessage = JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "play_piano_note",
          arguments: {
            note: "C4",
            velocity: 100,
            duration: 5000  // 5 seconds!
          }
        }
      }) + "\n";
      
      mcpProcess.stdin.write(playMessage);
      
      setTimeout(() => {
        mcpProcess.kill();
      }, 7000);
      
    }, 1000);
  }, 2000);
}

// Run the tests
console.log("🧪 Extended Piano Functionality Test\n");

testExtendedPianoPlay().then(() => {
  setTimeout(() => {
    testViaMCPServer();
  }, 2000);
});
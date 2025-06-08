#!/usr/bin/env node

/**
 * Simple MCP Test - Direct WebSocket connection test
 * Tests the exact message flow from MCP server to piano
 */

import WebSocket from "ws";

async function testDirectMCPConnection() {
  console.log("🔌 Testing Direct MCP Connection");
  console.log("=" .repeat(40));
  
  // Connect directly to piano web server WebSocket
  const pianoWS = new WebSocket("ws://localhost:3000");
  
  pianoWS.on("open", () => {
    console.log("✅ Connected to piano web server");
    
    // Test sending the exact message format that MCP server should send
    const testMessages = [
      {
        type: "note_on",
        midiNumber: 60, // C4
        velocity: 80,
        timestamp: Date.now(),
        source: "mcp"
      },
      {
        type: "note_off", 
        midiNumber: 60, // C4
        velocity: 0,
        timestamp: Date.now(),
        source: "mcp"
      }
    ];
    
    console.log("🎵 Sending test note_on message...");
    pianoWS.send(JSON.stringify(testMessages[0]));
    
    setTimeout(() => {
      console.log("🛑 Sending test note_off message...");
      pianoWS.send(JSON.stringify(testMessages[1]));
      
      setTimeout(() => {
        pianoWS.close();
        console.log("✅ Test complete - check if piano played C4");
      }, 1000);
    }, 2000);
  });
  
  pianoWS.on("message", (data) => {
    console.log("📨 Received from piano server:", data.toString());
  });
  
  pianoWS.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
  });
  
  pianoWS.on("close", () => {
    console.log("🔌 Disconnected from piano server");
  });
}

// Also test if the MCP server is responding to stdio
async function testMCPServerStdio() {
  console.log("\n🎹 Testing MCP Server STDIO");
  console.log("=" .repeat(40));
  
  const { spawn } = await import("child_process");
  
  const mcpProcess = spawn("node", ["dist/simple-piano-mcp.js"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, MCP_PORT: "3000" }
  });
  
  let output = "";
  
  mcpProcess.stdout.on("data", (data) => {
    output += data.toString();
    console.log("📤 MCP stdout:", data.toString().trim());
  });
  
  mcpProcess.stderr.on("data", (data) => {
    console.log("🔍 MCP stderr:", data.toString().trim());
  });
  
  // Send MCP initialization
  const initMessage = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  }) + "\n";
  
  console.log("📨 Sending MCP initialize...");
  mcpProcess.stdin.write(initMessage);
  
  setTimeout(() => {
    // Send list tools request
    const listToolsMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list"
    }) + "\n";
    
    console.log("📨 Sending list tools...");
    mcpProcess.stdin.write(listToolsMessage);
  }, 1000);
  
  setTimeout(() => {
    // Send play note tool call
    const playNoteMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "play_piano_note",
        arguments: {
          note: "C4",
          velocity: 80,
          duration: 2000
        }
      }
    }) + "\n";
    
    console.log("📨 Sending play_piano_note...");
    mcpProcess.stdin.write(playNoteMessage);
  }, 2000);
  
  setTimeout(() => {
    mcpProcess.kill();
    console.log("✅ MCP test complete");
  }, 5000);
}

// Run both tests
console.log("🧪 Running Piano MCP Tests\n");

testDirectMCPConnection().then(() => {
  setTimeout(() => {
    testMCPServerStdio();
  }, 3000);
});
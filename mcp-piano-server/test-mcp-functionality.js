#!/usr/bin/env node

/**
 * Test Script - Mimics LLM calling MCP server to play piano notes
 * This script simulates how an AI model would use the MCP tools
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMCPFunctionality() {
  console.log("🎹 Testing MCP Piano Functionality");
  console.log("=" .repeat(50));
  
  console.log("\n📋 This test will:");
  console.log("1. Simulate an LLM calling MCP tools");
  console.log("2. Play 5 different piano notes");
  console.log("3. Verify WebSocket communication");
  console.log("\n⚠️ IMPORTANT: Make sure the piano web server is running!");
  console.log("   Run: npm run web-server (in another terminal)");
  console.log("   Open: http://localhost:3000 (in browser)");
  
  await wait(3000);
  
  // Test sequence - 5 notes that form a simple melody
  const testNotes = [
    { note: "C4", velocity: 80, duration: 1000, description: "Middle C" },
    { note: "E4", velocity: 90, duration: 800, description: "E above middle C" },
    { note: "G4", velocity: 85, duration: 800, description: "G above middle C" },
    { note: "C5", velocity: 95, duration: 1200, description: "High C" },
    { note: "G4", velocity: 75, duration: 1500, description: "G above middle C (longer)" }
  ];
  
  console.log("\n🎵 Starting note sequence...");
  
  for (let i = 0; i < testNotes.length; i++) {
    const noteInfo = testNotes[i];
    console.log(`\n[${i + 1}/5] 🎼 Playing: ${noteInfo.description}`);
    console.log(`   Note: ${noteInfo.note}, Velocity: ${noteInfo.velocity}, Duration: ${noteInfo.duration}ms`);
    
    try {
      // Simulate MCP tool call by using our test client
      const result = await callMCPTool("play_piano_note", {
        note: noteInfo.note,
        velocity: noteInfo.velocity,
        duration: noteInfo.duration
      });
      
      console.log(`   ✅ Result: ${result}`);
      
      // Wait for note to play plus a small gap
      await wait(noteInfo.duration + 200);
      
    } catch (error) {
      console.error(`   ❌ Error playing ${noteInfo.note}:`, error.message);
    }
  }
  
  console.log("\n🎵 Testing 'get_piano_info' tool...");
  try {
    const info = await callMCPTool("get_piano_info", {});
    console.log("✅ Piano info retrieved successfully");
  } catch (error) {
    console.error("❌ Error getting piano info:", error.message);
  }
  
  console.log("\n🛑 Testing 'stop_all_piano_notes' tool...");
  try {
    const result = await callMCPTool("stop_all_piano_notes", {});
    console.log("✅ All notes stopped successfully");
  } catch (error) {
    console.error("❌ Error stopping notes:", error.message);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("🎯 Test Complete!");
  console.log("\n📊 Expected Results:");
  console.log("- You should have heard 5 piano notes in the browser");
  console.log("- Piano keys should have been visually pressed");
  console.log("- MCP server should show successful WebSocket messages");
  console.log("- No connection errors should have occurred");
}

/**
 * Call an MCP tool using our test client
 */
function callMCPTool(toolName, args) {
  return new Promise((resolve, reject) => {
    const mcpProcess = spawn("node", [
      join(__dirname, "dist/test-client.js"),
      join(__dirname, "dist/simple-piano-mcp.js")
    ], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    
    let output = "";
    let errorOutput = "";
    
    mcpProcess.stdout.on("data", (data) => {
      output += data.toString();
    });
    
    mcpProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    
    mcpProcess.on("close", (code) => {
      if (code === 0) {
        // Extract the result from the output
        const lines = output.split('\n');
        const resultLine = lines.find(line => line.includes('🎹') || line.includes('🛑') || line.includes('📋'));
        resolve(resultLine || "Command executed successfully");
      } else {
        reject(new Error(`MCP tool failed with code ${code}: ${errorOutput}`));
      }
    });
    
    mcpProcess.on("error", (error) => {
      reject(new Error(`Failed to spawn MCP process: ${error.message}`));
    });
    
    // Send the tool command based on tool name
    let command = "";
    switch (toolName) {
      case "play_piano_note":
        command = `play ${args.note} ${args.velocity} ${args.duration}\n`;
        break;
      case "stop_all_piano_notes":
        command = "stop-all\n";
        break;
      case "get_piano_info":
        command = "info\n";
        break;
      default:
        command = "quit\n";
    }
    
    mcpProcess.stdin.write(command);
    mcpProcess.stdin.write("quit\n");
    mcpProcess.stdin.end();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      mcpProcess.kill();
      reject(new Error("MCP tool call timed out"));
    }, 10000);
  });
}

// Run the test
testMCPFunctionality().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Custom Piano Test - Create your own note sequences
 */

import { spawn } from "child_process";

async function playCustomSequence() {
  console.log("🎼 Playing Custom Note Sequence");
  
  // Your custom notes here
  const notes = [
    { note: "C4", velocity: 80, duration: 1000 },
    { note: "D4", velocity: 85, duration: 800 },
    { note: "E4", velocity: 90, duration: 800 },
    { note: "F4", velocity: 85, duration: 800 },
    { note: "G4", velocity: 80, duration: 1200 },
  ];
  
  for (const noteInfo of notes) {
    console.log(`🎵 Playing ${noteInfo.note}...`);
    
    const testProcess = spawn("node", [
      "dist/test-client.js", 
      "dist/simple-piano-mcp.js"
    ], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, MCP_PORT: "3000" }
    });
    
    // Send the play command
    testProcess.stdin.write(`play ${noteInfo.note} ${noteInfo.velocity} ${noteInfo.duration}\n`);
    testProcess.stdin.write("quit\n");
    testProcess.stdin.end();
    
    // Wait for note to finish
    await new Promise(resolve => {
      testProcess.on("close", resolve);
      setTimeout(resolve, 5000); // Timeout after 5s
    });
    
    // Small gap between notes
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log("✅ Custom sequence complete!");
}

playCustomSequence();
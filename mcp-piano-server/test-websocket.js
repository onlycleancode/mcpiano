#!/usr/bin/env node

/**
 * Simple WebSocket test for Piano State Synchronization
 */

const WebSocket = require("ws");

class TestClient {
  constructor(name, serverUrl = "ws://localhost:3001") {
    this.name = name;
    this.serverUrl = serverUrl;
    this.ws = null;
    this.clientId = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`[${this.name}] Connecting...`);

      this.ws = new WebSocket(this.serverUrl);

      this.ws.on("open", () => {
        console.log(`[${this.name}] ✅ Connected`);
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error(`[${this.name}] ❌ Parse error:`, error);
        }
      });

      this.ws.on("error", (error) => {
        console.error(`[${this.name}] ❌ Error:`, error);
        reject(error);
      });
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case "connection-established":
        this.clientId = message.data.clientId;
        console.log(`[${this.name}] 🆔 Client ID: ${this.clientId}`);
        break;

      case "state_sync":
        console.log(
          `[${this.name}] 🔄 State sync: ${message.activeNotes.length} notes, ${message.activeClientCount} clients`
        );
        break;

      case "note_on":
        console.log(`[${this.name}] 🎵 Remote Note ON: ${message.midiNumber}`);
        break;

      case "note_off":
        console.log(`[${this.name}] 🎵 Remote Note OFF: ${message.midiNumber}`);
        break;
    }
  }

  sendNoteOn(midiNumber, velocity = 64) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: "note_on",
        midiNumber,
        velocity,
        timestamp: Date.now(),
        source: "ui",
      };
      this.ws.send(JSON.stringify(message));
      console.log(`[${this.name}] 📤 Note ON: ${midiNumber}`);
      return true;
    }
    return false;
  }

  sendNoteOff(midiNumber) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: "note_off",
        midiNumber,
        velocity: 0,
        timestamp: Date.now(),
        source: "ui",
      };
      this.ws.send(JSON.stringify(message));
      console.log(`[${this.name}] 📤 Note OFF: ${midiNumber}`);
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("🎹 Testing Piano State Synchronization\n");

  const client1 = new TestClient("Client1");
  const client2 = new TestClient("Client2");

  try {
    await client1.connect();
    await wait(500);
    await client2.connect();
    await wait(1000);

    console.log("\n📋 Testing note synchronization...");
    client1.sendNoteOn(60); // C4
    await wait(500);
    client1.sendNoteOn(64); // E4
    await wait(1000);

    client2.sendNoteOn(67); // G4
    await wait(500);
    client1.sendNoteOff(60);
    await wait(1000);

    console.log("\n✅ Tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    client1.disconnect();
    client2.disconnect();

    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

runTests().catch(console.error);

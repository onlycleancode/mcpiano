/**
 * MCP Piano Server - Static Server with Piano API
 * Serves static files and provides piano layout data via REST API
 */

import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket as WSWebSocket } from "ws";
import { createServer, Server } from "http";
import { Piano } from "./models/piano.js";
import { SERVER_CONFIG } from "./config/index.js";
import {
  PianoWebSocket,
  PianoWebSocketMessage,
  WebSocketClientStatus,
} from "./types/index.js";
import { PianoStateManager } from "./utils/piano-state-manager.js";
import { MessageType, MessageSerializer } from "./types/messages.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Static server class for serving piano interface and API
 */
class PianoStaticServer {
  private app: express.Application;
  private piano: Piano;
  private webSocketManager: WebSocketManager;

  constructor() {
    this.app = express();
    this.piano = new Piano();
    this.webSocketManager = new WebSocketManager();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS for local development
    this.app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:8080",
          "http://127.0.0.1:8080",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // Parse JSON bodies
    this.app.use(express.json());

    // Serve static files from public directory
    const publicPath = path.join(__dirname, "..", "public");
    this.app.use(
      express.static(publicPath, {
        index: "index.html",
        setHeaders: (res, path) => {
          // Set cache headers for static assets
          if (path.endsWith(".css") || path.endsWith(".js")) {
            res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hour
          } else if (path.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache"); // Always check for updates
          }
        },
      })
    );

    console.log(`📁 Serving static files from: ${publicPath}`);
  }

  /**
   * Configure API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/api/health", (_req: Request, res: Response) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        server: SERVER_CONFIG.name,
        version: SERVER_CONFIG.version,
      });
    });

    // Piano layout endpoint - returns all 88 piano keys with layout data
    this.app.get("/api/piano-layout", (_req: Request, res: Response) => {
      try {
        const allKeys = this.piano.getAllKeys();
        const statistics = this.piano.getStatistics();

        // Transform keys for frontend consumption
        const layoutData = {
          keys: allKeys.map((key) => ({
            noteNumber: key.noteNumber,
            noteName: key.noteName,
            frequency: key.frequency,
            color: key.color,
            octave: key.octave,
            position: key.position,
          })),
          statistics: {
            totalKeys: statistics.totalKeys,
            whiteKeys: statistics.whiteKeys,
            blackKeys: statistics.blackKeys,
            octaves: statistics.octaves,
            frequencyRange: statistics.frequencyRange,
          },
          range: {
            min: allKeys[0],
            max: allKeys[allKeys.length - 1],
          },
        };

        res.json(layoutData);
        console.log(`🎹 Piano layout data served (${allKeys.length} keys)`);
      } catch (error) {
        console.error("❌ Error serving piano layout:", error);
        res.status(500).json({
          error: "Failed to generate piano layout",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Piano key lookup endpoint - get specific key by note name or MIDI number
    this.app.get(
      "/api/piano-key/:identifier",
      (req: Request, res: Response): void => {
        try {
          const identifier = req.params.identifier;

          if (!identifier) {
            res.status(400).json({
              error: "Missing identifier",
              message: "Piano key identifier is required",
            });
            return;
          }

          // Try to parse as number first, then as string
          const noteInput = isNaN(Number(identifier))
            ? identifier
            : Number(identifier);
          const key = this.piano.getKey(noteInput);

          if (!key) {
            res.status(404).json({
              error: "Key not found",
              message: `No piano key found for identifier: ${identifier}`,
            });
            return;
          }

          res.json({
            key: {
              noteNumber: key.noteNumber,
              noteName: key.noteName,
              frequency: key.frequency,
              color: key.color,
              octave: key.octave,
              position: key.position,
            },
          });

          console.log(
            `🎵 Piano key served: ${key.noteName} (${key.noteNumber})`
          );
        } catch (error) {
          console.error("❌ Error serving piano key:", error);
          res.status(500).json({
            error: "Failed to get piano key",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    // Piano keys by octave endpoint
    this.app.get(
      "/api/piano-octave/:octave",
      (req: Request, res: Response): void => {
        try {
          const octaveParam = req.params.octave;

          if (!octaveParam) {
            res.status(400).json({
              error: "Missing octave",
              message: "Octave parameter is required",
            });
            return;
          }

          const octave = parseInt(octaveParam);

          if (isNaN(octave) || octave < 0 || octave > 8) {
            res.status(400).json({
              error: "Invalid octave",
              message: "Octave must be a number between 0 and 8",
            });
            return;
          }

          const octaveKeys = this.piano.getKeysInOctave(octave);

          res.json({
            octave,
            keys: octaveKeys.map((key) => ({
              noteNumber: key.noteNumber,
              noteName: key.noteName,
              frequency: key.frequency,
              color: key.color,
              octave: key.octave,
              position: key.position,
            })),
          });

          console.log(
            `🎼 Octave ${octave} keys served (${octaveKeys.length} keys)`
          );
        } catch (error) {
          console.error("❌ Error serving octave keys:", error);
          res.status(500).json({
            error: "Failed to get octave keys",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    // WebSocket client status endpoint
    this.app.get("/api/websocket/clients", (_req: Request, res: Response) => {
      try {
        const clientStatuses = this.webSocketManager.getClientStatuses();

        res.json({
          totalClients: clientStatuses.length,
          clients: clientStatuses,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `🔌 WebSocket client statuses served (${clientStatuses.length} clients)`
        );
      } catch (error) {
        console.error("❌ Error serving WebSocket client statuses:", error);
        res.status(500).json({
          error: "Failed to get WebSocket client statuses",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Catch-all route for SPA - serve index.html for any non-API routes
    this.app.get("*", (req, res) => {
      // Only serve index.html for non-API routes
      if (!req.path.startsWith("/api/")) {
        const indexPath = path.join(__dirname, "..", "public", "index.html");
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          error: "API endpoint not found",
          message: `The API endpoint ${req.path} does not exist`,
        });
      }
    });
  }

  /**
   * Start the static server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server using Express app
        const httpServer = createServer(this.app);

        // Initialize WebSocket server on the same HTTP server
        this.webSocketManager.initialize(httpServer);

        // Start the HTTP server with WebSocket support
        httpServer.listen(SERVER_CONFIG.port, () => {
          console.log("🎹 MCP Piano Static Server started successfully");
          console.log(
            `🌐 Server running at: http://localhost:${SERVER_CONFIG.port}`
          );
          console.log(
            `🔌 WebSocket server available at: ws://localhost:${SERVER_CONFIG.port}`
          );
          console.log(`📁 Serving static files from public/`);
          console.log(`🔧 Environment: ${SERVER_CONFIG.nodeEnv}`);
          console.log("🎵 Available API endpoints:");
          console.log("   • GET /api/health - Server health check");
          console.log(
            "   • GET /api/piano-layout - Complete 88-key piano layout"
          );
          console.log(
            "   • GET /api/piano-key/:identifier - Get specific piano key"
          );
          console.log(
            "   • GET /api/piano-octave/:octave - Get keys in specific octave"
          );
          console.log(
            "   • GET /api/websocket/clients - Get WebSocket client statuses"
          );
          console.log("🔌 WebSocket Features:");
          console.log("   • Real-time piano key press/release events");
          console.log("   • Chord and progression broadcasting");
          console.log("   • Connection status monitoring");
          console.log("   • Automatic heartbeat/ping-pong");
          console.log("✅ Ready to serve piano interface!");

          resolve();
        });

        // Handle server errors
        httpServer.on("error", (error) => {
          console.error("❌ Server error:", error);
          reject(error);
        });
      } catch (error) {
        console.error("❌ Failed to start server:", error);
        reject(error);
      }
    });
  }

  /**
   * Gracefully shutdown the server
   */
  public async shutdown(): Promise<void> {
    console.log("🛑 Shutting down Piano Server...");
    this.webSocketManager.shutdown();
    console.log("✅ Piano Server shutdown complete");
  }
}

/**
 * WebSocket Manager for handling real-time piano communication
 */
class WebSocketManager {
  private clients: Map<string, PianoWebSocket>;
  private heartbeatInterval: NodeJS.Timeout | null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private pianoStateManager: PianoStateManager;

  constructor() {
    this.clients = new Map();
    this.heartbeatInterval = null;
    this.pianoStateManager = new PianoStateManager("latest_wins");
  }

  /**
   * Initialize WebSocket server and start heartbeat monitoring
   */
  public initialize(server: Server): WebSocketServer {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws: WSWebSocket) => {
      this.handleConnection(ws);
    });

    // Start heartbeat monitoring
    this.startHeartbeat();

    console.log("🔌 WebSocket server initialized");
    return wss;
  }

  /**
   * Handle new client connection with enhanced state synchronization
   */
  public handleConnection(ws: WSWebSocket): void {
    const clientId = this.generateClientId();
    const client: PianoWebSocket = {
      id: clientId,
      ws: ws,
      isAlive: true,
    };

    // Store client connection
    this.clients.set(clientId, client);

    // Update client count in state manager
    this.pianoStateManager.updateClientCount(this.clients.size);

    console.log(
      `🟢 Client connected: ${clientId} (Total: ${this.clients.size})`
    );

    // Set up WebSocket event handlers
    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error(`❌ Error parsing message from ${clientId}:`, error);
        this.sendToClient(clientId, {
          type: "error",
          timestamp: Date.now(),
          data: { message: "Invalid message format" },
        });
      }
    });

    ws.on("pong", () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });

    ws.on("close", () => {
      this.handleDisconnection(clientId);
    });

    ws.on("error", (error) => {
      console.error(`❌ WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    // Send welcome message with enhanced connection info
    this.sendToClient(clientId, {
      type: "connection-established",
      timestamp: Date.now(),
      data: {
        clientId: clientId,
        serverInfo: {
          name: SERVER_CONFIG.name,
          version: SERVER_CONFIG.version,
        },
        stateInfo: this.pianoStateManager.getStateStatistics(),
      },
    });

    // Send comprehensive state synchronization message to new client
    this.sendStateSyncToClient(clientId);

    // Notify other clients about new connection
    this.broadcastToOthers(clientId, {
      type: "client-connected",
      timestamp: Date.now(),
      data: {
        clientId,
        totalClients: this.clients.size,
      },
    });
  }

  /**
   * Handle incoming messages from clients
   */
  public handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`⚠️ Message from unknown client: ${clientId}`);
      return;
    }

    console.log(`📨 Message from ${clientId}:`, message.type);

    // Handle different message types
    switch (message.type) {
      case "ping":
        this.sendToClient(clientId, {
          type: "pong",
          timestamp: Date.now(),
          data: { originalTimestamp: message.timestamp },
        });
        break;

      case MessageType.NOTE_ON:
        // Handle note press - update state and broadcast
        if (this.validateNoteMessage(message)) {
          const noteAdded = this.pianoStateManager.addNote(
            message.midiNumber,
            message.velocity,
            clientId
          );

          if (noteAdded) {
            // Broadcast to all other clients
            this.broadcastToOthers(clientId, message);
            console.log(
              `🎵 Note ON: ${message.midiNumber} (velocity: ${message.velocity})`
            );
          }
        }
        break;

      case MessageType.NOTE_OFF:
        // Handle note release - update state and broadcast
        if (this.validateNoteMessage(message)) {
          const noteRemoved = this.pianoStateManager.removeNote(
            message.midiNumber,
            clientId
          );

          if (noteRemoved) {
            // Broadcast to all other clients
            this.broadcastToOthers(clientId, message);
            console.log(`🎵 Note OFF: ${message.midiNumber}`);
          }
        }
        break;

      case MessageType.CHORD_ON:
        // Handle chord press - update state and broadcast
        if (this.validateChordMessage(message)) {
          let chordAdded = false;

          // Add each note in the chord
          for (const note of message.notes) {
            const noteAdded = this.pianoStateManager.addNote(
              note.midiNumber,
              note.velocity,
              clientId
            );
            if (noteAdded) chordAdded = true;
          }

          if (chordAdded) {
            // Broadcast to all other clients
            this.broadcastToOthers(clientId, message);
            console.log(`🎵 Chord ON: ${message.notes.length} notes`);
          }
        }
        break;

      case MessageType.ALL_NOTES_OFF:
        // Handle all notes off - clear state and broadcast
        this.pianoStateManager.clearAllNotes(clientId);
        this.broadcastToOthers(clientId, message);
        console.log(`🔇 All notes OFF from ${clientId}`);
        break;

      case MessageType.STATE_SYNC:
        // Handle state sync request - send current state
        this.sendStateSyncToClient(clientId);
        break;

      case "state_reconciliation_request":
        // Handle advanced state reconciliation request
        if (message.data && message.data.remoteState) {
          const reconciliationResult =
            this.pianoStateManager.synchronizeFromRemote(
              message.data.remoteState
            );

          // Send reconciliation result back to requesting client
          this.sendToClient(clientId, {
            type: "state_reconciliation_result",
            timestamp: Date.now(),
            data: reconciliationResult,
          });

          // If there were changes, broadcast new state to all clients
          if (
            reconciliationResult.success &&
            (reconciliationResult.notesAdded > 0 ||
              reconciliationResult.notesRemoved > 0)
          ) {
            this.broadcastStateSync();
          }
        }
        break;

      case "priority_client_request":
        // Handle priority client request
        this.pianoStateManager.addPriorityClient(clientId);
        this.sendToClient(clientId, {
          type: "priority_client_granted",
          timestamp: Date.now(),
          data: { clientId, priority: true },
        });
        break;

      case "client_statistics_request":
        // Send detailed statistics about the current state
        const statistics = this.pianoStateManager.getStateStatistics();
        this.sendToClient(clientId, {
          type: "client_statistics_response",
          timestamp: Date.now(),
          data: {
            ...statistics,
            connectedClients: this.getClientStatuses(),
          },
        });
        break;

      case MessageType.HEARTBEAT:
        // Handle heartbeat/ping
        this.sendToClient(clientId, {
          type: MessageType.HEARTBEAT,
          timestamp: Date.now(),
          data: { originalTimestamp: message.timestamp },
        });
        break;

      // Legacy message types for backward compatibility
      case "piano-key-press":
      case "piano-key-release":
        // Broadcast piano key events to all other clients
        this.broadcastToOthers(clientId, message);
        break;

      case "piano-chord-play":
      case "piano-progression-play":
        // Broadcast musical events to all other clients
        this.broadcastToOthers(clientId, message);
        break;

      case "piano-status-request":
        // Send current piano status to requesting client
        const currentState = this.pianoStateManager.getCurrentState();
        this.sendToClient(clientId, {
          type: "piano-status",
          timestamp: Date.now(),
          data: {
            isPlaying: currentState.activeNotes.length > 0,
            currentTempo: 120,
            activeNotes: currentState.activeNotes.map(
              (note) => note.midiNumber
            ),
            clientCount: currentState.activeClientCount,
            stateVersion: currentState.stateVersion,
          },
        });
        break;

      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
        this.sendToClient(clientId, {
          type: "error",
          timestamp: Date.now(),
          data: { message: `Unknown message type: ${message.type}` },
        });
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(message: PianoWebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WSWebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`❌ Failed to send message to ${clientId}:`, error);
          this.handleDisconnection(clientId);
        }
      }
    });

    console.log(`📡 Broadcasted ${message.type} to ${sentCount} clients`);
  }

  /**
   * Broadcast message to all clients except the sender
   */
  public broadcastToOthers(
    senderClientId: string,
    message: PianoWebSocketMessage
  ): void {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (
        clientId !== senderClientId &&
        client.ws.readyState === WSWebSocket.OPEN
      ) {
        try {
          client.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`❌ Failed to send message to ${clientId}:`, error);
          this.handleDisconnection(clientId);
        }
      }
    });

    console.log(`📡 Broadcasted ${message.type} to ${sentCount} other clients`);
  }

  /**
   * Send message to specific client
   */
  public sendToClient(
    clientId: string,
    message: PianoWebSocketMessage
  ): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WSWebSocket.OPEN) {
      console.warn(
        `⚠️ Cannot send message to ${clientId}: client not connected`
      );
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to ${clientId}:`, error);
      this.handleDisconnection(clientId);
      return false;
    }
  }

  /**
   * Get status of all connected clients
   */
  public getClientStatuses(): WebSocketClientStatus[] {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      connected: client.ws.readyState === WSWebSocket.OPEN,
      lastPing: Date.now(), // This would be tracked in a real implementation
      lastPong: Date.now(), // This would be tracked in a real implementation
    }));
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Clean up any active notes from this client
      this.pianoStateManager.clearAllNotes(clientId);

      // Remove client from priority list if they were priority
      this.pianoStateManager.removePriorityClient(clientId);

      // Remove client from connections
      this.clients.delete(clientId);

      // Update client count in state manager
      this.pianoStateManager.updateClientCount(this.clients.size);

      console.log(
        `🔴 Client disconnected: ${clientId} (Remaining: ${this.clients.size})`
      );

      // Broadcast state sync to remaining clients after disconnection
      if (this.clients.size > 0) {
        this.broadcastStateSync();
      }

      // Notify other clients about disconnection with enhanced info
      this.broadcast({
        type: "client-disconnected",
        timestamp: Date.now(),
        data: {
          clientId,
          remainingClients: this.clients.size,
          stateInfo: this.pianoStateManager.getStateStatistics(),
        },
      });
    }
  }

  /**
   * Start heartbeat monitoring to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WSWebSocket.OPEN) {
          if (!client.isAlive) {
            // Client didn't respond to previous ping, terminate connection
            console.log(`💀 Terminating unresponsive client: ${clientId}`);
            client.ws.terminate();
            this.handleDisconnection(clientId);
            return;
          }

          // Mark as not alive and send ping
          client.isAlive = false;
          try {
            client.ws.ping();
          } catch (error) {
            console.error(`❌ Failed to ping client ${clientId}:`, error);
            this.handleDisconnection(clientId);
          }
        } else {
          // WebSocket is not open, clean up
          this.handleDisconnection(clientId);
        }
      });
    }, this.HEARTBEAT_INTERVAL);

    console.log(
      `💓 Heartbeat monitoring started (${this.HEARTBEAT_INTERVAL}ms interval)`
    );
  }

  /**
   * Stop heartbeat monitoring
   */
  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log("💓 Heartbeat monitoring stopped");
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up all connections and stop heartbeat
   */
  public shutdown(): void {
    console.log("🛑 Shutting down WebSocket manager...");

    // Stop heartbeat
    this.stopHeartbeat();

    // Close all client connections
    this.clients.forEach((client, _clientId) => {
      if (client.ws.readyState === WSWebSocket.OPEN) {
        client.ws.close(1000, "Server shutting down");
      }
    });

    this.clients.clear();
    console.log("✅ WebSocket manager shutdown complete");
  }

  /**
   * Send enhanced state synchronization message to a specific client
   */
  private sendStateSyncToClient(clientId: string): void {
    const currentState = this.pianoStateManager.getCurrentState();

    const stateSyncMessage = MessageSerializer.createStateSyncMessage(
      currentState.activeNotes.map((note) => ({
        midiNumber: note.midiNumber,
        velocity: note.velocity,
      })),
      currentState.lastUpdateTimestamp,
      currentState.activeClientCount,
      currentState.stateVersion
    );

    // Create enhanced message with additional state information
    const enhancedMessage = {
      ...stateSyncMessage,
      sessionId: currentState.sessionId,
      statistics: this.pianoStateManager.getStateStatistics(),
      connectedClients: this.clients.size,
    };

    const success = this.sendToClient(clientId, enhancedMessage as any);

    if (success) {
      console.log(
        `🔄 Enhanced state sync sent to ${clientId}: ${currentState.activeNotes.length} active notes, version ${currentState.stateVersion}`
      );
    }
  }

  /**
   * Broadcast enhanced state sync message to all clients
   */
  private broadcastStateSync(): void {
    const currentState = this.pianoStateManager.getCurrentState();

    const stateSyncMessage = MessageSerializer.createStateSyncMessage(
      currentState.activeNotes.map((note) => ({
        midiNumber: note.midiNumber,
        velocity: note.velocity,
      })),
      currentState.lastUpdateTimestamp,
      currentState.activeClientCount,
      currentState.stateVersion
    );

    // Create enhanced message with additional state information
    const enhancedMessage = {
      ...stateSyncMessage,
      sessionId: currentState.sessionId,
      statistics: this.pianoStateManager.getStateStatistics(),
      connectedClients: this.clients.size,
    };

    this.broadcast(enhancedMessage as any);
    console.log(
      `🔄 Enhanced state sync broadcasted: ${currentState.activeNotes.length} active notes, version ${currentState.stateVersion}`
    );
  }

  /**
   * Validate note message
   */
  private validateNoteMessage(message: any): boolean {
    return (
      typeof message.midiNumber === "number" &&
      typeof message.velocity === "number" &&
      message.midiNumber >= 0 &&
      message.midiNumber <= 127 &&
      message.velocity >= 0 &&
      message.velocity <= 127
    );
  }

  /**
   * Validate chord message
   */
  private validateChordMessage(message: any): boolean {
    return (
      Array.isArray(message.notes) &&
      message.notes.every(
        (note: any) =>
          typeof note.midiNumber === "number" &&
          typeof note.velocity === "number" &&
          note.midiNumber >= 0 &&
          note.midiNumber <= 127 &&
          note.velocity >= 0 &&
          note.velocity <= 127
      )
    );
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  let server: PianoStaticServer | null = null;

  try {
    server = new PianoStaticServer();
    await server.start();

    // Setup graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(
        `\n🛑 Received ${signal}, shutting down Piano Static Server...`
      );
      if (server) {
        await server.shutdown();
      }
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Failed to start Piano Static Server:", error);
    if (server) {
      await server.shutdown();
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down Piano Static Server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down Piano Static Server...");
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

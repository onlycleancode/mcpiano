/**
 * Simple HTTP Server for Piano API Endpoints
 * Basic implementation to serve piano layout data and health check endpoints
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPianoData } from "./utils/piano-data.js";
import { SERVER_CONFIG } from "./config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple HTTP Server class
 */
export class SimpleHTTPServer {
  private server: http.Server | null = null;

  constructor() {
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  /**
   * Handle HTTP requests
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);

    try {
      // API Routes
      if (pathname === "/api/ping") {
        await this.handlePing(res);
      } else if (pathname === "/api/piano-layout") {
        await this.handlePianoLayout(res);
      } else if (pathname.startsWith("/api/piano-key/")) {
        const midiNote = pathname.split("/").pop();
        await this.handlePianoKey(res, midiNote);
      } else if (pathname === "/api/piano-stats") {
        await this.handlePianoStats(res);
      } else if (pathname === "/" || pathname === "/index.html") {
        await this.serveFile(res, "index.html", "text/html");
      } else if (pathname.startsWith("/js/")) {
        await this.serveFile(
          res,
          pathname.substring(1),
          "application/javascript"
        );
      } else if (pathname.startsWith("/css/")) {
        await this.serveFile(res, pathname.substring(1), "text/css");
      } else if (pathname.startsWith("/assets/")) {
        await this.serveFile(
          res,
          pathname.substring(1),
          "application/octet-stream"
        );
      } else {
        this.send404(res);
      }
    } catch (error) {
      console.error("❌ Request error:", error);
      this.sendError(res, 500, "Internal Server Error");
    }
  }

  /**
   * Handle ping endpoint
   */
  private async handlePing(res: http.ServerResponse): Promise<void> {
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      server: "mcp-piano-server",
      version: SERVER_CONFIG.version,
    };

    this.sendJSON(res, 200, response);
  }

  /**
   * Handle piano layout endpoint
   */
  private async handlePianoLayout(res: http.ServerResponse): Promise<void> {
    try {
      console.log("📡 Serving piano layout data...");

      const pianoData = getPianoData();

      const responseData = {
        totalKeys: pianoData.totalKeys,
        keys: pianoData.keys.map((key) => ({
          noteNumber: key.noteNumber,
          noteName: key.noteName,
          frequency: key.frequency,
          color: key.color,
          octave: key.octave,
          position: key.position,
        })),
        whiteKeys: pianoData.whiteKeys.map((key) => ({
          noteNumber: key.noteNumber,
          noteName: key.noteName,
          frequency: key.frequency,
          octave: key.octave,
          position: key.position,
        })),
        blackKeys: pianoData.blackKeys.map((key) => ({
          noteNumber: key.noteNumber,
          noteName: key.noteName,
          frequency: key.frequency,
          octave: key.octave,
          position: key.position,
        })),
        metadata: {
          range: {
            min: { note: "A0", midi: 21, frequency: 27.5 },
            max: { note: "C8", midi: 108, frequency: 4186.01 },
          },
          counts: {
            total: pianoData.totalKeys,
            white: pianoData.whiteKeys.length,
            black: pianoData.blackKeys.length,
          },
          generatedAt: new Date().toISOString(),
        },
      };

      this.sendJSON(res, 200, responseData);
      console.log("✅ Piano layout data served successfully");
    } catch (error) {
      console.error("❌ Error serving piano layout:", error);
      this.sendJSON(res, 500, {
        error: "Failed to generate piano layout",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle piano key endpoint
   */
  private async handlePianoKey(
    res: http.ServerResponse,
    midiNoteStr?: string
  ): Promise<void> {
    try {
      if (!midiNoteStr) {
        this.sendJSON(res, 400, {
          error: "Missing MIDI note parameter",
          message: "MIDI note parameter is required",
        });
        return;
      }

      const midiNote = parseInt(midiNoteStr, 10);

      if (isNaN(midiNote) || midiNote < 21 || midiNote > 108) {
        this.sendJSON(res, 400, {
          error: "Invalid MIDI note",
          message: "MIDI note must be between 21 (A0) and 108 (C8)",
        });
        return;
      }

      const pianoData = getPianoData();
      const key = pianoData.keys.find((k) => k.noteNumber === midiNote);

      if (!key) {
        this.sendJSON(res, 404, {
          error: "Key not found",
          message: `No key found for MIDI note ${midiNote}`,
        });
        return;
      }

      this.sendJSON(res, 200, {
        noteNumber: key.noteNumber,
        noteName: key.noteName,
        frequency: key.frequency,
        color: key.color,
        octave: key.octave,
        position: key.position,
      });
    } catch (error) {
      console.error("❌ Error serving key info:", error);
      this.sendJSON(res, 500, {
        error: "Failed to get key information",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle piano stats endpoint
   */
  private async handlePianoStats(res: http.ServerResponse): Promise<void> {
    try {
      const pianoData = getPianoData();

      this.sendJSON(res, 200, {
        totalKeys: pianoData.totalKeys,
        whiteKeys: pianoData.whiteKeys.length,
        blackKeys: pianoData.blackKeys.length,
        range: {
          lowest: pianoData.keys[0],
          highest: pianoData.keys[pianoData.keys.length - 1],
        },
        octaves: {
          start: 0,
          end: 8,
          partial: ["A0-B0", "C8"],
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error serving piano stats:", error);
      this.sendJSON(res, 500, {
        error: "Failed to get piano statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Serve static files
   */
  private async serveFile(
    res: http.ServerResponse,
    filePath: string,
    contentType: string
  ): Promise<void> {
    try {
      const fullPath = path.join(__dirname, "..", "public", filePath);

      if (!fs.existsSync(fullPath)) {
        this.send404(res);
        return;
      }

      const content = fs.readFileSync(fullPath);

      res.setHeader("Content-Type", contentType);
      res.writeHead(200);
      res.end(content);
    } catch (error) {
      console.error("❌ Error serving file:", error);
      this.sendError(res, 500, "Failed to serve file");
    }
  }

  /**
   * Send JSON response
   */
  private sendJSON(
    res: http.ServerResponse,
    statusCode: number,
    data: any
  ): void {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(statusCode);
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send 404 response
   */
  private send404(res: http.ServerResponse): void {
    res.setHeader("Content-Type", "text/html");
    res.writeHead(404);
    res.end(`
      <html>
        <head><title>404 - Not Found</title></head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The requested page could not be found.</p>
          <p><a href="/">Go to Piano Interface</a></p>
        </body>
      </html>
    `);
  }

  /**
   * Send error response
   */
  private sendError(
    res: http.ServerResponse,
    statusCode: number,
    message: string
  ): void {
    this.sendJSON(res, statusCode, {
      error: message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error("Server not initialized"));
        return;
      }

      this.server.listen(SERVER_CONFIG.port, () => {
        console.log(
          `🌐 Simple HTTP Server started on port ${SERVER_CONFIG.port}`
        );
        console.log(
          `🎹 Piano interface available at: http://localhost:${SERVER_CONFIG.port}`
        );
        console.log(
          `📡 API endpoints available at: http://localhost:${SERVER_CONFIG.port}/api/`
        );
        resolve();
      });

      this.server.on("error", (error: any) => {
        if (error.code === "EADDRINUSE") {
          console.error(`❌ Port ${SERVER_CONFIG.port} is already in use`);
        } else {
          console.error("❌ Server error:", error);
        }
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("🛑 Simple HTTP Server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default SimpleHTTPServer;

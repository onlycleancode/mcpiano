/**
 * HTTP Server for Piano API Endpoints
 * Serves piano layout data and health check endpoints
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getPianoData } from "./utils/piano-data.js";
import { SERVER_CONFIG } from "./config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * HTTP Server class for serving piano API endpoints
 */
export class PianoHTTPServer {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS for all routes
    this.app.use(
      cors({
        origin: true, // Allow all origins in development
        credentials: true,
      })
    );

    // Parse JSON bodies
    this.app.use(express.json());

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files from public directory
    const publicPath = path.join(__dirname, "..", "public");
    this.app.use(express.static(publicPath));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/api/ping", (req: Request, res: Response) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        server: "mcp-piano-server",
        version: SERVER_CONFIG.version,
      });
    });

    // Piano layout endpoint
    this.app.get("/api/piano-layout", (req: Request, res: Response) => {
      try {
        console.log("📡 Serving piano layout data...");

        // Get piano data from utility function
        const pianoData = getPianoData();

        // Transform data for client consumption
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

        res.json(responseData);

        console.log("✅ Piano layout data served successfully");
      } catch (error) {
        console.error("❌ Error serving piano layout:", error);
        res.status(500).json({
          error: "Failed to generate piano layout",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Piano key info endpoint (for individual key details)
    this.app.get("/api/piano-key/:midiNote", (req: Request, res: Response) => {
      try {
        const midiNoteParam = req.params.midiNote;
        if (!midiNoteParam) {
          return res.status(400).json({
            error: "Missing MIDI note parameter",
            message: "MIDI note parameter is required",
          });
        }

        const midiNote = parseInt(midiNoteParam, 10);

        if (isNaN(midiNote) || midiNote < 21 || midiNote > 108) {
          return res.status(400).json({
            error: "Invalid MIDI note",
            message: "MIDI note must be between 21 (A0) and 108 (C8)",
          });
        }

        const pianoData = getPianoData();
        const key = pianoData.keys.find((k) => k.noteNumber === midiNote);

        if (!key) {
          return res.status(404).json({
            error: "Key not found",
            message: `No key found for MIDI note ${midiNote}`,
          });
        }

        return res.json({
          noteNumber: key.noteNumber,
          noteName: key.noteName,
          frequency: key.frequency,
          color: key.color,
          octave: key.octave,
          position: key.position,
        });
      } catch (error) {
        console.error("❌ Error serving key info:", error);
        return res.status(500).json({
          error: "Failed to get key information",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Piano statistics endpoint
    this.app.get("/api/piano-stats", (req: Request, res: Response) => {
      try {
        const pianoData = getPianoData();

        res.json({
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
            partial: ["A0-B0", "C8"], // Partial octaves at the ends
          },
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error serving piano stats:", error);
        res.status(500).json({
          error: "Failed to get piano statistics",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Serve the main piano interface at root
    this.app.get("/", (req: Request, res: Response) => {
      const indexPath = path.join(__dirname, "..", "public", "index.html");
      res.sendFile(indexPath);
    });

    // 404 handler for API routes
    this.app.use(
      "/api/*",
      (req: Request, res: Response, next: NextFunction) => {
        res.status(404).json({
          error: "API endpoint not found",
          message: `The endpoint ${req.path} does not exist`,
          availableEndpoints: [
            "/api/ping",
            "/api/piano-layout",
            "/api/piano-key/:midiNote",
            "/api/piano-stats",
          ],
        });
      }
    );

    // General 404 handler
    this.app.use("*", (req: Request, res: Response, next: NextFunction) => {
      res.status(404).send(`
        <html>
          <head><title>404 - Not Found</title></head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The requested page could not be found.</p>
            <p><a href="/">Go to Piano Interface</a></p>
          </body>
        </html>
      `);
    });

    // Error handling middleware
    this.app.use(
      (error: any, req: Request, res: Response, next: NextFunction) => {
        console.error("❌ Server error:", error);

        res.status(500).json({
          error: "Internal server error",
          message:
            SERVER_CONFIG.nodeEnv === "development"
              ? error.message
              : "Something went wrong",
        });
      }
    );
  }

  /**
   * Start the HTTP server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(SERVER_CONFIG.port, () => {
          console.log(
            `🌐 Piano HTTP Server started on port ${SERVER_CONFIG.port}`
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
      } catch (error) {
        console.error("❌ Failed to start HTTP server:", error);
        reject(error);
      }
    });
  }

  /**
   * Stop the HTTP server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("🛑 Piano HTTP Server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Export for use in other modules
export default PianoHTTPServer;

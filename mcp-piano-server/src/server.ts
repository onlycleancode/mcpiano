/**
 * MCP Piano Server - Static Server with Piano API
 * Serves static files and provides piano layout data via REST API
 */

import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Piano } from "./models/piano.js";
import { SERVER_CONFIG } from "./config/index.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Static server class for serving piano interface and API
 */
class PianoStaticServer {
  private app: express.Application;
  private piano: Piano;

  constructor() {
    this.app = express();
    this.piano = new Piano();
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
        const server = this.app.listen(SERVER_CONFIG.port, () => {
          console.log("🎹 MCP Piano Static Server started successfully");
          console.log(
            `🌐 Server running at: http://localhost:${SERVER_CONFIG.port}`
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
          console.log("✅ Ready to serve piano interface!");

          resolve();
        });

        // Handle server errors
        server.on("error", (error) => {
          console.error("❌ Server error:", error);
          reject(error);
        });
      } catch (error) {
        console.error("❌ Failed to start server:", error);
        reject(error);
      }
    });
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    const server = new PianoStaticServer();
    await server.start();
  } catch (error) {
    console.error("❌ Failed to start Piano Static Server:", error);
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

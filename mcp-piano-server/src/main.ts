/**
 * Main entry point for MCP Piano Server
 * Starts both the MCP server and HTTP server
 */

import { SimpleHTTPServer } from "./simple-server.js";
import { SERVER_CONFIG } from "./config/index.js";

/**
 * Main application class
 */
class MCPPianoApplication {
  private httpServer: SimpleHTTPServer;

  constructor() {
    this.httpServer = new SimpleHTTPServer();
  }

  /**
   * Start the application
   */
  public async start(): Promise<void> {
    try {
      console.log("🎹 Starting MCP Piano Application...");
      console.log(`🔧 Environment: ${SERVER_CONFIG.nodeEnv}`);
      console.log(`📡 Port: ${SERVER_CONFIG.port}`);

      // Start HTTP server for web interface and API
      await this.httpServer.start();

      console.log("🚀 MCP Piano Application started successfully");
      console.log("🎵 Ready to serve piano interface and API endpoints");
    } catch (error) {
      console.error("❌ Failed to start application:", error);
      throw error;
    }
  }

  /**
   * Stop the application
   */
  public async stop(): Promise<void> {
    try {
      console.log("🛑 Stopping MCP Piano Application...");

      await this.httpServer.stop();

      console.log("✅ MCP Piano Application stopped successfully");
    } catch (error) {
      console.error("❌ Error stopping application:", error);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const app = new MCPPianoApplication();

  try {
    await app.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      try {
        await app.stop();
        process.exit(0);
      } catch (error) {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // Keep the process running
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught exception:", error);
      shutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
      shutdown("unhandledRejection");
    });
  } catch (error) {
    console.error("❌ Failed to start MCP Piano Application:", error);
    process.exit(1);
  }
}

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Unhandled error in main:", error);
    process.exit(1);
  });
}

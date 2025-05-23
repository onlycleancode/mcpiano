/**
 * MCP Piano Server
 * Main entry point for the Model Context Protocol Piano server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
  SERVER_CONFIG,
  getServerUrl,
  getAvailableEndpoints,
} from "./config/index.js";

/**
 * Main server class for the MCP Piano Server
 */
class MCPPianoServer {
  private server: Server;

  constructor() {
    // Initialize the MCP server with metadata from config
    this.server = new Server({
      name: SERVER_CONFIG.name,
      version: SERVER_CONFIG.version,
    });

    this.setupProtocolHandlers();
    this.setupToolHandlers();
  }

  /**
   * Set up MCP protocol handlers
   */
  private setupProtocolHandlers(): void {
    // Handle initialized notification - log successful connection
    this.server.oninitialized = () => {
      console.log("✅ MCP Piano Server initialized successfully");
      console.log(`🎹 Piano server ready to handle music theory operations`);
      this.logServerInfo();
    };
  }

  /**
   * Set up tool request handlers
   */
  private setupToolHandlers(): void {
    // Handle tools/list request - return empty tools array for now
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log("📋 Client requested tools list");
      return {
        tools: this.getAvailableTools(),
      };
    });

    // Handle tool execution requests
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        const { name } = request.params;
        console.log(`🔧 Tool execution requested: ${name}`);

        switch (name) {
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      }
    );
  }

  /**
   * Get list of available tools (empty for now)
   */
  private getAvailableTools(): Tool[] {
    return [
      // Piano tools will be defined here in later subtasks
    ];
  }

  /**
   * Log server information and available endpoints
   */
  private logServerInfo(): void {
    console.log(`📡 Server URL: ${getServerUrl()}`);
    console.log(`⚙️  Environment: ${SERVER_CONFIG.nodeEnv}`);
    console.log(`🔧 Available endpoints:`);

    const endpoints = getAvailableEndpoints();
    endpoints.forEach((endpoint) => {
      console.log(`   • ${endpoint}`);
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      console.log("🎹 Starting MCP Piano Server...");
      console.log(`🔌 Environment: ${SERVER_CONFIG.nodeEnv}`);
      console.log(`📡 Port: ${SERVER_CONFIG.port}`);

      // Create stdio transport for MCP communication
      const transport = new StdioServerTransport();

      // Connect the server to transport
      await this.server.connect(transport);

      console.log("🚀 MCP Piano Server started successfully");
      console.log("🎵 Ready to serve piano and music theory operations");
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    const server = new MCPPianoServer();
    await server.start();
  } catch (error) {
    console.error("❌ Failed to start MCP Piano Server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down MCP Piano Server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down MCP Piano Server...");
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

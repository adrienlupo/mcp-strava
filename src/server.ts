import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Creates and configures the MCP server with tools
 */
export function createMcpServer() {
  const server = new McpServer({
    name: "strava-mcp-server",
    version: "1.0.0",
  });

  // Register ping test tool
  server.registerTool(
    "ping",
    {
      description: "A simple test tool that verifies the server is running",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text" as const,
          text: "Strava MCP server is running successfully.",
        },
      ],
    })
  );

  return server;
}

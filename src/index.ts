#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import { TokenManager } from "./auth/tokenManager.js";
import { StravaClient } from "./strava/client.js";
import { config } from "./config.js";

// Create the MCP server with stdio transport for Claude Desktop
const tokenManager = new TokenManager(config.tokenFilePath);
const stravaClient = new StravaClient(tokenManager);
const mcpServer = createMcpServer(stravaClient);

// Use stdio transport
const transport = new StdioServerTransport();

// Connect and run
await mcpServer.connect(transport);

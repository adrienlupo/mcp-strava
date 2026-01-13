#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import { TokenManager } from "./auth/tokenManager.js";
import { StravaClient } from "./strava/client.js";
import { config } from "./config.js";

const tokenManager = new TokenManager(config.tokenFilePath);
const stravaClient = new StravaClient(tokenManager);
const mcpServer = createMcpServer(stravaClient);

const transport = new StdioServerTransport();

await mcpServer.connect(transport);

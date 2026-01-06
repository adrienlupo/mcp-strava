import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "src/server.js";
import { config } from "src/config.js";
import authRoutes from "src/auth/routes.js";

const app = express();

app.use(cors());
app.use(express.json());

const mcpServer = createMcpServer();

const transport = new StreamableHTTPServerTransport();

await mcpServer.connect(transport);

app.use("/auth", authRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", server: "strava-mcp-server" });
});

// MCP endpoint - handles both GET (SSE stream) and POST (messages)
app.all("/mcp", async (req, res) => {
  await transport.handleRequest(req, res);
});

const PORT = parseInt(config.port);

app.listen(PORT, () => {
  console.log(`Strava MCP Server running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`OAuth: http://localhost:${PORT}/auth/strava`);
  console.log(`Auth status: http://localhost:${PORT}/auth/status`);
});

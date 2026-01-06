import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "server.js";
import { config } from "config.js";

const app = express();

app.use(cors());
app.use(express.json());

const mcpServer = createMcpServer();

const transport = new StreamableHTTPServerTransport();

await mcpServer.connect(transport);

app.get("/health", (req, res) => {
  res.json({ status: "ok", server: "strava-mcp-server" });
});

// MCP endpoint - handles both GET (SSE stream) and POST (messages)
app.all("/mcp", async (req, res) => {
  await transport.handleRequest(req, res);
});

const PORT = parseInt(config.port);

app.listen(PORT, () => {});

#!/usr/bin/env node
import express from "express";
import { getAuthorizationUrl, exchangeCodeForTokens } from "./auth/oauth.js";
import { TokenManager } from "./auth/tokenManager.js";
import { config } from "./config.js";

const app = express();
const tokenManager = new TokenManager(config.tokenFilePath);

const PORT = parseInt(config.port);

app.get("/auth/strava", (req, res) => {
  const authUrl = getAuthorizationUrl();
  res.redirect(authUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">❌ Authorization Failed</h1>
          <p>Error: ${error}</p>
          <p><a href="/auth/strava">Try again</a></p>
        </body>
      </html>
    `);
  }

  if (!code || typeof code !== "string") {
    return res.status(400).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">❌ Authorization Failed</h1>
          <p>Authorization code is missing</p>
          <p><a href="/auth/strava">Try again</a></p>
        </body>
      </html>
    `);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    tokenManager.saveTokens(tokens);

    res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #27ae60;">✓ Authorization Successful!</h1>
          <p>You have successfully authorized the Strava MCP server.</p>
          <p>Tokens have been saved to: <code>${config.tokenFilePath}</code></p>
          <hr style="margin: 30px 0;">
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>You can now close this window</li>
            <li>Stop this authorization server (Ctrl+C in the terminal)</li>
            <li>Restart Claude Desktop to use the Strava MCP server</li>
          </ol>
        </body>
      </html>
    `);

    console.log("\n✓ Authorization successful! Tokens saved.");
    console.log(
      "You can now stop this server (Ctrl+C) and restart Claude Desktop.\n"
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">❌ Authorization Failed</h1>
          <p>${(error as Error).message}</p>
          <p><a href="/auth/strava">Try again</a></p>
        </body>
      </html>
    `);
  }
});

app.get("/auth/status", (req, res) => {
  const hasTokens = tokenManager.hasTokens();
  res.send(`
    <html>
      <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
        <h1>Strava MCP Authorization Status</h1>
        ${
          hasTokens
            ? `
            <p style="color: #27ae60;">✓ <strong>Authorized</strong></p>
            <p>Tokens file exists at: <code>${config.tokenFilePath}</code></p>
            <p>You can stop this server and use the MCP server in Claude Desktop.</p>
          `
            : `
            <p style="color: #e74c3c;">✗ <strong>Not Authorized</strong></p>
            <p><a href="/auth/strava" style="display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Authorize with Strava</a></p>
          `
        }
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("\n=== Strava MCP Authorization Server ===\n");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `\n🔐 To authorize with Strava, visit:\n   http://localhost:${PORT}/auth/strava\n`
  );
  console.log(
    `📊 To check authorization status:\n   http://localhost:${PORT}/auth/status\n`
  );
  console.log(
    "After authorization is complete, stop this server (Ctrl+C) and restart Claude Desktop.\n"
  );
});

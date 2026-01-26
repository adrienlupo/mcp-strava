#!/usr/bin/env node
import express from "express";
import { z } from "zod";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  type StravaCredentials,
} from "./auth/oauth.js";
import { TokenManager } from "./auth/tokenManager.js";
import { stateManager } from "./auth/stateManager.js";
import { config } from "./config.js";

const authConfigSchema = z.object({
  stravaClientId: z.string().min(1, "STRAVA_CLIENT_ID is required"),
  stravaClientSecret: z.string().min(1, "STRAVA_CLIENT_SECRET is required"),
  stravaRedirectUri: z.string().url("STRAVA_REDIRECT_URI must be a valid URL"),
});

function loadAuthConfig(): StravaCredentials {
  try {
    const parsed = authConfigSchema.parse({
      stravaClientId: process.env.STRAVA_CLIENT_ID,
      stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
      stravaRedirectUri: process.env.STRAVA_REDIRECT_URI,
    });
    return {
      client_id: parsed.stravaClientId,
      client_secret: parsed.stravaClientSecret,
      redirect_uri: parsed.stravaRedirectUri,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Configuration validation failed:");
      for (const issue of error.issues) {
        console.error(`- ${issue.message}`);
      }
      process.exit(1);
    }
    throw error;
  }
}

const credentials = loadAuthConfig();

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const app = express();
const tokenManager = new TokenManager(config.tokenFilePath);

const PORT = parseInt(config.port);

app.get("/auth/strava", (req, res) => {
  const state = stateManager.generateState();
  const authUrl = getAuthorizationUrl(credentials, state);
  res.redirect(authUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    const safeError = escapeHtml(String(error));
    return res.status(400).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">Authorization Failed</h1>
          <p>Error: ${safeError}</p>
          <p><a href="/auth/strava">Try again</a></p>
        </body>
      </html>
    `);
  }

  if (!state || typeof state !== "string" || !stateManager.validateState(state)) {
    return res.status(400).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">Authorization Failed</h1>
          <p>Invalid or expired state parameter. This may indicate a CSRF attack or an expired authorization attempt.</p>
          <p><a href="/auth/strava">Try again</a></p>
        </body>
      </html>
    `);
  }

  if (!code || typeof code !== "string") {
    return res.status(400).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">Authorization Failed</h1>
          <p>Authorization code is missing</p>
          <p><a href="/auth/strava">Try again</a></p>
        </body>
      </html>
    `);
  }

  try {
    const tokens = await exchangeCodeForTokens(credentials, code);
    tokenManager.saveTokensWithCredentials(tokens, credentials);

    res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #27ae60;">Authorization Successful!</h1>
          <p>You have successfully authorized the Strava MCP server.</p>
          <p>Tokens have been saved to: <code>${config.tokenFilePath}</code></p>
          <hr style="margin: 30px 0;">
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>You can now close this window</li>
            <li>The authorization server will shut down automatically</li>
            <li>Restart Claude Desktop to use the Strava MCP server</li>
          </ol>
        </body>
      </html>
    `);

    console.log("\nAuthorization successful! Tokens saved.");
    setTimeout(shutdownServer, 1000);
  } catch (error) {
    console.error("OAuth callback error:", error);
    const safeMessage = escapeHtml((error as Error).message);
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">Authorization Failed</h1>
          <p>${safeMessage}</p>
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

const server = app.listen(PORT, () => {
  console.log("\n=== Strava MCP Authorization Server ===\n");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `\nTo authorize with Strava, visit:\n   http://localhost:${PORT}/auth/strava\n`
  );
  console.log(
    `To check authorization status:\n   http://localhost:${PORT}/auth/status\n`
  );
});

function shutdownServer(): void {
  console.log("Shutting down authorization server...\n");
  server.close(() => process.exit(0));
}

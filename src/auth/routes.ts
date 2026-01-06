import express from "express";
import { getAuthorizationUrl, exchangeCodeForTokens } from "src/auth/oauth.js";
import { TokenManager } from "src/auth/tokenManager.js";

const router = express.Router();
const tokenManager = new TokenManager();

/**
 * Initiates the OAuth flow by redirecting to Strava authorization
 */
router.get("/strava", (req, res) => {
  const authUrl = getAuthorizationUrl();
  res.redirect(authUrl);
});

/**
 * Handles the OAuth callback from Strava
 */
router.get("/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`Authorization failed: ${error}`);
  }

  if (!code || typeof code !== "string") {
    return res.status(400).send("Authorization code is missing");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    tokenManager.saveTokens(tokens);

    res.send(`
      <html>
        <body>
          <h1>Authorization Successful</h1>
          <p>You have successfully authorized the Strava MCP server.</p>
          <p>You can now close this window and use the MCP server.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send(`Authorization failed: ${(error as Error).message}`);
  }
});

/**
 * Checks authorization status
 */
router.get("/status", (req, res) => {
  const hasTokens = tokenManager.hasTokens();

  if (hasTokens) {
    res.json({
      authorized: true,
      message: "Application is authorized with Strava",
    });
  } else {
    res.json({
      authorized: false,
      message: "Application is not authorized. Visit /auth/strava to authorize",
    });
  }
});

export default router;

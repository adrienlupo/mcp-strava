import fs from "fs";
import path from "path";
import { refreshAccessToken } from "src/auth/oauth.js";
import type { StravaTokens } from "src/auth/oauth.js";
import { config } from "src/config.js";

export class TokenManager {
  private tokenPath: string;

  constructor(tokenPath?: string) {
    this.tokenPath = tokenPath || config.tokenFilePath;
    this.ensureDataDirectory();
  }

  /**
   * Ensures the data directory exists
   */
  private ensureDataDirectory(): void {
    const dir = path.dirname(this.tokenPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Checks if tokens exist
   */
  hasTokens(): boolean {
    return fs.existsSync(this.tokenPath);
  }

  /**
   * Loads tokens from file
   */
  loadTokens(): StravaTokens {
    if (!this.hasTokens()) {
      throw new Error(
        "No tokens found. Please authorize the application first by visiting /auth/strava"
      );
    }

    try {
      const data = fs.readFileSync(this.tokenPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Saves tokens to file
   */
  saveTokens(tokens: StravaTokens): void {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
    } catch (error) {
      throw new Error(`Failed to save tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Checks if the access token is expired or about to expire
   */
  private isTokenExpired(tokens: StravaTokens): boolean {
    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 60;
    return tokens.expires_at <= now + bufferSeconds;
  }

  /**
   * Gets a valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string> {
    const tokens = this.loadTokens();

    if (!this.isTokenExpired(tokens)) {
      return tokens.access_token;
    }

    console.log("Access token expired, refreshing...");
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    this.saveTokens(newTokens);

    return newTokens.access_token;
  }
}

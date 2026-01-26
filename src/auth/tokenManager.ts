import fs from "fs";
import path from "path";
import { refreshAccessToken } from "src/auth/oauth.js";
import type {
  StravaTokens,
  StravaCredentials,
  StoredTokenData,
} from "src/auth/oauth.js";

export class TokenManager {
  private tokenPath: string;

  constructor(tokenPath: string) {
    this.tokenPath = tokenPath;
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dir = path.dirname(this.tokenPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  hasTokens(): boolean {
    return fs.existsSync(this.tokenPath);
  }

  private loadStoredData(): StoredTokenData {
    if (!this.hasTokens()) {
      throw new Error(
        "No tokens found. Please authorize the application first using: npx mcp-strava-auth"
      );
    }

    try {
      const data = fs.readFileSync(this.tokenPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load tokens: ${(error as Error).message}`);
    }
  }

  loadTokens(): StravaTokens {
    const data = this.loadStoredData();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      token_type: data.token_type,
    };
  }

  loadCredentials(): StravaCredentials {
    const data = this.loadStoredData();
    if (!data.credentials) {
      throw new Error(
        "No credentials found in token file. Please re-authorize using: npx mcp-strava-auth"
      );
    }
    return data.credentials;
  }

  saveTokensWithCredentials(
    tokens: StravaTokens,
    credentials: StravaCredentials
  ): void {
    try {
      this.ensureDataDirectory();
      const storedData: StoredTokenData = { ...tokens, credentials };
      fs.writeFileSync(this.tokenPath, JSON.stringify(storedData, null, 2), {
        mode: 0o600,
      });
    } catch (error) {
      throw new Error(`Failed to save tokens: ${(error as Error).message}`);
    }
  }

  saveTokens(tokens: StravaTokens): void {
    try {
      this.ensureDataDirectory();
      const existingData = this.loadStoredData();
      const storedData: StoredTokenData = {
        ...tokens,
        credentials: existingData.credentials,
      };
      fs.writeFileSync(this.tokenPath, JSON.stringify(storedData, null, 2), {
        mode: 0o600,
      });
    } catch (error) {
      throw new Error(`Failed to save tokens: ${(error as Error).message}`);
    }
  }

  private isTokenExpired(tokens: StravaTokens): boolean {
    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 60;
    return tokens.expires_at <= now + bufferSeconds;
  }

  async getValidAccessToken(): Promise<string> {
    const tokens = this.loadTokens();

    if (!this.isTokenExpired(tokens)) {
      return tokens.access_token;
    }

    console.error("Access token expired, refreshing...");
    const credentials = this.loadCredentials();
    const newTokens = await refreshAccessToken(credentials, tokens.refresh_token);
    this.saveTokens(newTokens);

    return newTokens.access_token;
  }
}

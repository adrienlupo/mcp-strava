import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const defaultTokenPath = join(homedir(), ".strava-mcp", "tokens.json");

const configSchema = z.object({
  port: z.string().default("3000"),
  stravaClientId: z.string().min(1, "STRAVA_CLIENT_ID is required"),
  stravaClientSecret: z.string().min(1, "STRAVA_CLIENT_SECRET is required"),
  stravaRedirectUri: z.string().url("STRAVA_REDIRECT_URI must be a valid URL"),
  tokenFilePath: z.string().default(defaultTokenPath),
});

function loadConfig() {
  try {
    return configSchema.parse({
      port: process.env.PORT,
      stravaClientId: process.env.STRAVA_CLIENT_ID,
      stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
      stravaRedirectUri: process.env.STRAVA_REDIRECT_URI,
      tokenFilePath: process.env.TOKEN_FILE_PATH,
    });
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

export const config = loadConfig();

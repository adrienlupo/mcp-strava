import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const defaultTokenPath = join(homedir(), ".strava-mcp", "tokens.json");

const configSchema = z.object({
  port: z.string().default("3000"),
  tokenFilePath: z.string().default(defaultTokenPath),
});

function loadConfig() {
  return configSchema.parse({
    port: process.env.PORT,
    tokenFilePath: process.env.TOKEN_FILE_PATH,
  });
}

export const config = loadConfig();

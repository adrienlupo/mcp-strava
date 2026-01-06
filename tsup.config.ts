import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: [
    "express",
    "cors",
    "axios",
    "dotenv",
    "zod",
    "@modelcontextprotocol/sdk",
  ],
  tsconfig: "tsconfig.json",
});

import dotenv from "dotenv";
import { validateServerEnv, ServerEnv } from "@jobpilot/validation";

// Load environment variables from .env file if available
dotenv.config();

let cachedServerEnv: ServerEnv | null = null;

export function loadServerConfig(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  cachedServerEnv = validateServerEnv({
    PORT: process.env["PORT"],
    NODE_ENV: process.env["NODE_ENV"],
    API_BASE_URL: process.env["API_BASE_URL"],
  });

  return cachedServerEnv;
}

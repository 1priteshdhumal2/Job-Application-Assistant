import { z } from "zod";

/**
 * Client-Safe Environment Schema (Safe for React Renderer & Web UI)
 * Prefixed with VITE_ to align with Vite's client-side bundling security rules.
 */
export const clientEnvSchema = z.object({
  VITE_SUPABASE_URL: z
    .string({ required_error: "VITE_SUPABASE_URL is required" })
    .url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_ANON_KEY: z
    .string({ required_error: "VITE_SUPABASE_ANON_KEY is required" })
    .min(1, "VITE_SUPABASE_ANON_KEY must not be empty"),
  VITE_APP_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Server-Only Environment Schema (Node.js API Services)
 * NEVER expose these to the browser/renderer bundle.
 */
export const serverEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
  API_BASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Desktop-Local Environment Schema (Electron Main Process)
 */
export const desktopConfigSchema = z.object({
  DESKTOP_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type DesktopConfig = z.infer<typeof desktopConfigSchema>;

/**
 * Validation Helper Functions
 */
export function validateClientEnv(env: Record<string, unknown>): ClientEnv {
  return clientEnvSchema.parse(env);
}

export function validateServerEnv(env: Record<string, unknown>): ServerEnv {
  return serverEnvSchema.parse(env);
}

export function validateDesktopConfig(
  env: Record<string, unknown>,
): DesktopConfig {
  return desktopConfigSchema.parse(env);
}

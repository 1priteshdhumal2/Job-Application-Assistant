import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateClientEnv } from "@jobpilot/validation";

/**
 * Global cached browser client instance to prevent redundant connections.
 */
let cachedClient: SupabaseClient | null = null;

export interface SupabaseClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Creates a public/anon Supabase client for browser and desktop renderer contexts.
 * Uses only client-safe credentials (URL and anon key).
 *
 * NOTE: Service-role credentials must NEVER be passed or used here.
 */
export function createSupabaseBrowserClient(
  config: SupabaseClientConfig,
): SupabaseClient {
  const validated = validateClientEnv({
    VITE_SUPABASE_URL: config.supabaseUrl,
    VITE_SUPABASE_ANON_KEY: config.supabaseAnonKey,
  });

  return createClient(
    validated.VITE_SUPABASE_URL,
    validated.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}

/**
 * Returns or initializes the shared browser Supabase client.
 */
export function getSupabaseBrowserClient(
  config?: SupabaseClientConfig,
): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  if (!config) {
    throw new Error(
      "Supabase client configuration missing. Provide { supabaseUrl, supabaseAnonKey }.",
    );
  }

  cachedClient = createSupabaseBrowserClient(config);
  return cachedClient;
}

/**
 * Helper to reset client (useful for test isolation)
 */
export function resetSupabaseBrowserClient(): void {
  cachedClient = null;
}

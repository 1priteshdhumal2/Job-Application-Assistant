import { describe, it, expect } from "vitest";
import {
  validateClientEnv,
  validateServerEnv,
  validateDesktopConfig,
} from "../src/env.js";

describe("Environment & Config Validation", () => {
  describe("clientEnvSchema", () => {
    it("validates correct client environment configuration", () => {
      const valid = {
        VITE_SUPABASE_URL: "https://example-project.supabase.co",
        VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
        VITE_APP_ENV: "development",
      };
      const result = validateClientEnv(valid);
      expect(result.VITE_SUPABASE_URL).toBe(
        "https://example-project.supabase.co",
      );
      expect(result.VITE_APP_ENV).toBe("development");
    });

    it("defaults VITE_APP_ENV to development if omitted", () => {
      const valid = {
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-key-123",
      };
      const result = validateClientEnv(valid);
      expect(result.VITE_APP_ENV).toBe("development");
    });

    it("throws error when VITE_SUPABASE_URL is invalid URL", () => {
      const invalid = {
        VITE_SUPABASE_URL: "not-a-url",
        VITE_SUPABASE_ANON_KEY: "anon-key-123",
      };
      expect(() => validateClientEnv(invalid)).toThrow();
    });

    it("throws error when VITE_SUPABASE_ANON_KEY is empty", () => {
      const invalid = {
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "",
      };
      expect(() => validateClientEnv(invalid)).toThrow();
    });

    it("throws error when required fields are missing", () => {
      expect(() => validateClientEnv({})).toThrow();
    });
  });

  describe("serverEnvSchema", () => {
    it("validates server environment and coerces port to number", () => {
      const valid = {
        PORT: "3001",
        NODE_ENV: "production",
        API_BASE_URL: "https://api.example.com",
      };
      const result = validateServerEnv(valid);
      expect(result.PORT).toBe(3001);
      expect(result.NODE_ENV).toBe("production");
      expect(result.API_BASE_URL).toBe("https://api.example.com");
    });

    it("applies defaults when values are omitted", () => {
      const result = validateServerEnv({});
      expect(result.PORT).toBe(3001);
      expect(result.NODE_ENV).toBe("development");
    });

    it("rejects invalid NODE_ENV values", () => {
      expect(() => validateServerEnv({ NODE_ENV: "invalid_env" })).toThrow();
    });
  });

  describe("desktopConfigSchema", () => {
    it("validates desktop configuration with default log level", () => {
      const result = validateDesktopConfig({});
      expect(result.DESKTOP_LOG_LEVEL).toBe("info");
    });

    it("accepts valid custom log level", () => {
      const result = validateDesktopConfig({ DESKTOP_LOG_LEVEL: "debug" });
      expect(result.DESKTOP_LOG_LEVEL).toBe("debug");
    });

    it("rejects unrecognized log level", () => {
      expect(() =>
        validateDesktopConfig({ DESKTOP_LOG_LEVEL: "verbose" }),
      ).toThrow();
    });
  });
});

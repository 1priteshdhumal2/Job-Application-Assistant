import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /health API Endpoint", () => {
  const app = createApp();

  it("returns HTTP 200 with status ok and service identifier", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("service", "jobpilot-api");
    expect(response.body).toHaveProperty("timestamp");
    expect(typeof response.body.uptime).toBe("number");
  });

  it("returns 404 for non-existent routes", async () => {
    const response = await request(app).get("/non-existent-route");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toHaveProperty("code", "NOT_FOUND");
  });
});

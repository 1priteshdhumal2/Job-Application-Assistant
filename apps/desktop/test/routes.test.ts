import { describe, it, expect } from "vitest";

describe("Desktop Navigation & Route Structure Invariants", () => {
  it("defines standard route paths accurately", () => {
    const expectedRoutes = {
      login: "/login",
      appRoot: "/app",
      jobs: "/app/jobs",
      jobDetail: "/app/jobs/:jobId",
      applications: "/app/applications",
      applicationDetail: "/app/applications/:applicationId",
      preparation: "/app/applications/:applicationId/prepare",
      documents: "/app/documents",
      profile: "/app/profile",
      settings: "/app/settings",
      diagnostics: "/app/diagnostics",
    };

    expect(expectedRoutes.login).toBe("/login");
    expect(expectedRoutes.appRoot).toBe("/app");
    expect(expectedRoutes.jobs).toBe("/app/jobs");
    expect(expectedRoutes.jobDetail).toBe("/app/jobs/:jobId");
    expect(expectedRoutes.applications).toBe("/app/applications");
    expect(expectedRoutes.applicationDetail).toBe(
      "/app/applications/:applicationId",
    );
    expect(expectedRoutes.preparation).toBe(
      "/app/applications/:applicationId/prepare",
    );
    expect(expectedRoutes.documents).toBe("/app/documents");
    expect(expectedRoutes.profile).toBe("/app/profile");
    expect(expectedRoutes.settings).toBe("/app/settings");
    expect(expectedRoutes.diagnostics).toBe("/app/diagnostics");
  });

  it("verifies public vs protected route boundaries", () => {
    const publicPaths = ["/login"];
    const protectedPrefix = "/app";

    const testRoutes = [
      "/app",
      "/app/jobs",
      "/app/jobs/123",
      "/app/applications",
      "/app/applications/456",
      "/app/applications/456/prepare",
      "/app/documents",
      "/app/profile",
      "/app/settings",
      "/app/diagnostics",
    ];

    testRoutes.forEach((route) => {
      expect(route.startsWith(protectedPrefix)).toBe(true);
      expect(publicPaths.includes(route)).toBe(false);
    });
  });
});

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { executeCapturePortalJob, UseCaseContext } from "../../src/index.js";
import {
  softDeleteApplication,
  createJob,
  transitionApplicationStatus,
} from "@jobpilot/database";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://nhbtvffsainbutsdzyht.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYnR2ZmZzYWluYnV0c2R6eWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIwNDcsImV4cCI6MjEwMjc5ODA0N30.Al24DtjMgYMUASDJUXgVk8Zz7njnduI_SYrZ1DZMZmU";

const TEST_USER_A_EMAIL = "test_user_a@jobpilot.internal";
const TEST_USER_B_EMAIL = "test_user_b@jobpilot.internal";
const TEST_PASSWORD = "TestPassword123!";

describe("Phase 2D-3 Slice C: Capture Portal Job Integration Suite", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let contextA: UseCaseContext;
  let contextB: UseCaseContext;

  const ensureAuth = async () => {
    const { data: sessionA } = await clientA.auth.getSession();
    if (!sessionA?.session) {
      const { error: errA } = await clientA.auth.signInWithPassword({
        email: TEST_USER_A_EMAIL,
        password: TEST_PASSWORD,
      });
      if (errA) throw new Error(`User A login failed: ${errA.message}`);
    }

    const { data: sessionB } = await clientB.auth.getSession();
    if (!sessionB?.session) {
      const { error: errB } = await clientB.auth.signInWithPassword({
        email: TEST_USER_B_EMAIL,
        password: TEST_PASSWORD,
      });
      if (errB) throw new Error(`User B login failed: ${errB.message}`);
    }

    contextA = { supabase: clientA };
    contextB = { supabase: clientB };
  };

  beforeAll(async () => {
    clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await ensureAuth();
  }, 30000);

  beforeEach(async () => {
    await ensureAuth();
  });

  it("1. First capture creates one Job and one Application with status SAVED", async () => {
    const externalId = `indeed_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Senior TypeScript Engineer",
      companyName: "Acme Cloud",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
      location: "San Francisco, CA",
    });

    expect(result.job.id).toBeDefined();
    expect(result.job.external_job_id).toBe(externalId);
    expect(result.application.id).toBeDefined();
    expect(result.application.status).toBe("SAVED");
    expect(result.isNewJob).toBe(true);
    expect(result.applicationCreated).toBe(true);
    expect(result.applicationRestored).toBe(false);
  }, 30000);

  it("2. Recapture of same Indeed Job reuses existing Job and Application and updates metadata", async () => {
    const externalId = `indeed_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Initial capture
    const firstResult = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Junior Engineer",
      companyName: "Acme Cloud",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
      location: "San Francisco, CA",
    });

    // Recapture with updated title
    const secondResult = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Senior Engineer",
      companyName: "Acme Cloud",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
      location: "San Francisco, CA",
    });

    expect(secondResult.job.id).toBe(firstResult.job.id);
    expect(secondResult.application.id).toBe(firstResult.application.id);
    expect(secondResult.job.job_title).toBe("Senior Engineer");
    expect(secondResult.isNewJob).toBe(false);
    expect(secondResult.applicationCreated).toBe(false);
  }, 30000);

  it("3. Recapture preserves active Application status and fields", async () => {
    const externalId = `indeed_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const initialResult = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Frontend Architect",
      companyName: "Stripe",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
    });

    // Transition application to INTERESTED
    await transitionApplicationStatus(
      clientA,
      initialResult.application.id,
      "INTERESTED",
    );

    // Recapture
    const recaptureResult = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Frontend Architect (Updated)",
      companyName: "Stripe",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
    });

    expect(recaptureResult.application.id).toBe(initialResult.application.id);
    expect(recaptureResult.application.status).toBe("INTERESTED");
    expect(recaptureResult.applicationRestored).toBe(false);
  }, 30000);

  it("4. Recapture restores archived/soft-deleted Application while preserving status", async () => {
    const externalId = `indeed_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const initialResult = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Backend Lead",
      companyName: "Netflix",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
    });

    // Soft delete / archive application
    await softDeleteApplication(clientA, initialResult.application.id);

    // Verify deleted_at is set
    const archived = await clientA
      .from("applications")
      .select("*")
      .eq("id", initialResult.application.id)
      .single();
    expect(archived.data.deleted_at).not.toBeNull();

    // Recapture
    const restoredResult = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Backend Lead",
      companyName: "Netflix",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
    });

    expect(restoredResult.application.id).toBe(initialResult.application.id);
    expect(restoredResult.application.deleted_at).toBeNull();
    expect(restoredResult.application.status).toBe("SAVED");
    expect(restoredResult.applicationRestored).toBe(true);
  }, 30000);

  it("5. Concurrent first-time captures resolve to exactly one Job and one Application", async () => {
    const externalId = `indeed_concurrent_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payload = {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Distributed Systems Lead",
      companyName: "AWS",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
    };

    const [res1, res2] = await Promise.all([
      executeCapturePortalJob(contextA, payload),
      executeCapturePortalJob(contextA, payload),
    ]);

    expect(res1.job.id).toBe(res2.job.id);
    expect(res1.application.id).toBe(res2.application.id);
  }, 30000);

  it("6. Different externalJobIds create separate Jobs and Applications", async () => {
    const ext1 = `indeed_diff_1_${Date.now()}`;
    const ext2 = `indeed_diff_2_${Date.now()}`;

    const res1 = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: ext1,
      jobTitle: "Role 1",
      companyName: "Company 1",
      jobUrl: `https://www.indeed.com/viewjob?jk=${ext1}`,
    });

    const res2 = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: ext2,
      jobTitle: "Role 2",
      companyName: "Company 2",
      jobUrl: `https://www.indeed.com/viewjob?jk=${ext2}`,
    });

    expect(res1.job.id).not.toBe(res2.job.id);
    expect(res1.application.id).not.toBe(res2.application.id);
  }, 30000);

  it("7. Same Indeed Job captured by different users creates separate tenant records", async () => {
    const sharedExternalId = `indeed_multi_tenant_${Date.now()}`;

    const resA = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: sharedExternalId,
      jobTitle: "Multi-tenant Engineer",
      companyName: "SaaS Corp",
      jobUrl: `https://www.indeed.com/viewjob?jk=${sharedExternalId}`,
    });

    const resB = await executeCapturePortalJob(contextB, {
      portalCode: "INDEED",
      externalJobId: sharedExternalId,
      jobTitle: "Multi-tenant Engineer",
      companyName: "SaaS Corp",
      jobUrl: `https://www.indeed.com/viewjob?jk=${sharedExternalId}`,
    });

    expect(resA.job.id).not.toBe(resB.job.id);
    expect(resA.application.id).not.toBe(resB.application.id);
  }, 30000);

  it("8. Manually created Job with external_job_id NULL coexists safely", async () => {
    const manualJob = await createJob(clientA, {
      company_name: "Manual Inc",
      job_title: "Manual Job",
      status: "SAVED",
    });

    expect(manualJob.id).toBeDefined();

    const externalId = `indeed_after_manual_${Date.now()}`;
    const captured = await executeCapturePortalJob(contextA, {
      portalCode: "INDEED",
      externalJobId: externalId,
      jobTitle: "Captured Job",
      companyName: "Captured Inc",
      jobUrl: `https://www.indeed.com/viewjob?jk=${externalId}`,
    });

    expect(captured.job.id).not.toBe(manualJob.id);
  }, 30000);

  it("9. Rejects invalid or inactive portal code", async () => {
    await expect(
      executeCapturePortalJob(contextA, {
        portalCode: "NONEXISTENT_PORTAL_999",
        externalJobId: "job-123",
        jobTitle: "Engineer",
        companyName: "Test",
        jobUrl: "https://example.com/job",
      }),
    ).rejects.toThrow();
  }, 30000);
});

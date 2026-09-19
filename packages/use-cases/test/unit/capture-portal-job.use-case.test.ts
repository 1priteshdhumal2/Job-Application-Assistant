import { describe, it, expect, vi } from "vitest";
import { executeCapturePortalJob } from "../../src/applications/capture-portal-job.use-case.js";
import { UseCaseContext } from "../../src/common/context.js";
import type { CapturePortalJobResult } from "@jobpilot/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as databaseModule from "@jobpilot/database";

describe("CapturePortalJobUseCase (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("orchestrates job capture with valid schema", async () => {
    const mockResult: CapturePortalJobResult = {
      job: {
        id: "00000000-0000-0000-0000-000000000010",
        user_id: mockUser.id,
        portal_id: "00000000-0000-0000-0000-000000000020",
        external_job_id: "indeed-jk-12345",
        job_title: "Staff Software Engineer",
        company_name: "Google",
        job_url: "https://www.indeed.com/viewjob?jk=indeed-jk-12345",
        location: "Mountain View, CA",
        employment_type: "Full-time",
        description: "Great role",
        salary_min: null,
        salary_max: null,
        currency: null,
        posted_at: null,
        captured_at: new Date().toISOString(),
        status: "SAVED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      application: {
        id: "00000000-0000-0000-0000-000000000030",
        user_id: mockUser.id,
        job_id: "00000000-0000-0000-0000-000000000010",
        status: "SAVED",
        applied_at: null,
        submitted_at: null,
        resume_document_id: null,
        cover_letter_document_id: null,
        notes: null,
        latest_preparation_id: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isNewJob: true,
      applicationCreated: true,
      applicationRestored: false,
    };

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const captureSpy = vi
      .spyOn(databaseModule, "capturePortalJob")
      .mockResolvedValue(mockResult);

    const context: UseCaseContext = { supabase };

    const result = await executeCapturePortalJob(context, {
      portalCode: "INDEED",
      externalJobId: "indeed-jk-12345",
      jobTitle: "Staff Software Engineer",
      companyName: "Google",
      jobUrl: "https://www.indeed.com/viewjob?jk=indeed-jk-12345",
      location: "Mountain View, CA",
    });

    expect(result).toEqual(mockResult);
    expect(captureSpy).toHaveBeenCalledOnce();
    const callArg = captureSpy.mock.calls[0]![1];
    expect(callArg.portalCode).toBe("INDEED");
    expect(callArg.externalJobId).toBe("indeed-jk-12345");
  });

  it("validates input schema and rejects invalid URL format", async () => {
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const context: UseCaseContext = { supabase };

    await expect(
      executeCapturePortalJob(context, {
        portalCode: "INDEED",
        externalJobId: "indeed-jk-12345",
        jobTitle: "Staff Software Engineer",
        companyName: "Google",
        jobUrl: "invalid-url-not-http",
      }),
    ).rejects.toThrow();
  });

  it("validates input schema and rejects missing required fields", async () => {
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const context: UseCaseContext = { supabase };

    await expect(
      executeCapturePortalJob(context, {
        portalCode: "",
        externalJobId: "",
        jobTitle: "",
        companyName: "",
        jobUrl: "https://indeed.com/job/123",
      }),
    ).rejects.toThrow();
  });
});

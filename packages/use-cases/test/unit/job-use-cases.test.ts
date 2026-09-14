import { describe, it, expect, vi } from "vitest";
import { executeListJobs } from "../../src/jobs/list-jobs.use-case.js";
import { executeGetJob } from "../../src/jobs/get-job.use-case.js";
import { executeCreateJob } from "../../src/jobs/create-job.use-case.js";
import { executeUpdateJob } from "../../src/jobs/update-job.use-case.js";
import { executeDeleteJob } from "../../src/jobs/delete-job.use-case.js";
import { UseCaseContext } from "../../src/common/context.js";
import type {
  Job,
  JobCreateInput,
  JobUpdateInput,
  PaginatedResult,
} from "@jobpilot/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as databaseModule from "@jobpilot/database";
import {
  AuthError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@jobpilot/database";

describe("Job UseCases (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  const createMockSupabase = (user: typeof mockUser | null = mockUser) =>
    ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
          error: user ? null : new Error("No session"),
        }),
      },
    }) as unknown as SupabaseClient;

  const sampleJob: Job = {
    id: "job-123",
    user_id: mockUser.id,
    portal_id: null,
    company_name: "Acme Corp",
    job_title: "Senior Engineer",
    job_url: "https://example.com/job",
    location: "Remote",
    employment_type: "Full-time",
    description: "Job description",
    salary_min: 100000,
    salary_max: 150000,
    currency: "USD",
    posted_at: "2026-09-01T00:00:00.000Z",
    captured_at: "2026-09-01T00:00:00.000Z",
    status: "SAVED",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  it("orchestrates executeListJobs with filters, pagination, and sorting", async () => {
    const mockResult: PaginatedResult<Job> = {
      items: [sampleJob],
      totalCount: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasMore: false,
    };

    const supabase = createMockSupabase();
    const listSpy = vi
      .spyOn(databaseModule, "listJobs")
      .mockResolvedValue(mockResult);

    const context: UseCaseContext = { supabase };
    const filters = { status: "SAVED" as const, company_name: "Acme" };
    const pagination = { page: 1, pageSize: 20 };
    const sort = { column: "created_at" as const, ascending: false };

    const result = await executeListJobs(context, filters, pagination, sort);

    expect(result).toEqual(mockResult);
    expect(listSpy).toHaveBeenCalledOnce();
    expect(listSpy).toHaveBeenCalledWith(supabase, filters, pagination, sort);
  });

  it("orchestrates executeGetJob with ID pass-through", async () => {
    const supabase = createMockSupabase();
    const getSpy = vi
      .spyOn(databaseModule, "getJob")
      .mockResolvedValue(sampleJob);

    const context: UseCaseContext = { supabase };
    const result = await executeGetJob(context, "job-123");

    expect(result).toEqual(sampleJob);
    expect(getSpy).toHaveBeenCalledOnce();
    expect(getSpy).toHaveBeenCalledWith(supabase, "job-123");
  });

  it("orchestrates executeCreateJob with input pass-through", async () => {
    const createInput: JobCreateInput = {
      portal_id: null,
      company_name: "Acme Corp",
      job_title: "Senior Engineer",
      job_url: "https://example.com/job",
      location: "Remote",
      employment_type: "Full-time",
      description: "Job description",
      salary_min: 100000,
      salary_max: 150000,
      currency: "USD",
      posted_at: "2026-09-01T00:00:00.000Z",
      status: "SAVED",
    };

    const supabase = createMockSupabase();
    const createSpy = vi
      .spyOn(databaseModule, "createJob")
      .mockResolvedValue(sampleJob);

    const context: UseCaseContext = { supabase };
    const result = await executeCreateJob(context, createInput);

    expect(result).toEqual(sampleJob);
    expect(createSpy).toHaveBeenCalledOnce();
    expect(createSpy).toHaveBeenCalledWith(supabase, createInput);
  });

  it("orchestrates executeUpdateJob with ID and update payload pass-through", async () => {
    const updateInput: JobUpdateInput = {
      status: "INTERESTED",
      location: "New York, NY",
    };
    const updatedJob: Job = { ...sampleJob, ...updateInput };

    const supabase = createMockSupabase();
    const updateSpy = vi
      .spyOn(databaseModule, "updateJob")
      .mockResolvedValue(updatedJob);

    const context: UseCaseContext = { supabase };
    const result = await executeUpdateJob(context, "job-123", updateInput);

    expect(result).toEqual(updatedJob);
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy).toHaveBeenCalledWith(supabase, "job-123", updateInput);
  });

  it("orchestrates executeDeleteJob with ID pass-through", async () => {
    const supabase = createMockSupabase();
    const deleteSpy = vi
      .spyOn(databaseModule, "deleteJob")
      .mockResolvedValue(undefined);

    const context: UseCaseContext = { supabase };
    await executeDeleteJob(context, "job-123");

    expect(deleteSpy).toHaveBeenCalledOnce();
    expect(deleteSpy).toHaveBeenCalledWith(supabase, "job-123");
  });

  describe("Authentication Rejection", () => {
    it("rejects executeListJobs when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const listSpy = vi.spyOn(databaseModule, "listJobs");
      const context: UseCaseContext = { supabase };

      await expect(executeListJobs(context)).rejects.toThrow(AuthError);
      expect(listSpy).not.toHaveBeenCalled();
    });

    it("rejects executeGetJob when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const getSpy = vi.spyOn(databaseModule, "getJob");
      const context: UseCaseContext = { supabase };

      await expect(executeGetJob(context, "job-123")).rejects.toThrow(
        AuthError,
      );
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("rejects executeCreateJob when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const createSpy = vi.spyOn(databaseModule, "createJob");
      const context: UseCaseContext = { supabase };

      await expect(
        executeCreateJob(context, {
          company_name: "Acme",
          job_title: "Engineer",
          portal_id: null,
          job_url: null,
          location: null,
          employment_type: null,
          description: null,
          salary_min: null,
          salary_max: null,
          currency: null,
          posted_at: null,
          status: "SAVED",
        }),
      ).rejects.toThrow(AuthError);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("rejects executeUpdateJob when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const updateSpy = vi.spyOn(databaseModule, "updateJob");
      const context: UseCaseContext = { supabase };

      await expect(
        executeUpdateJob(context, "job-123", { status: "CLOSED" }),
      ).rejects.toThrow(AuthError);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("rejects executeDeleteJob when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const deleteSpy = vi.spyOn(databaseModule, "deleteJob");
      const context: UseCaseContext = { supabase };

      await expect(executeDeleteJob(context, "job-123")).rejects.toThrow(
        AuthError,
      );
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });

  describe("Error Propagation", () => {
    it("propagates NotFoundError unchanged from executeGetJob", async () => {
      const supabase = createMockSupabase();
      vi.spyOn(databaseModule, "getJob").mockRejectedValue(
        new NotFoundError("Job posting not found"),
      );

      const context: UseCaseContext = { supabase };
      await expect(executeGetJob(context, "missing-id")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("propagates ConflictError unchanged from executeDeleteJob on FK RESTRICT violation", async () => {
      const supabase = createMockSupabase();
      vi.spyOn(databaseModule, "deleteJob").mockRejectedValue(
        new ConflictError("Cannot delete job: linked applications exist"),
      );

      const context: UseCaseContext = { supabase };
      await expect(executeDeleteJob(context, "job-with-apps")).rejects.toThrow(
        ConflictError,
      );
    });

    it("propagates ValidationError unchanged from executeCreateJob", async () => {
      const supabase = createMockSupabase();
      vi.spyOn(databaseModule, "createJob").mockRejectedValue(
        new ValidationError(
          "Maximum salary must be greater than or equal to minimum salary",
        ),
      );

      const context: UseCaseContext = { supabase };
      await expect(
        executeCreateJob(context, {
          company_name: "Acme",
          job_title: "Engineer",
          salary_min: 200000,
          salary_max: 100000,
          portal_id: null,
          job_url: null,
          location: null,
          employment_type: null,
          description: null,
          currency: null,
          posted_at: null,
          status: "SAVED",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });
});

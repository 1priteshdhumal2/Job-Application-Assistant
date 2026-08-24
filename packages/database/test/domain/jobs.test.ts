import { describe, it, expect, vi } from "vitest";
import { listJobs, createJob, deleteJob } from "../../src/domain/jobs.js";
import { ConflictError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Jobs Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists jobs with pagination and default sorting", async () => {
    const mockJobs = [
      { id: "job-1", company_name: "Google", job_title: "Staff SWE" },
    ];

    const range = vi
      .fn()
      .mockResolvedValue({ data: mockJobs, count: 1, error: null });
    const order = vi.fn().mockReturnValue({ range });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await listJobs(supabase, undefined, {
      page: 1,
      pageSize: 20,
    });
    expect(result.data).toEqual(mockJobs);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("rejects job creation with invalid salary range", async () => {
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    await expect(
      createJob(supabase, {
        company_name: "Acme",
        job_title: "Lead SWE",
        salary_min: 2000000,
        salary_max: 1000000, // Invalid: max < min
      }),
    ).rejects.toThrow();
  });

  it("maps 23503 foreign key constraint error on job deletion to ConflictError", async () => {
    const eqUser = vi.fn().mockResolvedValue({
      error: { code: "23503", message: "fk_applications_job_user" },
      count: 0,
    });
    const eqId = vi.fn().mockReturnValue({ eq: eqUser });
    const del = vi.fn().mockReturnValue({ eq: eqId });
    const from = vi.fn().mockReturnValue({ delete: del });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    await expect(deleteJob(supabase, "job-1")).rejects.toThrow(ConflictError);
  });
});

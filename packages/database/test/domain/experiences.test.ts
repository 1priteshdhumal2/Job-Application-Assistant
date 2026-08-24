import { describe, it, expect, vi } from "vitest";
import {
  listExperiences,
  createExperience,
  deleteExperience,
} from "../../src/domain/experiences.js";
import { ValidationError, NotFoundError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Experiences Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists experiences with default sorting", async () => {
    const mockData = [
      { id: "exp-1", company_name: "Tech Corp", start_date: "2023-01-01" },
    ];

    const order = vi.fn().mockResolvedValue({ data: mockData, error: null });
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

    const result = await listExperiences(supabase);
    expect(result).toEqual(mockData);
    expect(order).toHaveBeenCalledWith("start_date", { ascending: false });
  });

  it("rejects unauthorized sort field with ValidationError", async () => {
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    await expect(
      listExperiences(supabase, {
        sortBy: "unauthorized_column" as unknown as "start_date",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("creates experience with validated inputs", async () => {
    const input = {
      company_name: "Stripe",
      job_title: "Staff Engineer",
      start_date: "2022-01-01",
      is_current: true,
    };

    const single = vi.fn().mockResolvedValue({
      data: { id: "exp-2", user_id: mockUser.id, ...input },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await createExperience(supabase, input);
    expect(result.id).toBe("exp-2");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        company_name: "Stripe",
      }),
    );
  });

  it("deletes experience throwing NotFoundError when count is 0", async () => {
    const eqUser = vi.fn().mockResolvedValue({ error: null, count: 0 });
    const eqId = vi.fn().mockReturnValue({ eq: eqUser });
    const deleteOp = vi.fn().mockReturnValue({ eq: eqId });
    const from = vi.fn().mockReturnValue({ delete: deleteOp });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    await expect(deleteExperience(supabase, "non-existent")).rejects.toThrow(
      NotFoundError,
    );
  });
});

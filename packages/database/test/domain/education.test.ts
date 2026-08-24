import { describe, it, expect, vi } from "vitest";
import { listEducation, createEducation } from "../../src/domain/education.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Education Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists education records sorted by start_date desc", async () => {
    const mockData = [{ id: "edu-1", institution: "MIT", degree: "M.S." }];

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

    const result = await listEducation(supabase);
    expect(result).toEqual(mockData);
  });

  it("creates education record verifying dates", async () => {
    const input = {
      institution: "Stanford",
      degree: "B.S. CS",
      start_date: "2018-09-01",
      end_date: "2022-06-01",
    };

    const single = vi.fn().mockResolvedValue({
      data: { id: "edu-2", user_id: mockUser.id, ...input },
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

    const result = await createEducation(supabase, input);
    expect(result.id).toBe("edu-2");
  });
});

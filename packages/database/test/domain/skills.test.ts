import { describe, it, expect, vi } from "vitest";
import { listSkills, createSkill } from "../../src/domain/skills.js";
import { ConflictError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Skills Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists skills ordered by skill_name asc", async () => {
    const mockData = [{ id: "skill-1", skill_name: "PostgreSQL" }];

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

    const result = await listSkills(supabase);
    expect(result).toEqual(mockData);
    expect(order).toHaveBeenCalledWith("skill_name", { ascending: true });
  });

  it("maps duplicate skill 23505 error to ConflictError", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "unique constraint violation",
        details: "Key (user_id, lower(skill_name)) already exists.",
      },
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

    await expect(
      createSkill(supabase, { skill_name: "postgresql" }),
    ).rejects.toThrow(ConflictError);
  });
});

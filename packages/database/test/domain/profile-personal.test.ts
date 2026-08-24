import { describe, it, expect, vi } from "vitest";
import {
  getPersonalProfile,
  upsertPersonalProfile,
} from "../../src/domain/profile-personal.js";
import { AuthError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Profile Personal Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("throws AuthError when unauthenticated", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("No session"),
        }),
      },
    } as unknown as SupabaseClient;

    await expect(getPersonalProfile(supabase)).rejects.toThrow(AuthError);
  });

  it("fetches personal profile for authenticated user", async () => {
    const mockProfile = {
      user_id: mockUser.id,
      first_name: "Alice",
      last_name: "Smith",
      notice_period_days: 30,
    };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockProfile, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
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

    const result = await getPersonalProfile(supabase);
    expect(result).toEqual(mockProfile);
    expect(eq).toHaveBeenCalledWith("user_id", mockUser.id);
  });

  it("upserts personal profile validating inputs", async () => {
    const mockInput = {
      first_name: "Alice",
      last_name: "Smith",
      notice_period_days: 15,
    };

    const single = vi.fn().mockResolvedValue({
      data: { user_id: mockUser.id, ...mockInput },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ upsert });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await upsertPersonalProfile(supabase, mockInput);
    expect(result.first_name).toBe("Alice");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        first_name: "Alice",
      }),
    );
  });
});

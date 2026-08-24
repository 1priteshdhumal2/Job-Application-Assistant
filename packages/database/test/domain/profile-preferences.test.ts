import { describe, it, expect, vi } from "vitest";
import { getProfilePreferences } from "../../src/domain/profile-preferences.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Profile Preferences Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("fetches preferences for authenticated user", async () => {
    const mockPrefs = {
      user_id: mockUser.id,
      remote_preference: "REMOTE",
      minimum_expected_ctc: 2000000,
    };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockPrefs, error: null });
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

    const result = await getProfilePreferences(supabase);
    expect(result).toEqual(mockPrefs);
  });
});

import { describe, it, expect, vi } from "vitest";
import { listProfileLinks } from "../../src/domain/profile-links.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Profile Links Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists profile links", async () => {
    const mockData = [
      { id: "link-1", link_type: "LINKEDIN", url: "https://linkedin.com" },
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

    const result = await listProfileLinks(supabase);
    expect(result).toEqual(mockData);
  });
});

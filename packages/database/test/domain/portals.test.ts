import { describe, it, expect, vi } from "vitest";
import { listPortals, getPortalByCode } from "../../src/domain/portals.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Portals Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists active portals ordered by name", async () => {
    const mockPortals = [
      { id: "p-1", code: "LINKEDIN", name: "LinkedIn", is_active: true },
      { id: "p-2", code: "NAUKRI", name: "Naukri", is_active: true },
    ];

    const order = vi.fn().mockResolvedValue({ data: mockPortals, error: null });
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

    const result = await listPortals(supabase);
    expect(result).toHaveLength(2);
    expect(order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("fetches portal by unique code", async () => {
    const mockPortal = { id: "p-1", code: "LINKEDIN", name: "LinkedIn" };

    const single = vi.fn().mockResolvedValue({ data: mockPortal, error: null });
    const eq = vi.fn().mockReturnValue({ single });
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

    const result = await getPortalByCode(supabase, "LINKEDIN");
    expect(result.code).toBe("LINKEDIN");
  });
});

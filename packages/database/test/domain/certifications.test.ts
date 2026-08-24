import { describe, it, expect, vi } from "vitest";
import { listCertifications } from "../../src/domain/certifications.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Certifications Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists certifications ordered by issue_date desc", async () => {
    const mockData = [{ id: "cert-1", name: "AWS Solutions Architect" }];

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

    const result = await listCertifications(supabase);
    expect(result).toEqual(mockData);
  });
});

import { describe, it, expect, vi } from "vitest";
import { listLanguages, createLanguage } from "../../src/domain/languages.js";
import { ConflictError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Languages Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists languages ordered by language asc", async () => {
    const mockData = [{ id: "lang-1", language: "English" }];

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

    const result = await listLanguages(supabase);
    expect(result).toEqual(mockData);
  });

  it("maps duplicate language error to ConflictError", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "unique constraint violation" },
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
      createLanguage(supabase, { language: "english" }),
    ).rejects.toThrow(ConflictError);
  });
});

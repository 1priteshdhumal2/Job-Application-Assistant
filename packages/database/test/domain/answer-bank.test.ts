import { describe, it, expect, vi } from "vitest";
import {
  listAnswerBank,
  createAnswerBankEntry,
} from "../../src/domain/answer-bank.js";
import { ConflictError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Answer Bank Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists answer bank entries with pagination", async () => {
    const mockEntries = [
      {
        id: "ans-1",
        concept_key: "notice_period",
        canonical_answer: "30 days",
      },
    ];

    const range = vi
      .fn()
      .mockResolvedValue({ data: mockEntries, count: 1, error: null });
    const order = vi.fn().mockReturnValue({ range });
    const eqUser = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await listAnswerBank(supabase);
    expect(result.data).toEqual(mockEntries);
    expect(result.total).toBe(1);
  });

  it("maps duplicate concept_key error to ConflictError", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "unique violation" },
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
      createAnswerBankEntry(supabase, {
        concept_key: "notice_period",
        canonical_answer: "30 days",
      }),
    ).rejects.toThrow(ConflictError);
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  listApplicationAnswers,
  createApplicationAnswer,
} from "../../src/domain/application-answers.js";
import { ValidationError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Application Answers Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists submitted answers verifying application ownership", async () => {
    const mockApp = { id: "app-1", user_id: mockUser.id };
    const mockAnswers = [
      {
        id: "ans-1",
        application_id: "app-1",
        question_text: "Notice period?",
        answer_value: "30 days",
      },
    ];

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockApp, error: null });
    const eqUserApp = vi.fn().mockReturnValue({ maybeSingle });
    const eqIdApp = vi.fn().mockReturnValue({ eq: eqUserApp });
    const selectApp = vi.fn().mockReturnValue({ eq: eqIdApp });

    const order = vi.fn().mockResolvedValue({ data: mockAnswers, error: null });
    const eqUserAns = vi.fn().mockReturnValue({ order });
    const eqIdAns = vi.fn().mockReturnValue({ eq: eqUserAns });
    const selectAns = vi.fn().mockReturnValue({ eq: eqIdAns });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "applications") return { select: selectApp };
      if (table === "application_answers") return { select: selectAns };
      return {};
    });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await listApplicationAnswers(supabase, "app-1");
    expect(result).toEqual(mockAnswers);
  });

  it("rejects answer creation if parent application is soft-deleted", async () => {
    const mockApp = {
      id: "app-1",
      user_id: mockUser.id,
      status: "APPLIED",
      deleted_at: "2026-08-21T00:00:00Z",
    };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockApp, error: null });
    const eqUserApp = vi.fn().mockReturnValue({ maybeSingle });
    const eqIdApp = vi.fn().mockReturnValue({ eq: eqUserApp });
    const selectApp = vi.fn().mockReturnValue({ eq: eqIdApp });

    const from = vi.fn().mockReturnValue({ select: selectApp });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    await expect(
      createApplicationAnswer(supabase, {
        application_id: "00000000-0000-0000-0000-000000000099",
        question_text: "Notice period?",
        answer_value: "30 days",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects answer creation if parent application is in terminal state", async () => {
    const mockApp = {
      id: "app-1",
      user_id: mockUser.id,
      status: "REJECTED",
      deleted_at: null,
    };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockApp, error: null });
    const eqUserApp = vi.fn().mockReturnValue({ maybeSingle });
    const eqIdApp = vi.fn().mockReturnValue({ eq: eqUserApp });
    const selectApp = vi.fn().mockReturnValue({ eq: eqIdApp });

    const from = vi.fn().mockReturnValue({ select: selectApp });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    await expect(
      createApplicationAnswer(supabase, {
        application_id: "00000000-0000-0000-0000-000000000099",
        question_text: "Notice period?",
        answer_value: "30 days",
      }),
    ).rejects.toThrow(ValidationError);
  });
});

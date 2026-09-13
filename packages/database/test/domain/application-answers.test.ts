import { describe, it, expect, vi } from "vitest";
import {
  listApplicationAnswers,
  listApplicationAnswersByPreparation,
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
        preparation_id: "prep-1",
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

  it("lists submitted answers by preparation ID", async () => {
    const mockPrep = { id: "prep-1", user_id: mockUser.id };
    const mockAnswers = [
      {
        id: "ans-1",
        preparation_id: "prep-1",
        question_text: "Expected CTC?",
        answer_value: "100k",
      },
    ];

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockPrep, error: null });
    const eqUserPrep = vi.fn().mockReturnValue({ maybeSingle });
    const eqIdPrep = vi.fn().mockReturnValue({ eq: eqUserPrep });
    const selectPrep = vi.fn().mockReturnValue({ eq: eqIdPrep });

    const order = vi.fn().mockResolvedValue({ data: mockAnswers, error: null });
    const eqUserAns = vi.fn().mockReturnValue({ order });
    const eqPrepAns = vi.fn().mockReturnValue({ eq: eqUserAns });
    const selectAns = vi.fn().mockReturnValue({ eq: eqPrepAns });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "application_preparations") return { select: selectPrep };
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

    const result = await listApplicationAnswersByPreparation(
      supabase,
      "prep-1",
    );
    expect(result).toEqual(mockAnswers);
  });

  it("rejects answer creation if parent preparation is in terminal state", async () => {
    const mockPrep = {
      id: "prep-1",
      user_id: mockUser.id,
      status: "REJECTED",
    };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockPrep, error: null });
    const eqUserPrep = vi.fn().mockReturnValue({ maybeSingle });
    const eqIdPrep = vi.fn().mockReturnValue({ eq: eqUserPrep });
    const selectPrep = vi.fn().mockReturnValue({ eq: eqIdPrep });

    const from = vi.fn().mockReturnValue({ select: selectPrep });

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
        preparation_id: "00000000-0000-0000-0000-000000000099",
        question_text: "Notice period?",
        answer_value: "30 days",
      }),
    ).rejects.toThrow(ValidationError);
  });
});

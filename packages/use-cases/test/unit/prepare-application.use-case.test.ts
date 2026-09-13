import { describe, it, expect, vi } from "vitest";
import { executePrepareApplication } from "../../src/applications/prepare-application.use-case.js";
import { UseCaseContext } from "../../src/common/context.js";
import type { Application } from "@jobpilot/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as databaseModule from "@jobpilot/database";

describe("PrepareApplicationUseCase (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("orchestrates application preparation and assigns idempotency key if missing", async () => {
    const mockApp = {
      id: "00000000-0000-0000-0000-000000000010",
      user_id: mockUser.id,
      job_id: "00000000-0000-0000-0000-000000000020",
      status: "SAVED",
      latest_preparation_id: "00000000-0000-0000-0000-000000000030",
    };

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const prepareSpy = vi
      .spyOn(databaseModule, "prepareApplication")
      .mockResolvedValue(mockApp as unknown as Application);

    const context: UseCaseContext = { supabase };

    const result = await executePrepareApplication(context, {
      application_id: "00000000-0000-0000-0000-000000000010",
      job_id: "00000000-0000-0000-0000-000000000020",
      answers: [
        {
          question_text: "Years of experience?",
          answer_value: "5",
        },
      ],
    });

    expect(result).toEqual(mockApp);
    expect(prepareSpy).toHaveBeenCalledOnce();
    const callArg = prepareSpy.mock.calls[0]![1];
    expect(callArg.idempotency_key).toBeDefined();
    expect(typeof callArg.idempotency_key).toBe("string");
  });

  it("validates input schema before delegating to database", async () => {
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const context: UseCaseContext = { supabase };

    await expect(
      executePrepareApplication(context, {
        application_id: "invalid-uuid",
      }),
    ).rejects.toThrow();
  });

  it("propagates InvalidStateTransitionError when application is not preparable", async () => {
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    vi.spyOn(databaseModule, "prepareApplication").mockRejectedValue(
      new databaseModule.InvalidStateTransitionError(
        "APPLICATION_STATUS_NOT_PREPARABLE: APPLIED",
      ),
    );

    const context: UseCaseContext = { supabase };

    await expect(
      executePrepareApplication(context, {
        application_id: "00000000-0000-0000-0000-000000000010",
      }),
    ).rejects.toThrow(databaseModule.InvalidStateTransitionError);
  });
});

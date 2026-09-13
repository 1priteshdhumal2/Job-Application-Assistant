import { describe, it, expect, vi } from "vitest";
import { executeTransitionApplicationStatus } from "../../src/applications/transition-application-status.use-case.js";
import { UseCaseContext } from "../../src/common/context.js";
import type { Application } from "@jobpilot/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as databaseModule from "@jobpilot/database";

describe("TransitionApplicationStatusUseCase (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("orchestrates status transition via database service", async () => {
    const mockApp = {
      id: "app-1",
      user_id: mockUser.id,
      status: "APPLIED",
    };

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const transitionSpy = vi
      .spyOn(databaseModule, "transitionApplicationStatus")
      .mockResolvedValue(mockApp as unknown as Application);

    const context: UseCaseContext = { supabase };

    const result = await executeTransitionApplicationStatus(
      context,
      "app-1",
      "APPLIED",
    );

    expect(result).toEqual(mockApp);
    expect(transitionSpy).toHaveBeenCalledWith(supabase, "app-1", "APPLIED");
  });
});

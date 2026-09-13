import { describe, it, expect, vi } from "vitest";
import { executeArchiveApplication } from "../../src/applications/archive-application.use-case.js";
import { executeRestoreApplication } from "../../src/applications/restore-application.use-case.js";
import { UseCaseContext } from "../../src/common/context.js";
import type { Application } from "@jobpilot/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as databaseModule from "@jobpilot/database";

describe("Archive and Restore Application UseCases (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("orchestrates soft deletion via archive use case", async () => {
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const archiveSpy = vi
      .spyOn(databaseModule, "softDeleteApplication")
      .mockResolvedValue();

    const context: UseCaseContext = { supabase };

    await executeArchiveApplication(context, "app-1");
    expect(archiveSpy).toHaveBeenCalledWith(supabase, "app-1");
  });

  it("orchestrates restoration via restore use case", async () => {
    const mockApp = {
      id: "app-1",
      user_id: mockUser.id,
      deleted_at: null,
      status: "SAVED",
    };

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const restoreSpy = vi
      .spyOn(databaseModule, "restoreApplication")
      .mockResolvedValue(mockApp as unknown as Application);

    const context: UseCaseContext = { supabase };

    const result = await executeRestoreApplication(context, "app-1");
    expect(result).toEqual(mockApp);
    expect(restoreSpy).toHaveBeenCalledWith(supabase, "app-1");
  });
});

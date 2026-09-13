import { describe, it, expect, vi } from "vitest";
import {
  listApplications,
  transitionApplicationStatus,
  prepareApplication,
  listApplicationPreparations,
  getApplicationPreparation,
  softDeleteApplication,
  restoreApplication,
} from "../../src/domain/applications.js";
import { InvalidStateTransitionError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Applications Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists active applications automatically excluding deleted records", async () => {
    const mockApps = [{ id: "app-1", status: "APPLIED", deleted_at: null }];

    const range = vi
      .fn()
      .mockResolvedValue({ data: mockApps, count: 1, error: null });
    const order = vi.fn().mockReturnValue({ range });
    const isDeleted = vi.fn().mockReturnValue({ order });
    const eqUser = vi.fn().mockReturnValue({ is: isDeleted });
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

    const result = await listApplications(supabase);
    expect(result.data).toEqual(mockApps);
    expect(isDeleted).toHaveBeenCalledWith("deleted_at", null);
  });

  it("transitions application status via RPC", async () => {
    const mockUpdated = {
      id: "app-1",
      status: "INTERVIEW",
      applied_at: "2026-08-21T00:00:00Z",
    };

    const rpc = vi.fn().mockResolvedValue({ data: mockUpdated, error: null });
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc,
    } as unknown as SupabaseClient;

    const result = await transitionApplicationStatus(
      supabase,
      "app-1",
      "INTERVIEW",
    );
    expect(result.status).toBe("INTERVIEW");
    expect(rpc).toHaveBeenCalledWith("transition_application_status", {
      p_application_id: "app-1",
      p_to_status: "INTERVIEW",
    });
  });

  it("handles RPC invalid transition error mapping to InvalidStateTransitionError", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "P0001",
        message:
          "INVALID_STATUS_TRANSITION: Cannot transition from REJECTED to APPLIED",
      },
    });
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc,
    } as unknown as SupabaseClient;

    await expect(
      transitionApplicationStatus(supabase, "app-1", "APPLIED"),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it("prepares application atomically via RPC", async () => {
    const mockApp = {
      id: "00000000-0000-0000-0000-000000000010",
      user_id: mockUser.id,
      status: "SAVED",
      latest_preparation_id: "00000000-0000-0000-0000-000000000030",
    };

    const rpc = vi.fn().mockResolvedValue({ data: mockApp, error: null });
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc,
    } as unknown as SupabaseClient;

    const result = await prepareApplication(supabase, {
      application_id: "00000000-0000-0000-0000-000000000010",
      job_id: "00000000-0000-0000-0000-000000000020",
      idempotency_key: "00000000-0000-0000-0000-000000000099",
      answers: [{ question_text: "Why us?", answer_value: "Great mission." }],
    });

    expect(result).toEqual(mockApp);
    expect(rpc).toHaveBeenCalledWith(
      "prepare_application",
      expect.objectContaining({
        p_application_id: "00000000-0000-0000-0000-000000000010",
        p_idempotency_key: "00000000-0000-0000-0000-000000000099",
      }),
    );
  });

  it("lists application preparations", async () => {
    const mockPreps = [
      {
        id: "prep-1",
        user_id: mockUser.id,
        application_id: "app-1",
        preparation_number: 1,
      },
    ];

    const order = vi.fn().mockResolvedValue({ data: mockPreps, error: null });
    const eqUser = vi.fn().mockReturnValue({ order });
    const orApp = vi.fn().mockReturnValue({ eq: eqUser });
    const select = vi.fn().mockReturnValue({ or: orApp });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await listApplicationPreparations(supabase, "app-1");
    expect(result).toEqual(mockPreps);
  });

  it("gets a single application preparation", async () => {
    const mockPrep = {
      id: "prep-1",
      user_id: mockUser.id,
      preparation_number: 1,
    };

    const single = vi.fn().mockResolvedValue({ data: mockPrep, error: null });
    const eqUser = vi.fn().mockReturnValue({ single });
    const eqId = vi.fn().mockReturnValue({ eq: eqUser });
    const select = vi.fn().mockReturnValue({ eq: eqId });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await getApplicationPreparation(supabase, "prep-1");
    expect(result).toEqual(mockPrep);
  });

  it("soft-deletes application setting deleted_at timestamp", async () => {
    const isNull = vi.fn().mockResolvedValue({ error: null, count: 1 });
    const eqUser = vi.fn().mockReturnValue({ is: isNull });
    const eqId = vi.fn().mockReturnValue({ eq: eqUser });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    const from = vi.fn().mockReturnValue({ update });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    await expect(
      softDeleteApplication(supabase, "app-1"),
    ).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
      { count: "exact" },
    );
  });

  it("restores soft-deleted application", async () => {
    const mockRestored = { id: "app-1", status: "SAVED", deleted_at: null };

    const single = vi
      .fn()
      .mockResolvedValue({ data: mockRestored, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const notNull = vi.fn().mockReturnValue({ select });
    const eqUser = vi.fn().mockReturnValue({ not: notNull });
    const eqId = vi.fn().mockReturnValue({ eq: eqUser });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    const from = vi.fn().mockReturnValue({ update });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await restoreApplication(supabase, "app-1");
    expect(result.deleted_at).toBeNull();
  });

  it("handles RPC preparation error on non-preparable status mapping to InvalidStateTransitionError", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "P0001",
        message: "APPLICATION_STATUS_NOT_PREPARABLE: APPLIED",
      },
    });
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc,
    } as unknown as SupabaseClient;

    await expect(
      prepareApplication(supabase, {
        application_id: "00000000-0000-0000-0000-000000000010",
      }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});

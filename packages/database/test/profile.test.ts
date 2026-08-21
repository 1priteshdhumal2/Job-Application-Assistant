import { describe, it, expect, vi } from "vitest";
import { getCurrentProfile, updateCurrentProfile } from "../src/profile.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Profile Service (Current User Identity Model)", () => {
  const mockUserId = "11111111-2222-3333-4444-555555555555";

  it("getCurrentProfile derives user identity from session and fetches profile", async () => {
    const mockProfileData = {
      id: mockUserId,
      display_name: "Alice Smith",
      avatar_url: "https://example.com/alice.png",
      onboarding_status: "ACTIVE",
      created_at: "2026-08-21T00:00:00Z",
      updated_at: "2026-08-21T00:00:00Z",
    };

    const singleMock = vi.fn().mockResolvedValue({
      data: mockProfileData,
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      from: fromMock,
    } as unknown as SupabaseClient;

    const profile = await getCurrentProfile(mockSupabase);

    expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(eqMock).toHaveBeenCalledWith("id", mockUserId);
    expect(profile).toEqual(mockProfileData);
  });

  it("getCurrentProfile throws AuthError when unauthenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("Session expired"),
        }),
      },
    } as unknown as SupabaseClient;

    await expect(getCurrentProfile(mockSupabase)).rejects.toThrow(
      /No authenticated user session found/,
    );
  });

  it("updateCurrentProfile updates only the current authenticated user profile", async () => {
    const updatedData = {
      id: mockUserId,
      display_name: "Alice Updated",
      avatar_url: null,
      onboarding_status: "ACTIVE",
      created_at: "2026-08-21T00:00:00Z",
      updated_at: "2026-08-21T01:00:00Z",
    };

    const singleMock = vi.fn().mockResolvedValue({
      data: updatedData,
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ update: updateMock });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      from: fromMock,
    } as unknown as SupabaseClient;

    const result = await updateCurrentProfile(mockSupabase, {
      display_name: "Alice Updated",
    });

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(updateMock).toHaveBeenCalledWith({
      display_name: "Alice Updated",
      avatar_url: undefined,
    });
    expect(eqMock).toHaveBeenCalledWith("id", mockUserId);
    expect(result.display_name).toBe("Alice Updated");
  });
});

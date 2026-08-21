import { describe, it, expect } from "vitest";
import { validateProfileUpdate } from "../src/profile.js";

describe("Profile Validation", () => {
  it("validates valid profile update payload", () => {
    const valid = {
      display_name: "Jane Doe",
      avatar_url: "https://example.com/avatar.jpg",
    };
    const result = validateProfileUpdate(valid);
    expect(result.display_name).toBe("Jane Doe");
    expect(result.avatar_url).toBe("https://example.com/avatar.jpg");
  });

  it("allows empty string or null for avatar_url", () => {
    const result1 = validateProfileUpdate({ avatar_url: "" });
    expect(result1.avatar_url).toBe("");

    const result2 = validateProfileUpdate({ avatar_url: null });
    expect(result2.avatar_url).toBeNull();
  });

  it("rejects display name exceeding 100 characters", () => {
    const tooLong = "a".repeat(101);
    expect(() => validateProfileUpdate({ display_name: tooLong })).toThrow(
      /must not exceed 100 characters/,
    );
  });

  it("rejects invalid avatar URL", () => {
    expect(() =>
      validateProfileUpdate({ avatar_url: "not-a-valid-url" }),
    ).toThrow(/must be a valid URL/);
  });
});

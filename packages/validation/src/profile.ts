import { z } from "zod";

export const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .max(100, "Display name must not exceed 100 characters")
    .nullable()
    .optional(),
  avatar_url: z
    .string()
    .url("Avatar URL must be a valid URL")
    .or(z.literal(""))
    .nullable()
    .optional(),
});

export type ProfileUpdateSchemaType = z.infer<typeof profileUpdateSchema>;

export function validateProfileUpdate(data: unknown): ProfileUpdateSchemaType {
  return profileUpdateSchema.parse(data);
}

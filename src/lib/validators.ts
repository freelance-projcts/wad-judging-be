import { z } from "zod";

export const provinces = [
  "WESTERN",
  "CENTRAL",
  "SOUTHERN",
  "NORTHERN",
  "EASTERN",
  "NORTH_WESTERN",
  "NORTH_CENTRAL",
  "UVA",
  "SABARAGAMUWA",
] as const;

export const provinceLabels: Record<string, string> = {
  WESTERN: "Western",
  CENTRAL: "Central",
  SOUTHERN: "Southern",
  NORTHERN: "Northern",
  EASTERN: "Eastern",
  NORTH_WESTERN: "North Western",
  NORTH_CENTRAL: "North Central",
  UVA: "Uva",
  SABARAGAMUWA: "Sabaragamuwa",
};

export const genders = ["MALE", "FEMALE", "OTHER"] as const;
export const genderLabels: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

/**
 * Normalize a query-string enum filter (e.g. "Male", "north western") against
 * a list of allowed values (e.g. genders/provinces, which are stored upper-cased).
 * Returns { value: undefined, invalid: false } when the param wasn't given at
 * all, and { value: undefined, invalid: true } when it was given but doesn't
 * match anything - callers should treat that as "no results" rather than
 * passing the raw string straight into a Prisma enum filter, which throws.
 */
export function normalizeEnumParam<T extends string>(
  value: string | null,
  allowed: readonly T[]
): { value: T | undefined; invalid: boolean } {
  if (!value) return { value: undefined, invalid: false };
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const match = allowed.find((a) => a === normalized);
  return match ? { value: match, invalid: false } : { value: undefined, invalid: true };
}

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  mobileNumber: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[0-9+\-\s]{7,15}$/.test(v), { message: "Enter a valid mobile number" }),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const teams = ["A", "B"] as const;

export const studentSchema = z.object({
  code: z.string().trim().min(1, "ID is required").max(20),
  fullName: z.string().trim().min(2, "Full name is required").max(150),
  gender: z.enum(genders),
  province: z.enum(provinces),
  photoUrl: z.string().optional().nullable(),
  team: z.enum(teams).optional().nullable(),
});

export const studentUpdateSchema = studentSchema.partial();

export const eventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(100),
  gender: z.enum(genders),
  defaultPerformanceId: z.string().min(1).optional().nullable(),
  // No .default() here - eventSchema is shared by create AND update (PATCH spreads
  // the parsed result straight into Prisma with no partial variant), and a zod
  // default would silently reset this to false on every unrelated PATCH that
  // doesn't resend it. Omitted means "leave untouched" on update, and falls
  // through to the Prisma column's own @default(false) on create.
  supportsMultipleRounds: z.boolean().optional(),
});

/** D/E1-E4/P are each judge's own mark - no separate "supervisor" field per score. */
export const markScoresSchema = z.object({
  D: z.number().min(0).max(10),
  E1: z.number().min(0).max(10),
  E2: z.number().min(0).max(10),
  E3: z.number().min(0).max(10),
  E4: z.number().min(0).max(10),
  P: z.number().min(0).max(10).default(0),
});

export const markEntrySchema = z.object({
  studentId: z.string().min(1),
  eventId: z.string().min(1),
  performanceId: z.string().min(1),
  // Most events are single-round; a configurable few (Event.supportsMultipleRounds)
  // allow exactly 2. The hard cap of 2 is enforced here - whether 2 is actually
  // allowed for a given event is an application-level check in mark-service.ts.
  round: z.number().int().min(1).max(2).optional().default(1),
  scores: markScoresSchema,
});

export const editRequestCreateSchema = z.object({
  markEntryId: z.string().min(1),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const editRequestResolveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  avatarUrl: z.string().optional().nullable(),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid mobile number")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

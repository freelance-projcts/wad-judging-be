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

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const studentSchema = z.object({
  code: z.string().trim().min(1, "ID is required").max(20),
  fullName: z.string().trim().min(2, "Full name is required").max(150),
  gender: z.enum(genders),
  province: z.enum(provinces),
  photoUrl: z.string().optional().nullable(),
});

export const studentUpdateSchema = studentSchema.partial().extend({
  team: z.enum(["A", "B"]).optional().nullable(),
});

export const eventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(100),
  gender: z.enum(genders),
});

export const teamAssignSchema = z.object({
  studentId: z.string().min(1),
  team: z.enum(["A", "B"]),
});

export const roundScoresSchema = z.object({
  round: z.number().int().min(1).max(10),
  d: z.number().min(0).max(10),
  dSupervisor: z.string().trim().max(150).optional().nullable(),
  e1: z.number().min(0).max(10),
  e1Supervisor: z.string().trim().max(150).optional().nullable(),
  e2: z.number().min(0).max(10),
  e2Supervisor: z.string().trim().max(150).optional().nullable(),
  e3: z.number().min(0).max(10),
  e3Supervisor: z.string().trim().max(150).optional().nullable(),
  e4: z.number().min(0).max(10),
  e4Supervisor: z.string().trim().max(150).optional().nullable(),
  p: z.number().min(0).max(10).default(0),
  pSupervisor: z.string().trim().max(150).optional().nullable(),
});

export const markEntrySchema = z.object({
  studentId: z.string().min(1),
  eventId: z.string().min(1),
  performanceId: z.string().min(1),
  rounds: z.array(roundScoresSchema).min(1, "At least one round is required"),
});

export const editRequestCreateSchema = z.object({
  markEntryId: z.string().min(1),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const editRequestResolveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  avatarUrl: z.string().optional().nullable(),
});

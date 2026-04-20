import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  phone: z
    .string()
    .min(6, "Please include a valid phone number")
    .optional()
    .or(z.literal("")),
  teacherOrSchool: z.string().min(2).optional().or(z.literal("")),
  portfolioUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const STYLE_TAGS = [
  "urban",
  "rustic",
  "nature",
  "water",
  "graffiti",
  "industrial",
  "interior",
  "fashion",
  "moody",
  "golden-hour",
  "minimalist",
  "wedding",
] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

export const submitLocationSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(4000),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  wheelchair: z.boolean().default(false),
  publicTransport: z.boolean().default(false),
  restroom: z.boolean().default(false),
  changingRoom: z.boolean().default(false),
  paid: z.boolean().default(false),
  priceMin: z.coerce.number().int().nonnegative().nullable().optional(),
  priceMax: z.coerce.number().int().nonnegative().nullable().optional(),
  styleTags: z.array(z.string()).default([]),
  isSecret: z.boolean().default(false),
  photos: z
    .array(
      z.object({
        cloudinaryPublicId: z.string().min(1),
        kind: z.enum(["INSPIRATION", "TECHNICAL"]),
        width: z.number().int().nullable().optional(),
        height: z.number().int().nullable().optional(),
        caption: z.string().max(280).nullable().optional(),
      }),
    )
    .min(1, "Add at least one photo"),
});
export type SubmitLocationInput = z.infer<typeof submitLocationSchema>;

export const statusUpdateSchema = z.object({
  body: z.string().min(3).max(500),
  kind: z.enum(["BLOOM", "CONSTRUCTION", "ACCESS", "WEATHER", "EVENT", "OTHER"]),
});
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;

export const ratingSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
});

export const adminDecisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE") }),
  z.object({ decision: z.literal("APPROVE_NO_POINTS") }),
  z.object({ decision: z.literal("REJECT"), reason: z.string().optional() }),
  z.object({ decision: z.literal("REVISION"), feedback: z.string().min(3) }),
]);

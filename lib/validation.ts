import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "v:fullNameMin"),
  email: z.string().email("v:emailInvalid"),
  password: z.string().min(8, "v:passwordMin"),
  phone: z
    .string()
    .min(6, "v:phoneMin")
    .optional()
    .or(z.literal("")),
  teacherOrSchool: z.string().min(2, "v:teacherMin").optional().or(z.literal("")),
  portfolioUrl: z
    .string()
    .url("v:urlInvalid")
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

export const AMENITY_SLUGS = [
  "wheelchair",
  "publicTransport",
  "restroom",
  "changingRoom",
  "drone",
] as const;

const photoItemSchema = z.object({
  cloudinaryPublicId: z.string().min(1),
  kind: z.enum(["INSPIRATION", "TECHNICAL"]),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  caption: z.string().max(280).nullable().optional(),
});

const filterEntrySchema = z.object({
  slug: z.string().min(1),
  boolValue: z.boolean().default(true),
  numValue: z.number().int().nullable().optional(),
});

const submitLocationBase = z.object({
  title: z.string().min(3, "v:titleMin").max(120),
  description: z.string().min(20, "v:descriptionMin").max(4000),
  directions: z
    .string()
    .max(2000, "v:directionsMax")
    .optional()
    .or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  filters: z.array(filterEntrySchema).default([]),
});

export const submitLocationSchema = submitLocationBase.extend({
  photos: z.array(photoItemSchema).min(1, "v:needPhoto"),
});
export type SubmitLocationInput = z.infer<typeof submitLocationSchema>;

export const adminSubmitLocationSchema = submitLocationBase.extend({
  photos: z.array(photoItemSchema).default([]),
});
export type AdminSubmitLocationInput = z.infer<typeof adminSubmitLocationSchema>;

export const updateLocationSchema = submitLocationBase.extend({
  status: z
    .enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "NEEDS_REVISION"])
    .optional(),
  newFeedback: z.string().max(2000).optional(),
  unlockCost: z.coerce.number().int().min(0).optional(),
  keepPhotoIds: z.array(z.string()).default([]),
  newPhotos: z.array(photoItemSchema).default([]),
});
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

export type FilterEntry = z.infer<typeof filterEntrySchema>;

export const statusUpdateSchema = z.object({
  body: z.string().min(3).max(500),
  kind: z.enum(["BLOOM", "CONSTRUCTION", "ACCESS", "WEATHER", "EVENT", "OTHER"]),
});
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;

export const ratingSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  title: z
    .string()
    .max(120, "v:reviewTitleMax")
    .optional()
    .or(z.literal("")),
  body: z
    .string()
    .max(2000, "v:reviewBodyMax")
    .optional()
    .or(z.literal("")),
});

export const addPhotosSchema = z.object({
  photos: z
    .array(photoItemSchema)
    .min(1, "v:needPhoto")
    .max(10, "v:tooManyPhotos"),
});
export type AddPhotosInput = z.infer<typeof addPhotosSchema>;

export const photoDecisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE") }),
  z.object({
    decision: z.literal("REJECT"),
    reviewNote: z.string().max(500).optional(),
  }),
]);

export const adminDecisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE") }),
  z.object({ decision: z.literal("APPROVE_NO_POINTS") }),
  z.object({ decision: z.literal("REJECT"), reason: z.string().optional() }),
  z.object({ decision: z.literal("REVISION"), feedback: z.string().min(3) }),
]);

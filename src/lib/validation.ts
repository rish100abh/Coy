import { z } from "zod";

const genderSchema = z.enum([
  "WOMAN",
  "MAN",
  "NON_BINARY",
  "ANOTHER_IDENTITY",
  "UNDISCLOSED",
]);

const discoveryPreferenceSchema = z.enum([
  "EVERYONE",
  "WOMEN",
  "MEN",
  "NON_BINARY_AND_OTHER",
  "PREFER_NOT_TO_SAY",
]);

const interestsSchema = z.array(z.string().trim().min(1).max(30)).max(6);

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(40),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(10).max(128),
  age: z.number().int().min(18).max(99),
  city: z.string().trim().min(1).max(60),
  gender: genderSchema,
  interestedIn: z.array(discoveryPreferenceSchema).min(1).max(5),
});

export const signInSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  age: z.number().int().min(18).max(99),
  city: z.string().trim().min(1).max(60),
  gender: genderSchema,
  interestedIn: z.array(discoveryPreferenceSchema).min(1).max(5),
  bio: z.string().trim().max(240),
  occupation: z.string().trim().max(60),
  interests: interestsSchema,
  photo: z.string().max(700 * 1024).nullable().optional(),
});

export const swipeSchema = z.object({
  targetUserId: z.string().trim().min(1).max(100),
  action: z.enum(["LIKE", "PASS"]),
});

export const messageSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

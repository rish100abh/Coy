import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DemoProfile } from "@/types";

const SESSION_COOKIE = "coy_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;

function derivePassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derivePassword(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const [algorithm, salt, storedHex] = encoded?.split("$") ?? [];
  if (algorithm !== "scrypt" || !salt || !storedHex || !/^[a-f\d]{128}$/i.test(storedHex)) {
    await derivePassword(password, "coy-invalid-password-salt");
    return false;
  }

  const storedKey = Buffer.from(storedHex, "hex");
  const suppliedKey = await derivePassword(password, salt);
  return storedKey.length === suppliedKey.length && timingSafeEqual(storedKey, suppliedKey);
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  return value && /^[a-f\d]{64}$/i.test(value) ? value : null;
}

export function serializeProfile(user: Pick<
  User,
  "id" | "email" | "name" | "age" | "city" | "gender" | "interestedIn" | "bio" | "occupation" | "photo" | "interests"
>): DemoProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    age: user.age,
    city: user.city,
    gender: user.gender,
    interestedIn: user.interestedIn.split("|").map((value) => value.trim()).filter(Boolean),
    bio: user.bio,
    occupation: user.occupation ?? "",
    photo: user.photo,
    interests: user.interests.split("|").map((value) => value.trim()).filter(Boolean),
  };
}

export async function createUserSession(userId: string) {
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: { userId, tokenHash: hashSessionToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export function setSessionCookie<T extends NextResponse>(
  response: T,
  session: { token: string; expiresAt: Date },
): T {
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}

export function clearSessionCookie<T extends NextResponse>(response: T): T {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function deleteUserSession(request: Request) {
  const token = getSessionToken(request);
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

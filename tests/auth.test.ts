import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createUserSession,
  deleteUserSession,
  getAuthenticatedUser,
  hashPassword,
  verifyPassword,
} from "../src/lib/auth";
import { signInSchema, signUpSchema } from "../src/lib/validation";
import { prisma } from "../src/lib/prisma";

describe("account security", () => {
  it("stores a salted password hash and verifies only the matching password", async () => {
    const hash = await hashPassword("a-long-demo-password");
    expect(hash).not.toContain("a-long-demo-password");
    expect(await verifyPassword("a-long-demo-password", hash)).toBe(true);
    expect(await verifyPassword("a-different-password", hash)).toBe(false);
  });

  it("normalizes signup emails and requires adults to choose a long password", () => {
    const result = signUpSchema.safeParse({
      name: "Test User",
      email: "  TEST@example.com ",
      password: "a-long-demo-password",
      age: 24,
      city: "Delhi",
      gender: "UNDISCLOSED",
      interestedIn: ["EVERYONE"],
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("test@example.com");
    expect(signUpSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "short",
      age: 17,
      city: "Delhi",
      gender: "UNDISCLOSED",
      interestedIn: ["EVERYONE"],
    }).success).toBe(false);
  });

  it("normalizes email on sign-in", () => {
    expect(signInSchema.parse({ email: "USER@Example.com", password: "password" }).email)
      .toBe("user@example.com");
  });

  it("stores only a session-token hash and revokes sessions on sign-out", async () => {
    const id = randomUUID();
    const email = `${id}@example.com`;
    const user = await prisma.user.create({
      data: {
        id,
        email,
        passwordHash: await hashPassword("another-long-password"),
        name: "Session test",
        age: 24,
        photo: "https://example.com/photo.jpg",
        bio: "",
        city: "Delhi",
        interests: "",
      },
    });

    try {
      const session = await createUserSession(user.id);
      const tokenHash = createHash("sha256").update(session.token).digest("hex");
      const request = new Request("https://coy.example/api/auth/me", {
        headers: { cookie: `coy_session=${session.token}` },
      });

      expect(await prisma.session.findUnique({ where: { tokenHash } })).not.toBeNull();
      expect(tokenHash).not.toBe(session.token);
      expect((await getAuthenticatedUser(request))?.id).toBe(user.id);

      await deleteUserSession(request);
      expect(await getAuthenticatedUser(request)).toBeNull();
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});

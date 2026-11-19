import { NextResponse } from "next/server";
import { createUserSession, serializeProfile, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = signInSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const passwordMatches = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
    if (!user || !passwordMatches) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const session = await createUserSession(user.id);
    const response = NextResponse.json({ profile: serializeProfile(user) });
    return setSessionCookie(response, session);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    console.error("Sign-in error", error);
    return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 });
  }
}

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createUserSession, hashPassword, serializeProfile, setSessionCookie } from "@/lib/auth";
import { seedDemoIncomingLikes } from "@/lib/demo-matches";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validation";

const FEMALE_PHOTO = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85";
const MALE_PHOTO = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85";

export async function POST(request: Request) {
  try {
    const parsed = signUpSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your details and try again.", details: parsed.error.flatten() }, { status: 400 });
    }

    const profile = parsed.data;
    const userId = randomUUID();
    const passwordHash = await hashPassword(profile.password);
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          id: userId,
          email: profile.email,
          passwordHash,
          name: profile.name,
          age: profile.age,
          photo: profile.gender === "MAN" ? MALE_PHOTO : FEMALE_PHOTO,
          bio: "Here to meet someone genuine and see where a good conversation goes.",
          city: profile.city,
          interests: "",
          gender: profile.gender,
          interestedIn: profile.interestedIn.join("|"),
        },
      });
      await seedDemoIncomingLikes(transaction, createdUser);
      return createdUser;
    });

    const session = await createUserSession(user.id);
    const response = NextResponse.json({ profile: serializeProfile(user) }, { status: 201 });
    return setSessionCookie(response, session);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists. Sign in instead." }, { status: 409 });
    }
    console.error("Sign-up error", error);
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}

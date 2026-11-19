import { NextResponse } from "next/server";
import { getAuthenticatedUser, serializeProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validation";

const FEMALE_PHOTO = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85";
const MALE_PHOTO = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85";

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const parsed = profileUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your profile details.", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        age: data.age,
        city: data.city,
        gender: data.gender,
        interestedIn: data.interestedIn.join("|"),
        bio: data.bio,
        occupation: data.occupation || null,
        interests: data.interests.join("|"),
        photo: data.photo === undefined
          ? user.photo
          : data.photo ?? (data.gender === "MAN" ? MALE_PHOTO : FEMALE_PHOTO),
      },
    });
    return NextResponse.json({ profile: serializeProfile(updatedUser) });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    console.error("Update profile error", error);
    return NextResponse.json({ error: "Could not save your profile. Please try again." }, { status: 500 });
  }
}

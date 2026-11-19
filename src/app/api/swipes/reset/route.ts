import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { resetUserFeed } from "@/lib/discovery";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    await resetUserFeed(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Swipe reset error", error);
    return NextResponse.json({ error: "Could not reset swipes" }, { status: 500 });
  }
}

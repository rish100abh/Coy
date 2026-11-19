import { NextResponse } from "next/server";
import { getAuthenticatedUser, serializeProfile } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    return NextResponse.json({ profile: serializeProfile(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Load account error", error);
    return NextResponse.json({ error: "Could not load your account" }, { status: 500 });
  }
}

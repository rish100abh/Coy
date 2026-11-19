import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getMutualMatches } from "@/lib/discovery";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const matches = await getMutualMatches(user.id);
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Matches error", error);
    return NextResponse.json({ error: "Could not load matches" }, { status: 500 });
  }
}

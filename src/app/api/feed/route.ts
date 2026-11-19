import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getFeed } from "@/lib/discovery";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") ?? "20");
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50) {
      return NextResponse.json({ error: "Limit must be an integer from 1 to 50" }, { status: 400 });
    }

    const profiles = await getFeed(user.id, rawLimit);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Feed error", error);
    return NextResponse.json({ error: "Could not load profiles" }, { status: 500 });
  }
}

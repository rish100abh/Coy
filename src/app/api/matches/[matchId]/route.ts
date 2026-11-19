import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { removeUserMatch } from "@/lib/discovery";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser(_request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const { matchId } = await params;
    if (!matchId || matchId.length > 100) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const removed = await removeUserMatch(user.id, matchId);
    if (!removed) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove match error", error);
    return NextResponse.json({ error: "Could not remove match" }, { status: 500 });
  }
}

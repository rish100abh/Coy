import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { applySwipe } from "@/lib/discovery";
import { swipeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const body = await request.json();
    const parsed = swipeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid swipe", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await applySwipe(user.id, parsed.data.targetUserId, parsed.data.action);
    if (result.kind === "NOT_FOUND") {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (result.kind === "INVALID_TARGET") {
      return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
    }
    if (result.kind === "DUPLICATE") {
      return NextResponse.json({ error: "Profile has already been swiped" }, { status: 409 });
    }
    if (result.kind === "SUCCESS") {
      return NextResponse.json({
        success: true,
        matched: result.matched,
        ...(result.match ? { match: result.match } : {}),
      });
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    console.error("Swipe error", error);
    return NextResponse.json({ error: "Could not save swipe" }, { status: 500 });
  }
}

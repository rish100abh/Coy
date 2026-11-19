import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getUserConversation, sendUserMessage } from "@/lib/discovery";
import { messageSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser(_request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const { matchId } = await params;
    const messages = await getUserConversation(user.id, matchId);
    if (!messages) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Load conversation error", error);
    return NextResponse.json({ error: "Could not load conversation" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const { matchId } = await params;
    const parsed = messageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Message must be between 1 and 1000 characters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const message = await sendUserMessage(user.id, matchId, parsed.data.text);
    if (!message) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    console.error("Send message error", error);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}

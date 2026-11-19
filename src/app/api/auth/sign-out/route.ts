import { NextResponse } from "next/server";
import { clearSessionCookie, deleteUserSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await deleteUserSession(request);
    return clearSessionCookie(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("Sign-out error", error);
    return NextResponse.json({ error: "Could not sign out. Please try again." }, { status: 500 });
  }
}

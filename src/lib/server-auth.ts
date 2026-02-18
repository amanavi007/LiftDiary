import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

export async function requireApiUserId() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return userId;
}

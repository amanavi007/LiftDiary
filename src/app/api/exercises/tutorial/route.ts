import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUserId } from "@/lib/server-auth";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

function extractVideoId(html: string) {
  const matches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
  const seen = new Set<string>();

  for (const match of matches) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      return id;
    }
  }

  return null;
}

export async function GET(request: Request) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(parsed.data.q)}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch tutorial" }, { status: 502 });
    }

    const html = await response.text();
    const videoId = extractVideoId(html);

    if (!videoId) {
      return NextResponse.json({ error: "No tutorial found" }, { status: 404 });
    }

    return NextResponse.json({ videoId });
  } catch {
    return NextResponse.json({ error: "Tutorial lookup failed" }, { status: 502 });
  }
}

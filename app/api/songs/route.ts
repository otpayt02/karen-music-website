import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { songs } from "../../../db/schema";

type SongPayload = {
  id?: number;
  titleKaren?: string;
  titleEnglish?: string;
  style?: string;
  key?: string;
  bpm?: number;
  meter?: string;
  group?: string;
  sections?: unknown[];
};

function parseSong(row: typeof songs.$inferSelect) {
  return { ...JSON.parse(row.payload), id: row.id, updatedAt: row.updatedAt };
}

export async function GET() {
  try {
    const rows = await getDb().select().from(songs).orderBy(desc(songs.updatedAt), desc(songs.id)).limit(200);
    return Response.json({ songs: rows.map(parseSong) });
  } catch {
    return Response.json({
      songs: [],
      warning: "Hosted library is unavailable; this draft remains local",
    });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as SongPayload;
    if (!payload.titleEnglish?.trim() || !Array.isArray(payload.sections)) {
      return Response.json({ error: "English title and chart sections are required" }, { status: 400 });
    }
    const record = {
      titleKaren: payload.titleKaren?.trim() ?? "",
      titleEnglish: payload.titleEnglish.trim(),
      style: payload.style?.trim() || "Worship",
      songKey: payload.key?.trim() || "C",
      bpm: Math.max(1, Number(payload.bpm) || 72),
      meter: payload.meter?.trim() || "4/4",
      songGroup: payload.group?.trim() ?? "",
      payload: JSON.stringify({ ...payload, id: undefined }),
      updatedAt: new Date().toISOString(),
    };
    const [saved] = await getDb().insert(songs).values(record).returning();
    return Response.json({ song: parseSong(saved) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 500 });
  }
}

import { desc, eq } from "drizzle-orm";
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
  sourceKind?: string;
  reviewState?: string;
  saveApproval?: {
    reviewed?: boolean;
    syntheticOrApproved?: boolean;
  };
};

function parseSong(row: typeof songs.$inferSelect) {
  return { ...JSON.parse(row.payload), id: row.id, updatedAt: row.updatedAt };
}

const MAX_PAYLOAD_BYTES = 500_000;
const USER_EMAIL_HEADER = "oai-authenticated-user-email";

async function ownerKeyFor(request: Request) {
  const email = request.headers.get(USER_EMAIL_HEADER)?.trim().toLowerCase();
  if (!email) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request) {
  try {
    const ownerKey = await ownerKeyFor(request);
    if (!ownerKey) return Response.json({ error: "Sign in is required for the private library" }, { status: 401 });
    const rows = await getDb()
      .select()
      .from(songs)
      .where(eq(songs.ownerKey, ownerKey))
      .orderBy(desc(songs.updatedAt), desc(songs.id))
      .limit(200);
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
    const ownerKey = await ownerKeyFor(request);
    if (!ownerKey) return Response.json({ error: "Sign in is required before saving" }, { status: 401 });
    const payload = await request.json() as SongPayload;
    if (!payload.titleEnglish?.trim() || !Array.isArray(payload.sections)) {
      return Response.json({ error: "English title and chart sections are required" }, { status: 400 });
    }
    if (!payload.saveApproval?.reviewed || !payload.saveApproval?.syntheticOrApproved) {
      return Response.json({ error: "Review and synthetic-or-approved confirmation are required" }, { status: 400 });
    }
    if (payload.reviewState !== "reviewed") {
      return Response.json({ error: "Only reviewed charts can be saved" }, { status: 400 });
    }
    if (payload.sections.length > 50) {
      return Response.json({ error: "Chart exceeds the hosted section limit" }, { status: 400 });
    }
    const safePayload = { ...payload };
    delete safePayload.saveApproval;
    const serializedPayload = JSON.stringify({ ...safePayload, id: undefined });
    if (new TextEncoder().encode(serializedPayload).byteLength > MAX_PAYLOAD_BYTES) {
      return Response.json({ error: "Chart exceeds the hosted size limit" }, { status: 413 });
    }
    const record = {
      ownerKey,
      titleKaren: payload.titleKaren?.trim() ?? "",
      titleEnglish: payload.titleEnglish.trim(),
      style: payload.style?.trim() || "Worship",
      songKey: payload.key?.trim() || "C",
      bpm: Math.max(1, Number(payload.bpm) || 72),
      meter: payload.meter?.trim() || "4/4",
      songGroup: payload.group?.trim() ?? "",
      payload: serializedPayload,
      updatedAt: new Date().toISOString(),
    };
    const [saved] = await getDb().insert(songs).values(record).returning();
    return Response.json({ song: parseSong(saved) }, { status: 201 });
  } catch {
    return Response.json({ error: "Save failed; the draft remains in the editor" }, { status: 500 });
  }
}

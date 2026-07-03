import type { ImportReview, Song } from "./types";

async function json<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  listSongs: (q = "") => json<Song[]>(`/api/songs${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  saveSong: (song: Song) => json<Song>(song.id ? `/api/songs/${song.id}` : "/api/songs", { method: song.id ? "PUT" : "POST", body: JSON.stringify(song) }),
  deleteSong: (id: number) => json(`/api/songs/${id}`, { method: "DELETE" }),
  importPng: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/import/png", { method: "POST", body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<ImportReview>;
  },
  exportJson: () => json<Song[]>("/api/export/json"),
  getSettings: () => json<Record<string, string>>("/api/settings"),
  saveSettings: (payload: Record<string, string>) => json("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
};

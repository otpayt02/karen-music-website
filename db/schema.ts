import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const songs = sqliteTable("songs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titleKaren: text("title_karen").notNull().default(""),
  titleEnglish: text("title_english").notNull(),
  style: text("style").notNull().default("Worship"),
  songKey: text("song_key").notNull().default("C"),
  bpm: integer("bpm").notNull().default(72),
  meter: text("meter").notNull().default("4/4"),
  songGroup: text("song_group").notNull().default(""),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

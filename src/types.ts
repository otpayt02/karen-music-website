export type ReferenceMedia = {
  videos?: Array<string | Record<string, any>>;
  images?: any[];
  info?: string;
  [key: string]: any;
};

export type Song = {
  id?: number;
  title: string;
  title_karen: string;
  category: string;
  key: string;
  current_key: string;
  original_key: string;
  style: string;
  tempo: string;
  notes: string;
  chart_json: any;
  lyrics_json: any[];
  metadata_json: Record<string, any>;
  tags_json: string[];
  // Reference media (optional, backwards-compatible). Persisted through the
  // API inside metadata_json.reference_media.videos — see services.ts.
  reference_media?: ReferenceMedia;
  youtubeUrl?: string;
  facebookUrl?: string;
  performanceUrl?: string;
  // Legacy fields returned at the top level by the API and consumed by
  // app.py::normalize_legacy_payload on save. Dropping any of these in the
  // editor silently erases the corresponding metadata_json values.
  rowleadjson?: Record<string, any>;
  file_metadata?: any[];
  instruments?: string;
  created_date?: string;
  performed_dates?: string[];
  next_performance_date?: string;
  date_performed?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
};

export type SetlistItem = {
  songId?: number;
  title: string;
  group: string;
};

export type Setlist = {
  date: string; // ISO date of the Sunday
  items: SetlistItem[];
  copiesPerGroup: Record<string, number>;
};

export const SETLIST_GROUPS = ["Praise & Worship", "Kids", "Youth", "Choir", "Solo"] as const;

export type ImportReview = {
  title: string;
  title_karen: string;
  category: string;
  key: string;
  current_key?: string;
  original_key?: string;
  style: string;
  tempo: string;
  confidence: number;
  warnings: string[];
  sections: any[];
  chart_json?: any;
  lyrics_json?: any[];
  metadata_json?: Record<string, any>;
  tags_json?: string[];
  import_id?: number;
  source_filename?: string;
  source_path?: string;
};

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
  updated_at?: string;
  version?: number;
};

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

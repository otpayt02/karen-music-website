export interface DictionaryEntry {
  id: string;
  karen: string;
  definitions: string[];
  page?: number;
  flag?: boolean;
  status?: 'correct' | 'needs_correction' | 'unsure';
  _is_example_sentence?: boolean;
  example_sentence?: string;
  original_karen?: string;
  part_of_speech?: string;
  interchangeable_with?: string[];
  etymology?: string;
  ditto_of?: string;
  related_headwords?: string[];
  compound_entry?: string;
  cross_reference?: string;
  history?: {
    timestamp: number;
    karen: string;
    definitions: string[];
    agentCorrected?: boolean;
    reason?: string;
  }[];
  timestamp: number;
}

export interface CorrectionRecord {
  pattern: string;
  replacement: string;
  type: 'headword' | 'definition' | 'formatting';
  timestamp: number;
}

export interface ProjectState {
  lastProcessedPage: number;
  totalEntries: number;
  isAutoPilot: boolean;
}

export interface ProcessingResult {
  entries: {
    karen: string;
    definitions: string[];
    page?: number;
    flag?: boolean;
    status?: 'correct' | 'needs_correction' | 'unsure';
    _is_example_sentence?: boolean;
    example_sentence?: string;
    original_karen?: string;
    part_of_speech?: string;
    interchangeable_with?: string[];
    etymology?: string;
    ditto_of?: string;
    related_headwords?: string[];
    compound_entry?: string;
    cross_reference?: string;
  }[];
}

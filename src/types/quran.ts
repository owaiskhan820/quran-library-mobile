export interface Chapter {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: number[];
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface ChaptersResponse {
  chapters: Chapter[];
}

/**
 * Lightweight chapter record used by all client-side components.
 * Generated from the full Chapter data via scripts/generate-tiny.mjs.
 * ~12KB total vs ~58KB for the full Chapter[].
 */
export interface ChapterTiny {
  id: number;
  name_simple: string;
  verses_count: number;
  pages: number[];
  translated_name: string;  // flattened from { name: string }
}

export interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
}

export interface VerseCodeV2 {
  id: number;
  verse_key: string;
  code_v2: string;
  v2_page: number;
}

export interface JuzVerseMapping {
  start_surah: number;
  start_verse: number;
  end_surah: number;
  end_verse: number;
}

export interface Juz {
  id: number;
  juz: number;
  name_english?: string;
  name_arabic: string;
  verses_count: number;
  verse_mapping: JuzVerseMapping;
}

export interface JuzsResponse {
  juzs: Juz[];
}

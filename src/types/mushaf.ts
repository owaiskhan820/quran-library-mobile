export type MushafLineType = "ayah" | "surah_name" | "basmalah" | "basmallah";

export interface MushafWord {
  c: string;
  l: string;
  a: string;
  s: string;
  isStopSign?: boolean;
  ur?: string;
  en?: string;
}

export interface MushafLine {
  line: number;
  type: MushafLineType;
  is_centered: boolean;
  words: MushafWord[];
  surah?: number | string;
}


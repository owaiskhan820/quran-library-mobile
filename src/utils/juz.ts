import type { MushafLine } from "@/types/mushaf";

// Mapping of Juz to their verse ranges (Surah:Verse)
// Based on public/data/juzs.json
const JUZ_BOUNDARIES = [
  { juz: 1, startSurah: 1, startVerse: 1 },
  { juz: 2, startSurah: 2, startVerse: 142 },
  { juz: 3, startSurah: 2, startVerse: 253 },
  { juz: 4, startSurah: 3, startVerse: 93 },
  { juz: 5, startSurah: 4, startVerse: 24 },
  { juz: 6, startSurah: 4, startVerse: 148 },
  { juz: 7, startSurah: 5, startVerse: 82 },
  { juz: 8, startSurah: 6, startVerse: 111 },
  { juz: 9, startSurah: 7, startVerse: 38 },
  { juz: 10, startSurah: 8, startVerse: 41 },
  { juz: 11, startSurah: 9, startVerse: 93 },
  { juz: 12, startSurah: 11, startVerse: 6 },
  { juz: 13, startSurah: 12, startVerse: 53 },
  { juz: 14, startSurah: 15, startVerse: 1 },
  { juz: 15, startSurah: 17, startVerse: 1 },
  { juz: 16, startSurah: 18, startVerse: 75 },
  { juz: 17, startSurah: 21, startVerse: 1 },
  { juz: 18, startSurah: 23, startVerse: 1 },
  { juz: 19, startSurah: 25, startVerse: 21 },
  { juz: 20, startSurah: 27, startVerse: 56 },
  { juz: 21, startSurah: 29, startVerse: 46 },
  { juz: 22, startSurah: 33, startVerse: 31 },
  { juz: 23, startSurah: 36, startVerse: 28 },
  { juz: 24, startSurah: 39, startVerse: 32 },
  { juz: 25, startSurah: 41, startVerse: 47 },
  { juz: 26, startSurah: 46, startVerse: 1 },
  { juz: 27, startSurah: 51, startVerse: 31 },
  { juz: 28, startSurah: 58, startVerse: 1 },
  { juz: 29, startSurah: 67, startVerse: 1 },
  { juz: 30, startSurah: 78, startVerse: 1 },
];

const JUZ_NAMES_ARABIC = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر", "الثامن عشر", "التاسع عشر", "العشرون",
  "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون", "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون", "التاسع والعشرون", "الثلاثون"
];

/**
 * Returns the Arabic ordinal name for a given Juz ID (1-30).
 */
export function getJuzNameArabic(id: number): string {
  return JUZ_NAMES_ARABIC[id - 1] || "";
}

/**
 * Checks if verse A is greater than or equal to verse B.
 */
function isVerseAfterOrEqual(s1: number, v1: number, s2: number, v2: number): boolean {
  if (s1 > s2) return true;
  if (s1 === s2 && v1 >= v2) return true;
  return false;
}

/**
 * Determines the Juz number for a given Surah and Ayah.
 */
export function getJuzForVerse(surah: number, ayah: number): number {
  for (let i = JUZ_BOUNDARIES.length - 1; i >= 0; i--) {
    const boundary = JUZ_BOUNDARIES[i];
    if (isVerseAfterOrEqual(surah, ayah, boundary.startSurah, boundary.startVerse)) {
      return boundary.juz;
    }
  }
  return 1;
}

/**
 * Extends the lines of a page to find the first valid verse (surah/ayah) 
 * and returns the corresponding Juz number.
 */
export function getJuzForPage(lines: MushafLine[]): number {
  for (const line of lines) {
    if (line.words && line.words.length > 0) {
      // Find the first word that has a valid surah and ayah
      const firstWord = line.words.find(w => w.s && w.a);
      if (firstWord) {
        const surah = parseInt(firstWord.s, 10);
        const ayah = parseInt(firstWord.a, 10);
        if (!isNaN(surah) && !isNaN(ayah)) {
          return getJuzForVerse(surah, ayah);
        }
      }
    }
  }
  return 1;
}

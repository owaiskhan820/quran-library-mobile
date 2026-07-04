import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { tafsirSurahPath, tafsirWholeBookPath } from "../paths";
import { isTafsirSurahDownloaded } from "../manifest";

export interface DownloadedTafsirEntry {
  text: string;
  coversFrom?: number;
  coversTo?: number;
}

interface TafsirFile {
  resourceId: number;
  surah?: number;
  ayahs: Record<string, DownloadedTafsirEntry>;
}

// Cache parsed bundle files per session so repeat ayah lookups within the
// same surah/tafsir don't re-read+re-parse the file from disk every time.
const fileCache = new Map<string, TafsirFile | null>();

async function readJsonFile(path: string): Promise<TafsirFile | null> {
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data, encoding: Encoding.UTF8 });
    return JSON.parse(result.data as string) as TafsirFile;
  } catch {
    return null;
  }
}

/**
 * Returns downloaded tafsir text for this ayah if available locally, else
 * null (caller should fall back to a live API fetch).
 */
export async function resolveTafsirText(
  tafsirId: number,
  surah: number,
  ayah: number
): Promise<DownloadedTafsirEntry | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!isTafsirSurahDownloaded(tafsirId, surah)) return null;

  const cacheKey = `${tafsirId}:${surah}`;
  let file = fileCache.get(cacheKey);
  if (file === undefined) {
    // Try the sharded per-surah path first, then the whole-book path.
    file = (await readJsonFile(tafsirSurahPath(tafsirId, surah))) ?? (await readJsonFile(tafsirWholeBookPath(tafsirId)));
    fileCache.set(cacheKey, file);
  }
  if (!file) return null;
  return file.ayahs[`${surah}:${ayah}`] ?? null;
}

export function invalidateTafsirCache(tafsirId: number, surah: number): void {
  fileCache.delete(`${tafsirId}:${surah}`);
}

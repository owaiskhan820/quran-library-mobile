import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { translationPath } from "../paths";
import { isTranslationDownloaded } from "../manifest";

export interface DownloadedTranslationEntry {
  text: string;
  footnotes?: string[];
}

interface TranslationFile {
  resourceId: number;
  ayahs: Record<string, DownloadedTranslationEntry>;
}

const fileCache = new Map<number, TranslationFile | null>();

async function readJsonFile(path: string): Promise<TranslationFile | null> {
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data, encoding: Encoding.UTF8 });
    return JSON.parse(result.data as string) as TranslationFile;
  } catch {
    return null;
  }
}

/**
 * Returns downloaded translation text for this ayah if available locally,
 * else null (caller should fall back to a live API fetch).
 */
export async function resolveTranslationText(
  translationId: number,
  surah: number,
  ayah: number
): Promise<DownloadedTranslationEntry | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!isTranslationDownloaded(translationId)) return null;

  let file = fileCache.get(translationId);
  if (file === undefined) {
    file = await readJsonFile(translationPath(translationId));
    fileCache.set(translationId, file);
  }
  if (!file) return null;
  return file.ayahs[`${surah}:${ayah}`] ?? null;
}

export function invalidateTranslationCache(translationId: number): void {
  fileCache.delete(translationId);
}

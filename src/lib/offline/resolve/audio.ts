import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { audioAyahPath } from "../paths";
import { isAyahAudioDownloaded, removeAyahAudioEntry } from "../manifest";

// Cache of resolved playable file:// / capacitor:// URIs, so repeat plays of
// the same downloaded ayah don't re-await Filesystem.getUri every time.
const uriCache = new Map<string, string>();

async function resolveLocalUri(reciterSlug: string, surah: number, ayah: number): Promise<string | null> {
  const cacheKey = `${reciterSlug}:${surah}:${ayah}`;
  const cached = uriCache.get(cacheKey);
  if (cached) return cached;

  try {
    const { uri } = await Filesystem.getUri({ path: audioAyahPath(reciterSlug, surah, ayah), directory: Directory.Data });
    const playableSrc = Capacitor.convertFileSrc(uri);
    uriCache.set(cacheKey, playableSrc);
    return playableSrc;
  } catch {
    return null;
  }
}

/**
 * Returns a locally-downloaded audio URI if this ayah/reciter is offline,
 * else null (caller should fall back to the existing remote CDN URL builder).
 * Only does real work (an async Filesystem call) the first time a given
 * ayah/reciter combo is resolved this session; after that it's a Map lookup.
 */
export async function resolveAyahAudioSrc(
  reciterSlug: string,
  surah: number,
  ayah: number
): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!isAyahAudioDownloaded(reciterSlug, surah, ayah)) return null;
  return resolveLocalUri(reciterSlug, surah, ayah);
}

/** Called when a local file URI fails to actually play (deleted/corrupted outside the app). */
export async function pruneStaleAyahAudio(reciterSlug: string, surah: number, ayah: number): Promise<void> {
  uriCache.delete(`${reciterSlug}:${surah}:${ayah}`);
  await removeAyahAudioEntry(reciterSlug, surah, ayah);
}

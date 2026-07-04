import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { manifestPath, audioKey } from "./paths";

interface AudioReciterManifest {
  ayahs: Record<string, true>; // key: "surah:ayah"
  surahs: Record<string, "complete">; // key: surah number as string
  bytesTotal: number;
}

interface TranslationManifestEntry {
  bytes: number;
  downloadedAt: number;
}

interface TafsirManifestEntry {
  surahs?: Record<string, true>; // sharded tafsirs only
  wholeBook?: true; // single-file tafsirs only
  bytesTotal: number;
  downloadedAt: number;
}

export interface OfflineManifest {
  version: 1;
  audio: Record<string, AudioReciterManifest>; // key: reciterSlug
  translations: Record<string, TranslationManifestEntry>; // key: translationId
  tafsirs: Record<string, TafsirManifestEntry>; // key: tafsirId
}

function emptyManifest(): OfflineManifest {
  return { version: 1, audio: {}, translations: {}, tafsirs: {} };
}

let manifestCache: OfflineManifest | null = null;
// Hot-path caches, hydrated from manifestCache whenever it changes.
const offlineAudioKeys = new Set<string>();
const offlineTranslationIds = new Set<number>();
// tafsir key: "tafsirId" (whole book) or "tafsirId:surah" (sharded)
const offlineTafsirKeys = new Set<string>();

function rebuildHotCaches(manifest: OfflineManifest) {
  offlineAudioKeys.clear();
  offlineTranslationIds.clear();
  offlineTafsirKeys.clear();

  for (const [reciterSlug, entry] of Object.entries(manifest.audio)) {
    for (const key of Object.keys(entry.ayahs)) {
      const [surah, ayah] = key.split(":").map(Number);
      offlineAudioKeys.add(audioKey(reciterSlug, surah, ayah));
    }
  }
  for (const id of Object.keys(manifest.translations)) {
    offlineTranslationIds.add(Number(id));
  }
  for (const [tafsirId, entry] of Object.entries(manifest.tafsirs)) {
    if (entry.wholeBook) {
      offlineTafsirKeys.add(tafsirId);
    }
    if (entry.surahs) {
      for (const surah of Object.keys(entry.surahs)) {
        offlineTafsirKeys.add(`${tafsirId}:${surah}`);
      }
    }
  }
}

async function readManifestFromDisk(): Promise<OfflineManifest> {
  try {
    const result = await Filesystem.readFile({
      path: manifestPath(),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    const parsed = JSON.parse(result.data as string) as OfflineManifest;
    return parsed;
  } catch {
    // File doesn't exist yet on first run.
    return emptyManifest();
  }
}

async function writeManifestToDisk(manifest: OfflineManifest): Promise<void> {
  await Filesystem.writeFile({
    path: manifestPath(),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
    data: JSON.stringify(manifest),
  });
}

/** Call once at app boot (native platforms only) before any resolve/* lookups run. */
export async function hydrateManifest(): Promise<void> {
  manifestCache = await readManifestFromDisk();
  rebuildHotCaches(manifestCache);
}

function getManifest(): OfflineManifest {
  if (!manifestCache) {
    // Hydration should have run at boot; fall back to an empty manifest
    // rather than throwing, so resolve/* helpers degrade to remote fetches.
    manifestCache = emptyManifest();
  }
  return manifestCache;
}

async function persist(): Promise<void> {
  rebuildHotCaches(getManifest());
  await writeManifestToDisk(getManifest());
}

// ---- Sync hot-path checks (no Filesystem access) ----

export function isAyahAudioDownloaded(reciterSlug: string, surah: number, ayah: number): boolean {
  return offlineAudioKeys.has(audioKey(reciterSlug, surah, ayah));
}

export function isTranslationDownloaded(translationId: number): boolean {
  return offlineTranslationIds.has(translationId);
}

export function isTafsirWholeBookDownloaded(tafsirId: number): boolean {
  return offlineTafsirKeys.has(String(tafsirId));
}

export function isTafsirSurahDownloaded(tafsirId: number, surah: number): boolean {
  return offlineTafsirKeys.has(`${tafsirId}:${surah}`) || offlineTafsirKeys.has(String(tafsirId));
}

/** True only when every one of the 114 surahs has been downloaded for this (sharded) tafsir. */
export function isTafsirFullyDownloaded(tafsirId: number, totalSurahs = 114): boolean {
  if (offlineTafsirKeys.has(String(tafsirId))) return true; // whole-book variant
  for (let surah = 1; surah <= totalSurahs; surah++) {
    if (!offlineTafsirKeys.has(`${tafsirId}:${surah}`)) return false;
  }
  return true;
}

// ---- Mutations (async, go through the download manager) ----

export async function markAyahAudioDownloaded(
  reciterSlug: string,
  surah: number,
  ayah: number,
  bytes: number
): Promise<void> {
  const manifest = getManifest();
  const entry = (manifest.audio[reciterSlug] ??= { ayahs: {}, surahs: {}, bytesTotal: 0 });
  const key = `${surah}:${ayah}`;
  if (!entry.ayahs[key]) {
    entry.ayahs[key] = true;
    entry.bytesTotal += bytes;
  }
  await persist();
}

export async function markSurahAudioComplete(reciterSlug: string, surah: number): Promise<void> {
  const manifest = getManifest();
  const entry = (manifest.audio[reciterSlug] ??= { ayahs: {}, surahs: {}, bytesTotal: 0 });
  entry.surahs[String(surah)] = "complete";
  await persist();
}

export async function markTranslationDownloaded(translationId: number, bytes: number): Promise<void> {
  const manifest = getManifest();
  manifest.translations[String(translationId)] = { bytes, downloadedAt: Date.now() };
  await persist();
}

export async function markTafsirSurahDownloaded(
  tafsirId: number,
  surah: number,
  bytes: number
): Promise<void> {
  const manifest = getManifest();
  const entry = (manifest.tafsirs[String(tafsirId)] ??= { surahs: {}, bytesTotal: 0, downloadedAt: Date.now() });
  entry.surahs ??= {};
  if (!entry.surahs[String(surah)]) {
    entry.surahs[String(surah)] = true;
    entry.bytesTotal += bytes;
  }
  await persist();
}

export async function markTafsirWholeBookDownloaded(tafsirId: number, bytes: number): Promise<void> {
  const manifest = getManifest();
  manifest.tafsirs[String(tafsirId)] = { wholeBook: true, bytesTotal: bytes, downloadedAt: Date.now() };
  await persist();
}

export async function removeAyahAudioEntry(reciterSlug: string, surah: number, ayah: number): Promise<void> {
  const manifest = getManifest();
  const entry = manifest.audio[reciterSlug];
  if (!entry) return;
  delete entry.ayahs[`${surah}:${ayah}`];
  delete entry.surahs[String(surah)];
  await persist();
}

export async function removeSurahAudioEntries(reciterSlug: string, surah: number): Promise<void> {
  const manifest = getManifest();
  const entry = manifest.audio[reciterSlug];
  if (!entry) return;
  const prefix = `${surah}:`;
  for (const key of Object.keys(entry.ayahs)) {
    if (key.startsWith(prefix)) delete entry.ayahs[key];
  }
  delete entry.surahs[String(surah)];
  await persist();
}

export async function removeTranslationEntry(translationId: number): Promise<void> {
  const manifest = getManifest();
  delete manifest.translations[String(translationId)];
  await persist();
}

export async function removeTafsirEntry(tafsirId: number): Promise<void> {
  const manifest = getManifest();
  delete manifest.tafsirs[String(tafsirId)];
  await persist();
}

export function getStorageUsage(): { audio: number; translations: number; tafsirs: number; total: number } {
  const manifest = getManifest();
  const audio = Object.values(manifest.audio).reduce((sum, r) => sum + r.bytesTotal, 0);
  const translations = Object.values(manifest.translations).reduce((sum, t) => sum + t.bytes, 0);
  const tafsirs = Object.values(manifest.tafsirs).reduce((sum, t) => sum + t.bytesTotal, 0);
  return { audio, translations, tafsirs, total: audio + translations + tafsirs };
}

export function getManifestSnapshot(): OfflineManifest {
  return getManifest();
}

import { Filesystem, Directory } from "@capacitor/filesystem";
import { Network } from "@capacitor/network";
import chaptersTiny from "../../../public/data/chapters-tiny.json";
import pageStarts from "../../../public/data/page-starts.json";
import {
  audioAyahPath,
  audioAyahTempPath,
  audioSurahDir,
  translationPath,
  tafsirSurahPath,
} from "./paths";
import {
  isAyahAudioDownloaded,
  markAyahAudioDownloaded,
  markSurahAudioComplete,
  removeAyahAudioEntry,
  removeSurahAudioEntries,
  isTranslationDownloaded,
  markTranslationDownloaded,
  removeTranslationEntry,
  isTafsirSurahDownloaded,
  markTafsirSurahDownloaded,
  removeTafsirEntry,
} from "./manifest";
import { invalidateTranslationCache } from "./resolve/translation";
import { invalidateTafsirCache } from "./resolve/tafsir";

// Base URL where the maintainer-generated tafsir/translation bundles
// (scripts/build-tafsir-bundles.mjs output) are hosted for download —
// the content-bundles/ folder committed to this same repo, served via
// GitHub's raw file CDN.
export const CONTENT_BUNDLE_BASE_URL = "https://raw.githubusercontent.com/owaiskhan820/quran-library-mobile/main/content-bundles";

type ChapterTinyEntry = { id: number; verses_count: number };
const CHAPTERS = chaptersTiny as unknown as ChapterTinyEntry[];
const PAGE_STARTS = pageStarts as string[]; // index = pageNo - 1, value = "surah:ayah"

const CONCURRENCY = 4;

export type AudioDownloadScope =
  | { scope: "ayah"; surah: number; ayah: number; reciterId: number; reciterSlug: string }
  | { scope: "ayahRange"; surah: number; startAyah: number; endAyah: number; reciterId: number; reciterSlug: string }
  | { scope: "page"; pageNo: number; reciterId: number; reciterSlug: string }
  | { scope: "pageRange"; startPage: number; endPage: number; reciterId: number; reciterSlug: string }
  | { scope: "surah"; surah: number; reciterId: number; reciterSlug: string };

export interface DownloadProgress {
  done: number;
  total: number;
}

export interface DownloadResult {
  total: number;
  failed: number;
}

export interface DownloadHandle {
  id: string;
  cancelled: boolean;
  cancel(): void;
  onProgress(cb: (progress: DownloadProgress) => void): () => void;
  promise: Promise<DownloadResult>;
}

export interface ActiveDownloadInfo {
  id: string;
  label: string;
  progress: DownloadProgress;
}

// Global registry of in-flight downloads, independent of whichever component
// started them — lets a persistent indicator survive navigation/unmount of
// the button that kicked off the download.
const activeDownloads = new Map<string, ActiveDownloadInfo>();
const registryListeners = new Set<() => void>();

function notifyRegistry() {
  registryListeners.forEach((cb) => cb());
}

function labelForScope(target: AudioDownloadScope): string {
  if (target.scope === "ayah") return `Ayah ${target.surah}:${target.ayah}`;
  if (target.scope === "ayahRange") return `Ayahs ${target.surah}:${target.startAyah}-${target.endAyah}`;
  if (target.scope === "page") return `Page ${target.pageNo}`;
  if (target.scope === "pageRange") return `Pages ${target.startPage}-${target.endPage}`;
  return `Surah ${target.surah}`;
}

export function getActiveDownloads(): ActiveDownloadInfo[] {
  return Array.from(activeDownloads.values());
}

export function subscribeActiveDownloads(cb: () => void): () => void {
  registryListeners.add(cb);
  return () => registryListeners.delete(cb);
}

function parseAyahKey(key: string): [number, number] {
  const [s, a] = key.split(":").map(Number);
  return [s, a];
}

/** Walks ayahs from (startSurah,startAyah) up to but excluding (endSurah,endAyah). */
function ayahRangeBetween(
  startSurah: number,
  startAyah: number,
  endSurah: number,
  endAyah: number
): { surah: number; ayah: number }[] {
  const result: { surah: number; ayah: number }[] = [];
  let surah = startSurah;
  let ayah = startAyah;

  while (surah < endSurah || (surah === endSurah && ayah < endAyah)) {
    const chapter = CHAPTERS.find((c) => c.id === surah);
    if (!chapter) break;
    result.push({ surah, ayah });
    if (ayah >= chapter.verses_count) {
      surah += 1;
      ayah = 1;
    } else {
      ayah += 1;
    }
    // Safety valve: the whole Quran is 6,236 ayahs — this never legitimately exceeds that.
    if (result.length > 6500) break;
  }
  return result;
}

/** Ayah range for a given 1-indexed Mushaf page, using page-starts.json. */
function ayahRangeForPage(pageNo: number): { surah: number; ayah: number }[] {
  return ayahRangeForPageRange(pageNo, pageNo);
}

/** Ayah range spanning pages [startPage, endPage] inclusive. */
function ayahRangeForPageRange(startPage: number, endPage: number): { surah: number; ayah: number }[] {
  const startKey = PAGE_STARTS[startPage - 1];
  if (!startKey) return [];
  const nextKey = PAGE_STARTS[endPage]; // undefined if endPage is the last page
  const [startSurah, startAyah] = parseAyahKey(startKey);
  const [endSurah, endAyah] = nextKey ? parseAyahKey(nextKey) : [Infinity, Infinity];
  return ayahRangeBetween(startSurah, startAyah, endSurah, endAyah);
}

function ayahRangeForSurah(surah: number): { surah: number; ayah: number }[] {
  const chapter = CHAPTERS.find((c) => c.id === surah);
  if (!chapter) return [];
  return Array.from({ length: chapter.verses_count }, (_, i) => ({ surah, ayah: i + 1 }));
}

/** Inclusive ayah range within a single surah, clamped to that surah's verse count. */
function ayahRangeForAyahRange(surah: number, startAyah: number, endAyah: number): { surah: number; ayah: number }[] {
  const chapter = CHAPTERS.find((c) => c.id === surah);
  if (!chapter) return [];
  const start = Math.max(1, Math.min(startAyah, endAyah));
  const end = Math.min(chapter.verses_count, Math.max(startAyah, endAyah));
  if (start > end) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => ({ surah, ayah: start + i }));
}

async function ensureDir(path: string): Promise<void> {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
  } catch {
    // Already exists — fine. (Filesystem.downloadFile's own `recursive` option
    // does not reliably create missing parent directories on Android, so we
    // always mkdir explicitly before writing — see the spike test findings.)
  }
}

async function isCellular(): Promise<boolean> {
  try {
    const status = await Network.getStatus();
    return status.connectionType === "cellular";
  } catch {
    return false;
  }
}

/** Rough size estimate in bytes, for the cellular-data confirmation prompt. */
export function estimateAudioBytes(ayahCount: number): number {
  const AVG_AYAH_BYTES = 100_000; // ~100KB/ayah average, per the plan's size table
  return ayahCount * AVG_AYAH_BYTES;
}

function ayahItemsForScope(target: AudioDownloadScope): { surah: number; ayah: number }[] {
  switch (target.scope) {
    case "ayah":
      return [{ surah: target.surah, ayah: target.ayah }];
    case "ayahRange":
      return ayahRangeForAyahRange(target.surah, target.startAyah, target.endAyah);
    case "page":
      return ayahRangeForPage(target.pageNo);
    case "pageRange":
      return ayahRangeForPageRange(target.startPage, target.endPage);
    case "surah":
      return ayahRangeForSurah(target.surah);
  }
}

export function countAyahsForScope(target: AudioDownloadScope): number {
  return ayahItemsForScope(target).length;
}

/** True only if every ayah in the page's range is already downloaded for this reciter. */
export function isPageAudioDownloaded(reciterSlug: string, pageNo: number): boolean {
  const items = ayahRangeForPage(pageNo);
  if (items.length === 0) return false;
  return items.every((it) => isAyahAudioDownloaded(reciterSlug, it.surah, it.ayah));
}

async function downloadOneAyah(
  reciterSlug: string,
  reciterId: number,
  surah: number,
  ayah: number,
  buildRemoteUrl: (surah: number, ayah: number, reciterId: number) => string
): Promise<void> {
  if (isAyahAudioDownloaded(reciterSlug, surah, ayah)) return;

  const finalPath = audioAyahPath(reciterSlug, surah, ayah);
  const tempPath = audioAyahTempPath(reciterSlug, surah, ayah);
  const url = buildRemoteUrl(surah, ayah, reciterId);
  if (!url) return;

  await ensureDir(audioSurahDir(reciterSlug, surah));
  await Filesystem.downloadFile({ url, path: tempPath, directory: Directory.Data, recursive: true });
  const stat = await Filesystem.stat({ path: tempPath, directory: Directory.Data });
  await Filesystem.rename({
    from: tempPath,
    to: finalPath,
    directory: Directory.Data,
    toDirectory: Directory.Data,
  });
  await markAyahAudioDownloaded(reciterSlug, surah, ayah, stat.size);
}

/**
 * Enqueue an audio download for the given scope (single ayah, a Mushaf page,
 * or a whole surah). Already-downloaded ayahs are skipped, so re-running the
 * same scope after an interruption only fetches the missing remainder.
 */
export function enqueueAudioDownload(
  target: AudioDownloadScope,
  buildRemoteUrl: (surah: number, ayah: number, reciterId: number) => string
): DownloadHandle {
  const listeners = new Set<(p: DownloadProgress) => void>();
  let cancelled = false;
  const id = `${target.scope}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const label = labelForScope(target);

  const handle: DownloadHandle = {
    id,
    cancelled: false,
    cancel() {
      cancelled = true;
      handle.cancelled = true;
    },
    onProgress(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    promise: Promise.resolve({ total: 0, failed: 0 }),
  };

  const reportProgress = (progress: DownloadProgress) => {
    listeners.forEach((cb) => cb(progress));
    activeDownloads.set(id, { id, label, progress });
    notifyRegistry();
  };

  handle.promise = (async () => {
    const items = ayahItemsForScope(target);

    const pending = items.filter((it) => !isAyahAudioDownloaded(target.reciterSlug, it.surah, it.ayah));
    const total = items.length;
    let done = total - pending.length;
    reportProgress({ done, total });

    let failed = 0;
    try {
      let index = 0;
      async function worker() {
        while (index < pending.length) {
          if (cancelled) return;
          const item = pending[index++];
          try {
            await downloadOneAyah(target.reciterSlug, target.reciterId, item.surah, item.ayah, buildRemoteUrl);
          } catch (err) {
            console.error(`Failed to download ${item.surah}:${item.ayah}`, err);
            failed += 1;
            // Leave un-downloaded; a future re-run of the same scope will retry it.
          }
          done += 1;
          reportProgress({ done, total });
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));

      if (!cancelled && target.scope === "surah") {
        await markSurahAudioComplete(target.reciterSlug, target.surah);
      }
    } finally {
      activeDownloads.delete(id);
      notifyRegistry();
    }

    return { total, failed };
  })();

  return handle;
}

export async function isOnline(): Promise<boolean> {
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    // Network plugin unavailable (e.g. web) — assume online.
    return true;
  }
}

export async function confirmIfCellular(ayahCount: number): Promise<{ needsConfirm: boolean; estimatedBytes: number }> {
  const cellular = await isCellular();
  return { needsConfirm: cellular && ayahCount > 1, estimatedBytes: estimateAudioBytes(ayahCount) };
}

export async function deleteAyahAudio(reciterSlug: string, surah: number, ayah: number): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: audioAyahPath(reciterSlug, surah, ayah), directory: Directory.Data });
  } catch {
    // Already gone — fine.
  }
  await removeAyahAudioEntry(reciterSlug, surah, ayah);
}

export async function deleteSurahAudio(reciterSlug: string, surah: number): Promise<void> {
  try {
    await Filesystem.rmdir({ path: audioSurahDir(reciterSlug, surah), directory: Directory.Data, recursive: true });
  } catch {
    // Already gone — fine.
  }
  await removeSurahAudioEntries(reciterSlug, surah);
}

export async function deleteAllReciterAudio(reciterSlug: string, surahs: number[]): Promise<void> {
  for (const surah of surahs) {
    await deleteSurahAudio(reciterSlug, surah);
  }
}

// ---- Translation downloads (whole-resource, single file) ----

export function enqueueTranslationDownload(translationId: number): DownloadHandle {
  const listeners = new Set<(p: DownloadProgress) => void>();
  const id = `translation-${translationId}-${Date.now()}`;
  const label = `Translation ${translationId}`;
  let cancelled = false;

  const handle: DownloadHandle = {
    id,
    cancelled: false,
    cancel() {
      cancelled = true;
      handle.cancelled = true;
    },
    onProgress(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    promise: Promise.resolve({ total: 1, failed: 0 }),
  };

  const reportProgress = (progress: DownloadProgress) => {
    listeners.forEach((cb) => cb(progress));
    activeDownloads.set(id, { id, label, progress });
    notifyRegistry();
  };

  handle.promise = (async () => {
    reportProgress({ done: 0, total: 1 });
    let failed = 0;
    try {
      if (isTranslationDownloaded(translationId)) {
        reportProgress({ done: 1, total: 1 });
        return { total: 1, failed: 0 };
      }
      if (cancelled) return { total: 1, failed: 0 };

      const path = translationPath(translationId);
      const dir = path.slice(0, path.lastIndexOf("/"));
      await ensureDir(dir);
      const tempPath = `${path}.part`;
      const url = `${CONTENT_BUNDLE_BASE_URL}/translations/${translationId}.json`;
      await Filesystem.downloadFile({ url, path: tempPath, directory: Directory.Data, recursive: true });
      const stat = await Filesystem.stat({ path: tempPath, directory: Directory.Data });
      await Filesystem.rename({ from: tempPath, to: path, directory: Directory.Data, toDirectory: Directory.Data });
      await markTranslationDownloaded(translationId, stat.size);
      invalidateTranslationCache(translationId);
      reportProgress({ done: 1, total: 1 });
    } catch (err) {
      console.error(`Failed to download translation ${translationId}:`, err);
      failed = 1;
    } finally {
      activeDownloads.delete(id);
      notifyRegistry();
    }
    return { total: 1, failed };
  })();

  return handle;
}

export async function deleteTranslation(translationId: number): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: translationPath(translationId), directory: Directory.Data });
  } catch {
    // Already gone — fine.
  }
  invalidateTranslationCache(translationId);
  await removeTranslationEntry(translationId);
}

// ---- Tafsir downloads (whole-resource, sharded per-surah files) ----

export function enqueueTafsirDownload(tafsirId: number): DownloadHandle {
  const listeners = new Set<(p: DownloadProgress) => void>();
  const id = `tafsir-${tafsirId}-${Date.now()}`;
  const label = `Tafsir ${tafsirId}`;
  let cancelled = false;

  const handle: DownloadHandle = {
    id,
    cancelled: false,
    cancel() {
      cancelled = true;
      handle.cancelled = true;
    },
    onProgress(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    promise: Promise.resolve({ total: 0, failed: 0 }),
  };

  const reportProgress = (progress: DownloadProgress) => {
    listeners.forEach((cb) => cb(progress));
    activeDownloads.set(id, { id, label, progress });
    notifyRegistry();
  };

  handle.promise = (async () => {
    const surahs = CHAPTERS.map((c) => c.id).filter((surah) => !isTafsirSurahDownloaded(tafsirId, surah));
    const total = CHAPTERS.length;
    let done = total - surahs.length;
    reportProgress({ done, total });

    let failed = 0;
    try {
      let index = 0;
      async function worker() {
        while (index < surahs.length) {
          if (cancelled) return;
          const surah = surahs[index++];
          try {
            const path = tafsirSurahPath(tafsirId, surah);
            const dir = path.slice(0, path.lastIndexOf("/"));
            await ensureDir(dir);
            const tempPath = `${path}.part`;
            const url = `${CONTENT_BUNDLE_BASE_URL}/tafsirs/${tafsirId}/${String(surah).padStart(3, "0")}.json`;
            await Filesystem.downloadFile({ url, path: tempPath, directory: Directory.Data, recursive: true });
            const stat = await Filesystem.stat({ path: tempPath, directory: Directory.Data });
            await Filesystem.rename({ from: tempPath, to: path, directory: Directory.Data, toDirectory: Directory.Data });
            await markTafsirSurahDownloaded(tafsirId, surah, stat.size);
            invalidateTafsirCache(tafsirId, surah);
          } catch (err) {
            console.error(`Failed to download tafsir ${tafsirId} surah ${surah}:`, err);
            failed += 1;
          }
          done += 1;
          reportProgress({ done, total });
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, surahs.length) }, worker));
    } finally {
      activeDownloads.delete(id);
      notifyRegistry();
    }

    return { total, failed };
  })();

  return handle;
}

export async function deleteTafsir(tafsirId: number, surahs: number[]): Promise<void> {
  for (const surah of surahs) {
    try {
      await Filesystem.deleteFile({ path: tafsirSurahPath(tafsirId, surah), directory: Directory.Data });
    } catch {
      // Already gone — fine.
    }
    invalidateTafsirCache(tafsirId, surah);
  }
  await removeTafsirEntry(tafsirId);
}

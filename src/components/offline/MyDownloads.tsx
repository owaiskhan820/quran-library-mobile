"use client";

import { useEffect, useState } from "react";
import { Trash2, Music } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { RECITERS } from "@/context/AudioContext";
import { getManifestSnapshot, getStorageUsage } from "@/lib/offline/manifest";
import { deleteSurahAudio, deleteAllReciterAudio, subscribeActiveDownloads } from "@/lib/offline/downloadManager";
import chaptersTiny from "../../../public/data/chapters-tiny.json";

interface ChapterTinyEntry {
  id: number;
  name_simple: string;
  verses_count: number;
}
const CHAPTERS = chaptersTiny as unknown as ChapterTinyEntry[];

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

interface SurahRow {
  surah: number;
  name: string;
  downloadedCount: number;
  totalCount: number;
  isComplete: boolean;
}

export default function MyDownloads() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    return subscribeActiveDownloads(() => setRefreshKey((k) => k + 1));
  }, []);

  if (!Capacitor.isNativePlatform()) return null;

  const manifest = getManifestSnapshot();
  const usage = getStorageUsage();
  const reciterSlugs = Object.keys(manifest.audio).filter((slug) => {
    const entry = manifest.audio[slug];
    return Object.keys(entry.ayahs).length > 0;
  });

  const handleDeleteSurah = async (reciterSlug: string, surah: number) => {
    await deleteSurahAudio(reciterSlug, surah);
    setRefreshKey((k) => k + 1);
  };

  const handleDeleteAll = async (reciterSlug: string, surahs: number[]) => {
    if (!confirm("Delete all downloaded audio for this reciter?")) return;
    await deleteAllReciterAudio(reciterSlug, surahs);
    setRefreshKey((k) => k + 1);
  };

  return (
    <section key={refreshKey} className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-primary">My Downloads</h2>
        <span className="text-xs text-muted">{formatBytes(usage.total)} used</span>
      </div>

      {reciterSlugs.length === 0 && (
        <p className="text-sm text-muted">No offline audio downloaded yet.</p>
      )}

      <div className="space-y-4">
        {reciterSlugs.map((slug) => {
          const entry = manifest.audio[slug];
          const reciter = RECITERS.find((r) => r.slug === slug);
          const bySurah = new Map<number, number>();
          for (const key of Object.keys(entry.ayahs)) {
            const surah = Number(key.split(":")[0]);
            bySurah.set(surah, (bySurah.get(surah) ?? 0) + 1);
          }
          const rows: SurahRow[] = Array.from(bySurah.entries())
            .map(([surah, count]) => {
              const chapter = CHAPTERS.find((c) => c.id === surah);
              return {
                surah,
                name: chapter?.name_simple ?? `Surah ${surah}`,
                downloadedCount: count,
                totalCount: chapter?.verses_count ?? count,
                isComplete: entry.surahs[String(surah)] === "complete" || count === chapter?.verses_count,
              };
            })
            .sort((a, b) => a.surah - b.surah);

          return (
            <div key={slug} className="p-4 rounded-2xl border border-gray-100 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Music size={16} className="text-primary" />
                  <span className="font-bold text-sm">{reciter?.name ?? slug}{reciter?.style ? ` (${reciter.style})` : ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{formatBytes(entry.bytesTotal)}</span>
                  <button
                    onClick={() => handleDeleteAll(slug, rows.map((r) => r.surah))}
                    className="text-red-500 hover:text-red-600"
                    aria-label="Delete all downloads for this reciter"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {rows.map((row) => (
                  <div key={row.surah} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">
                      {row.surah}. {row.name}{" "}
                      <span className="text-muted">
                        {row.isComplete ? "(complete)" : `(${row.downloadedCount}/${row.totalCount})`}
                      </span>
                    </span>
                    <button
                      onClick={() => handleDeleteSurah(slug, row.surah)}
                      className="text-red-400 hover:text-red-600"
                      aria-label={`Delete downloaded audio for surah ${row.surah}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

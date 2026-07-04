"use client";

import { useEffect, useState } from "react";
import { Download, Trash2, Loader2, Check } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { TAFSIRS } from "@/lib/tafsirs";
import { TRANSLATIONS } from "@/context/AudioContext";
import {
  enqueueTafsirDownload,
  enqueueTranslationDownload,
  deleteTafsir,
  deleteTranslation,
  confirmIfCellular,
  subscribeActiveDownloads,
} from "@/lib/offline/downloadManager";
import { isTafsirFullyDownloaded, isTranslationDownloaded } from "@/lib/offline/manifest";

// Only the resources we currently have pre-built bundles for — see
// scripts/build-tafsir-bundles.mjs. Extend both lists together when more
// resources are bundled.
const DOWNLOADABLE_TAFSIR_IDS = [14, 169, 160];
const DOWNLOADABLE_TRANSLATION_IDS = [95, 97, 84];
const ALL_SURAH_IDS = Array.from({ length: 114 }, (_, i) => i + 1);

type Status = "idle" | "downloading" | "done";

function ResourceRow({
  name,
  status,
  progress,
  onDownload,
  onDelete,
}: {
  name: string;
  status: Status;
  progress: { done: number; total: number } | null;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50">
      <span className="text-sm font-semibold text-gray-700">{name}</span>
      {status === "done" ? (
        <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600" aria-label={`Delete ${name}`}>
          <Trash2 size={16} />
        </button>
      ) : status === "downloading" ? (
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Loader2 size={14} className="animate-spin" />
          {progress ? `${progress.done}/${progress.total}` : ""}
        </span>
      ) : (
        <button onClick={onDownload} className="p-1.5 text-muted hover:text-primary" aria-label={`Download ${name}`}>
          <Download size={16} />
        </button>
      )}
    </div>
  );
}

export default function TafsirTranslationDownloads() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloading, setDownloading] = useState<Record<string, { done: number; total: number }>>({});

  useEffect(() => {
    return subscribeActiveDownloads(() => setRefreshKey((k) => k + 1));
  }, []);

  if (!Capacitor.isNativePlatform()) return null;

  const tafsirs = TAFSIRS.filter((t) => DOWNLOADABLE_TAFSIR_IDS.includes(t.id));
  const translations = TRANSLATIONS.filter((t) => DOWNLOADABLE_TRANSLATION_IDS.includes(t.id));

  const statusFor = (key: string, isDownloaded: boolean): Status => {
    if (downloading[key]) return "downloading";
    return isDownloaded ? "done" : "idle";
  };

  const handleDownloadTafsir = async (tafsirId: number) => {
    const key = `tafsir:${tafsirId}`;
    const { needsConfirm, estimatedBytes } = await confirmIfCellular(114);
    if (needsConfirm) {
      const mb = (estimatedBytes / 1_000_000).toFixed(1);
      if (!confirm(`Download this tafsir (~${mb} MB) over cellular data?`)) return;
    }
    setDownloading((d) => ({ ...d, [key]: { done: 0, total: 114 } }));
    const handle = enqueueTafsirDownload(tafsirId);
    const unsubscribe = handle.onProgress((p) => setDownloading((d) => ({ ...d, [key]: p })));
    const result = await handle.promise;
    unsubscribe();
    setDownloading((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
    if (result.failed > 0) {
      alert(`${result.failed} of ${result.total} parts failed to download. Check your internet connection and try again.`);
    }
    setRefreshKey((k) => k + 1);
  };

  const handleDownloadTranslation = async (translationId: number) => {
    const key = `translation:${translationId}`;
    setDownloading((d) => ({ ...d, [key]: { done: 0, total: 1 } }));
    const handle = enqueueTranslationDownload(translationId);
    const unsubscribe = handle.onProgress((p) => setDownloading((d) => ({ ...d, [key]: p })));
    const result = await handle.promise;
    unsubscribe();
    setDownloading((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
    if (result.failed > 0) {
      alert("Download failed. Check your internet connection and try again.");
    }
    setRefreshKey((k) => k + 1);
  };

  return (
    <section key={refreshKey} className="space-y-4">
      <h2 className="font-bold text-gray-800 tracking-tight px-2">Offline Tafsir & Translations</h2>

      <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-muted uppercase tracking-widest">Tafsir</p>
        {tafsirs.map((t) => {
          const key = `tafsir:${t.id}`;
          return (
            <ResourceRow
              key={t.id}
              name={t.name}
              status={statusFor(key, isTafsirFullyDownloaded(t.id))}
              progress={downloading[key] ?? null}
              onDownload={() => handleDownloadTafsir(t.id)}
              onDelete={() => deleteTafsir(t.id, ALL_SURAH_IDS).then(() => setRefreshKey((k) => k + 1))}
            />
          );
        })}

        <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted uppercase tracking-widest">Translations</p>
        {translations.map((t) => {
          const key = `translation:${t.id}`;
          return (
            <ResourceRow
              key={t.id}
              name={t.name}
              status={statusFor(key, isTranslationDownloaded(t.id))}
              progress={downloading[key] ?? null}
              onDownload={() => handleDownloadTranslation(t.id)}
              onDelete={() => deleteTranslation(t.id).then(() => setRefreshKey((k) => k + 1))}
            />
          );
        })}
      </div>
    </section>
  );
}

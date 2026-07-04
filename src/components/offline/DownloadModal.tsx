"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Download, Check } from "lucide-react";
import { useAudioContext } from "@/context/AudioContext";
import { buildAyahAudioUrl } from "@/context/AudioContext";
import {
  enqueueAudioDownload,
  confirmIfCellular,
  countAyahsForScope,
  estimateAudioBytes,
  isOnline,
  type AudioDownloadScope,
} from "@/lib/offline/downloadManager";
import chaptersTiny from "../../../public/data/chapters-tiny.json";

interface ChapterTinyEntry {
  id: number;
  name_simple: string;
  verses_count: number;
}
const CHAPTERS = chaptersTiny as unknown as ChapterTinyEntry[];

type Tab = "ayahRange" | "page" | "pageRange" | "surah";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Tab;
  initialSurah?: number;
  initialAyah?: number;
  initialPageNo?: number;
}

export default function DownloadModal({
  isOpen,
  onClose,
  initialTab = "page",
  initialSurah = 1,
  initialAyah = 1,
  initialPageNo = 1,
}: DownloadModalProps) {
  const { reciters, reciterId: defaultReciterId } = useAudioContext();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [surah, setSurah] = useState(initialSurah);
  const [startAyah, setStartAyah] = useState(initialAyah);
  const [endAyah, setEndAyah] = useState(initialAyah);
  const [pageNo, setPageNo] = useState(initialPageNo);
  const [startPage, setStartPage] = useState(initialPageNo);
  const [endPage, setEndPage] = useState(initialPageNo);
  const [reciterId, setReciterId] = useState(defaultReciterId);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab);
    setSurah(initialSurah);
    setStartAyah(initialAyah);
    setEndAyah(initialAyah);
    setPageNo(initialPageNo);
    setStartPage(initialPageNo);
    setEndPage(initialPageNo);
    setReciterId(defaultReciterId);
  }, [isOpen, initialTab, initialSurah, initialAyah, initialPageNo, defaultReciterId]);

  const chapter = CHAPTERS.find((c) => c.id === surah);
  const reciter = reciters.find((r) => r.id === reciterId);

  const scope: AudioDownloadScope | null = useMemo(() => {
    if (!reciter) return null;
    switch (tab) {
      case "ayahRange":
        return { scope: "ayahRange", surah, startAyah, endAyah, reciterId, reciterSlug: reciter.slug };
      case "page":
        return { scope: "page", pageNo, reciterId, reciterSlug: reciter.slug };
      case "pageRange":
        return { scope: "pageRange", startPage, endPage, reciterId, reciterSlug: reciter.slug };
      case "surah":
        return { scope: "surah", surah, reciterId, reciterSlug: reciter.slug };
    }
  }, [tab, surah, startAyah, endAyah, pageNo, startPage, endPage, reciterId, reciter]);

  const ayahCount = scope ? countAyahsForScope(scope) : 0;
  const estimatedMb = (estimateAudioBytes(ayahCount) / 1_000_000).toFixed(1);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!scope || starting) return;
    setStarting(true);
    try {
      const online = await isOnline();
      if (!online) {
        alert("No internet connection. Connect to Wi-Fi or mobile data and try again.");
        setStarting(false);
        return;
      }

      const { needsConfirm, estimatedBytes } = await confirmIfCellular(ayahCount);
      if (needsConfirm) {
        const mb = (estimatedBytes / 1_000_000).toFixed(1);
        const proceed = confirm(`Download ~${mb} MB over cellular data?`);
        if (!proceed) {
          setStarting(false);
          return;
        }
      }
      const label = { ayahRange: "Ayah Range", page: "Page", pageRange: "Page Range", surah: "Surah" }[tab];
      const handle = enqueueAudioDownload(scope, buildAyahAudioUrl);
      handle.promise
        .then((result) => {
          if (result.failed > 0) {
            alert(
              `${result.failed} of ${result.total} ayah${result.total === 1 ? "" : "s"} failed to download for "${label}". Check your internet connection and try again.`
            );
          }
        })
        .catch(() => {
          alert(`Download failed for "${label}". Check your internet connection and try again.`);
        });
      onClose();
    } finally {
      setStarting(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "ayahRange", label: "Ayah Range" },
    { id: "page", label: "Page" },
    { id: "pageRange", label: "Page Range" },
    { id: "surah", label: "Surah" },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary">Download Audio</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-primary">
            <X size={20} />
          </button>
        </div>

        {/* Scope tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${
                tab === t.id ? "bg-white text-primary shadow-sm" : "text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scope-specific inputs */}
        <div className="space-y-3 mb-4">
          {tab === "ayahRange" && (
            <>
              <label className="block text-xs font-semibold text-muted">
                Surah
                <select
                  value={surah}
                  onChange={(e) => setSurah(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {CHAPTERS.map((c) => (
                    <option key={c.id} value={c.id}>{c.id}. {c.name_simple}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3">
                <label className="flex-1 block text-xs font-semibold text-muted">
                  From ayah
                  <input
                    type="number"
                    min={1}
                    max={chapter?.verses_count ?? 1}
                    value={startAyah}
                    onChange={(e) => setStartAyah(Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex-1 block text-xs font-semibold text-muted">
                  To ayah
                  <input
                    type="number"
                    min={1}
                    max={chapter?.verses_count ?? 1}
                    value={endAyah}
                    onChange={(e) => setEndAyah(Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </>
          )}

          {tab === "page" && (
            <label className="block text-xs font-semibold text-muted">
              Page number
              <input
                type="number"
                min={1}
                max={604}
                value={pageNo}
                onChange={(e) => setPageNo(Number(e.target.value))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </label>
          )}

          {tab === "pageRange" && (
            <div className="flex gap-3">
              <label className="flex-1 block text-xs font-semibold text-muted">
                From page
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="flex-1 block text-xs font-semibold text-muted">
                To page
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}

          {tab === "surah" && (
            <label className="block text-xs font-semibold text-muted">
              Surah
              <select
                value={surah}
                onChange={(e) => setSurah(Number(e.target.value))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {CHAPTERS.map((c) => (
                  <option key={c.id} value={c.id}>{c.id}. {c.name_simple} ({c.verses_count} ayahs)</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* Reciter picker */}
        <label className="block text-xs font-semibold text-muted mb-4">
          Reciter
          <select
            value={reciterId}
            onChange={(e) => setReciterId(Number(e.target.value))}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {reciters.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.style ? ` (${r.style})` : ""}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between text-xs text-muted mb-4">
          <span>{ayahCount} ayah{ayahCount === 1 ? "" : "s"}</span>
          <span>~{estimatedMb} MB</span>
        </div>

        <button
          onClick={handleDownload}
          disabled={starting || ayahCount === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {starting ? <Check size={18} /> : <Download size={18} />}
          Download
        </button>
      </div>
    </div>
  );
}

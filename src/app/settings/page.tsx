"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAudioContext, RECITERS, TRANSLATIONS } from "@/context/AudioContext";
import { TAFSIRS } from "@/lib/tafsirs";
import { useAuth } from "@/context/AuthContext";
import { getManifestSnapshot, getStorageUsage, isTafsirFullyDownloaded, getMissingTafsirSurahs } from "@/lib/offline/manifest";
import { deleteSurahAudio, deleteTafsir, deleteTranslation, subscribeActiveDownloads } from "@/lib/offline/downloadManager";
import chaptersTiny from "../../../public/data/chapters-tiny.json";
import TafsirTranslationDownloads, { TAFSIR_DISPLAY_NAMES } from "@/components/offline/TafsirTranslationDownloads";

import {
  ChevronLeft,
  ChevronRight,
  Globe,
  User,
  BookOpen,
  Check,
  Mic2,
  Languages,
  Download,
  Search,
  SlidersHorizontal,
  Trash2,
  Play,
  MoreVertical,
  Volume2
} from "lucide-react";

interface ChapterTinyEntry {
  id: number;
  name_simple: string;
  verses_count: number;
}
const CHAPTERS = chaptersTiny as unknown as ChapterTinyEntry[];

type SubView = "main" | "language" | "reciter" | "translation" | "tafsir" | "downloads" | "textDownloads";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0.0 MB";
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

// Get initials for translation avatar icons (e.g. "Sahih International" -> "SI")
function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    language,
    setLanguage,
    reciterId,
    setReciter,
    translationId,
    setTranslationId,
    tafsirId,
    setTafsir,
    playAyah
  } = useAudioContext();

  const [activeView, setActiveView] = useState<SubView>("main");
  const [refreshKey, setRefreshKey] = useState(0);

  // Search filter query states
  const [searchReciterQuery, setSearchReciterQuery] = useState("");
  const [showReciterSearch, setShowReciterSearch] = useState(false);

  const [searchTranslationQuery, setSearchTranslationQuery] = useState("");
  const [showTranslationSearch, setShowTranslationSearch] = useState(false);

  const [searchTafsirQuery, setSearchTafsirQuery] = useState("");
  const [showTafsirSearch, setShowTafsirSearch] = useState(false);

  const [searchDownloadQuery, setSearchDownloadQuery] = useState("");

  // Temporary language selection for apply footer
  const [tempLang, setTempLang] = useState<"en" | "ur">(language);

  // Sync active downloads and refresh sizes
  useEffect(() => {
    return subscribeActiveDownloads(() => setRefreshKey((k) => k + 1));
  }, []);

  // Sync tempLang with global language context when entering view
  useEffect(() => {
    if (activeView === "language") {
      setTempLang(language);
    }
  }, [activeView, language]);

  // Compute storage info from active manifest
  const storageInfo = useMemo(() => {
    const usage = getStorageUsage();
    const manifest = getManifestSnapshot();
    
    // Count total files (ayahs + translation entries + tafsir entries)
    let filesCount = 0;
    Object.values(manifest.audio).forEach(r => {
      filesCount += Object.keys(r.ayahs).length;
    });
    filesCount += Object.keys(manifest.translations).length;
    Object.values(manifest.tafsirs).forEach(t => {
      if (t.wholeBook) filesCount += 1;
      if (t.surahs) filesCount += Object.keys(t.surahs).length;
    });

    const totalCapacity = 32 * 1024 * 1024 * 1024; // 32 GB mock limit
    const percentUsed = Math.max(1, Math.min(100, Math.round((usage.total / totalCapacity) * 100)));
    
    return {
      usedBytes: usage.total,
      usedStr: formatBytes(usage.total),
      percentUsed,
      filesCount
    };
  }, [refreshKey]);

  // Get active configurations display titles
  const activeLanguageName = language === "ur" ? "اردو" : "English";
  const activeReciterName = useMemo(() => {
    const rec = RECITERS.find(r => r.id === reciterId);
    return rec ? rec.name.replace("Mohamed Siddiq al-", "") : "Al-Minshawi";
  }, [reciterId]);
  const activeTranslationName = useMemo(() => {
    const trans = TRANSLATIONS.find(t => t.id === translationId);
    return trans ? trans.name : "Sahih International";
  }, [translationId]);
  const activeTafsirName = useMemo(() => {
    const tafsir = TAFSIRS.find(t => t.id === tafsirId);
    return tafsir ? tafsir.name : "Ibn Kathir (Abridged)";
  }, [tafsirId]);

  // Reciter list filtered by search query
  const filteredReciters = useMemo(() => {
    if (!searchReciterQuery.trim()) return RECITERS;
    return RECITERS.filter(r =>
      r.name.toLowerCase().includes(searchReciterQuery.toLowerCase()) ||
      (r.style && r.style.toLowerCase().includes(searchReciterQuery.toLowerCase()))
    );
  }, [searchReciterQuery]);

  // Translation list filtered by search query and grouped by language
  const filteredTranslations = useMemo(() => {
    const query = searchTranslationQuery.trim().toLowerCase();
    if (!query) return TRANSLATIONS;
    return TRANSLATIONS.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.author.toLowerCase().includes(query)
    );
  }, [searchTranslationQuery]);

  // Tafsir list filtered by search query
  const filteredTafsirs = useMemo(() => {
    const query = searchTafsirQuery.trim().toLowerCase();
    if (!query) return TAFSIRS;
    return TAFSIRS.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.author.toLowerCase().includes(query)
    );
  }, [searchTafsirQuery]);

  // Download list computation & filtering
  const downloadedSurahs = useMemo(() => {
    const manifest = getManifestSnapshot();
    const rows: {
      surah: number;
      name: string;
      reciterName: string;
      reciterSlug: string;
      sizeStr: string;
      bytes: number;
    }[] = [];

    Object.keys(manifest.audio).forEach((slug) => {
      const entry = manifest.audio[slug];
      const reciter = RECITERS.find((r) => r.slug === slug);
      
      const bySurah = new Map<number, number>();
      let totalAyahsForReciter = 0;
      for (const key of Object.keys(entry.ayahs)) {
        const surah = Number(key.split(":")[0]);
        bySurah.set(surah, (bySurah.get(surah) ?? 0) + 1);
        totalAyahsForReciter++;
      }

      bySurah.forEach((count, surah) => {
        const chapter = CHAPTERS.find((c) => c.id === surah);
        // Estimate size by distributing reciter's bytesTotal proportionately
        const estimatedBytes = totalAyahsForReciter > 0
          ? Math.round((count / totalAyahsForReciter) * entry.bytesTotal)
          : 0;

        rows.push({
          surah,
          name: chapter?.name_simple ?? `Surah ${surah}`,
          reciterName: reciter?.name.replace("Mohamed Siddiq al-", "") ?? slug,
          reciterSlug: slug,
          sizeStr: formatBytes(estimatedBytes),
          bytes: estimatedBytes
        });
      });
    });

    // Sort downloads by surah number
    rows.sort((a, b) => a.surah - b.surah);

    if (!searchDownloadQuery.trim()) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(searchDownloadQuery.toLowerCase()) ||
      String(r.surah).includes(searchDownloadQuery) ||
      r.reciterName.toLowerCase().includes(searchDownloadQuery.toLowerCase())
    );
  }, [refreshKey, searchDownloadQuery]);

  // Downloaded tafsirs & translations, for the same "My Downloads" list
  const downloadedTextResources = useMemo(() => {
    const manifest = getManifestSnapshot();
    const rows: {
      type: "tafsir" | "translation";
      id: number;
      name: string;
      sizeStr: string;
      bytes: number;
      partial: boolean;
      missingCount: number;
    }[] = [];

    Object.keys(manifest.tafsirs).forEach((idStr) => {
      const id = Number(idStr);
      const tafsir = TAFSIRS.find((t) => t.id === id);
      if (!tafsir) return;
      const entry = manifest.tafsirs[idStr];
      const missing = getMissingTafsirSurahs(id);
      rows.push({
        type: "tafsir",
        id,
        name: TAFSIR_DISPLAY_NAMES[id] ?? tafsir.name,
        sizeStr: formatBytes(entry.bytesTotal),
        bytes: entry.bytesTotal,
        partial: !isTafsirFullyDownloaded(id),
        missingCount: missing.length,
      });
    });

    Object.keys(manifest.translations).forEach((idStr) => {
      const id = Number(idStr);
      const translation = TRANSLATIONS.find((t) => t.id === id);
      if (!translation) return;
      const entry = manifest.translations[idStr];
      rows.push({
        type: "translation",
        id,
        name: translation.name,
        sizeStr: formatBytes(entry.bytes),
        bytes: entry.bytes,
        partial: false,
        missingCount: 0,
      });
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));

    if (!searchDownloadQuery.trim()) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(searchDownloadQuery.toLowerCase()));
  }, [refreshKey, searchDownloadQuery]);

  // Download operations
  const handleDeleteSurah = async (reciterSlug: string, surah: number) => {
    await deleteSurahAudio(reciterSlug, surah);
    setRefreshKey((k) => k + 1);
  };

  const handleDeleteTextResource = async (type: "tafsir" | "translation", id: number) => {
    if (type === "tafsir") {
      await deleteTafsir(id, Array.from({ length: 114 }, (_, i) => i + 1));
    } else {
      await deleteTranslation(id);
    }
    setRefreshKey((k) => k + 1);
  };

  const handlePlaySurah = (surah: number) => {
    // Start playback of this Surah from Ayah 1
    playAyah(surah, 1, true);
    router.push("/read");
  };

  // Header Back click handler based on view stack
  const handleHeaderBack = () => {
    if (activeView === "main") {
      router.push("/");
    } else {
      setActiveView("main");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center select-none font-sans">
      
      {/* ----------------- SUB-VIEW HEADER ----------------- */}
      <header
        className="w-full max-w-md bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 1rem)" }}
      >
        <button
          onClick={handleHeaderBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-50 active:scale-95 transition-all text-emerald-800"
          aria-label="Go back"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>

        {activeView === "main" && (
          <h1 className="text-2xl font-bold font-serif text-emerald-800 flex-1 pl-4">Settings</h1>
        )}
        {activeView === "language" && (
          <h1 className="text-xl font-bold text-emerald-800 flex-1 pl-4">Default Language</h1>
        )}
        {activeView === "reciter" && (
          <h1 className="text-xl font-bold text-emerald-800 flex-1 pl-4">Default Reciter</h1>
        )}
        {activeView === "translation" && (
          <h1 className="text-xl font-bold text-emerald-800 flex-1 pl-4">Default Translation</h1>
        )}
        {activeView === "tafsir" && (
          <h1 className="text-xl font-bold text-emerald-800 flex-1 pl-4">Default Tafsir</h1>
        )}
        {activeView === "downloads" && (
          <h1 className="text-xl font-bold text-emerald-800 flex-1 pl-4">My Downloads</h1>
        )}
        {activeView === "textDownloads" && (
          <h1 className="text-xl font-bold text-emerald-800 flex-1 pl-4">Offline Tafsir & Translations</h1>
        )}

        {/* Right action based on activeView */}
        {activeView === "main" && (
          <div className="w-9 h-9 rounded-full overflow-hidden border border-emerald-800/10 shadow-sm">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
                <User size={16} />
              </div>
            )}
          </div>
        )}
        {activeView === "language" && (
          <div className="w-9 h-9 rounded-full overflow-hidden border border-emerald-800/10 shadow-sm">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
                <User size={16} />
              </div>
            )}
          </div>
        )}
        {activeView === "reciter" && (
          <button
            onClick={() => setShowReciterSearch(!showReciterSearch)}
            className={`p-2 rounded-full transition-colors ${showReciterSearch ? "bg-emerald-50 text-emerald-800" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Search size={20} />
          </button>
        )}
        {activeView === "translation" && (
          <button
            onClick={() => setShowTranslationSearch(!showTranslationSearch)}
            className={`p-2 rounded-full transition-colors ${showTranslationSearch ? "bg-emerald-50 text-emerald-800" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Search size={20} />
          </button>
        )}
        {activeView === "tafsir" && (
          <button
            onClick={() => setShowTafsirSearch(!showTafsirSearch)}
            className={`p-2 rounded-full transition-colors ${showTafsirSearch ? "bg-emerald-50 text-emerald-800" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Search size={20} />
          </button>
        )}
        {activeView === "downloads" && (
          <button className="p-2 rounded-full text-gray-500 hover:bg-gray-50">
            <MoreVertical size={20} />
          </button>
        )}
      </header>

      {/* ----------------- VIEW SWITCHER BODY ----------------- */}
      <main className="w-full max-w-md flex-1 flex flex-col">
        
        {/* ================= VIEW: MAIN DASHBOARD ================= */}
        {activeView === "main" && (
          <div className="flex-1 bg-slate-50 p-6 flex flex-col justify-between">
            <div className="w-full">
              
              {/* White Menu Card Container */}
              <div className="bg-white rounded-[2rem] p-6 shadow-2xl border border-gray-150 flex flex-col divide-y divide-gray-100">
                
                {/* 1. Default Language Item */}
                <button
                  onClick={() => setActiveView("language")}
                  className="flex items-center justify-between py-5 text-left w-full focus:outline-none group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-800">
                      <Globe size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="font-sans font-bold text-gray-900 text-lg leading-tight">Default Language</h2>
                      <p className="font-sans text-emerald-800 text-sm font-semibold mt-0.5">{activeLanguageName}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-800 transition-colors" />
                </button>

                {/* 2. Default Reciter Item */}
                <button
                  onClick={() => setActiveView("reciter")}
                  className="flex items-center justify-between py-5 text-left w-full focus:outline-none group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-800">
                      <Mic2 size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="font-sans font-bold text-gray-900 text-lg leading-tight">Default Reciter</h2>
                      <p className="font-sans text-emerald-800 text-sm font-semibold mt-0.5">{activeReciterName}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-800 transition-colors" />
                </button>

                {/* 3. Default Translation Item */}
                <button
                  onClick={() => setActiveView("translation")}
                  className="flex items-center justify-between py-5 text-left w-full focus:outline-none group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-800">
                      <Languages size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="font-sans font-bold text-gray-900 text-lg leading-tight">Default Translation</h2>
                      <p className="font-sans text-emerald-800 text-sm font-semibold mt-0.5">{activeTranslationName}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-800 transition-colors" />
                </button>

                {/* 3b. Default Tafsir Item */}
                <button
                  onClick={() => setActiveView("tafsir")}
                  className="flex items-center justify-between py-5 text-left w-full focus:outline-none group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-800">
                      <BookOpen size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="font-sans font-bold text-gray-900 text-lg leading-tight">Default Tafsir</h2>
                      <p className="font-sans text-emerald-800 text-sm font-semibold mt-0.5">{activeTafsirName}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-800 transition-colors" />
                </button>

                {/* 4. My Downloads Item */}
                <button
                  onClick={() => setActiveView("downloads")}
                  className="flex items-center justify-between py-5 text-left w-full focus:outline-none group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-800">
                      <Download size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="font-sans font-bold text-gray-900 text-lg leading-tight">My Downloads</h2>
                      <p className="font-sans text-gray-500 text-sm font-medium mt-0.5">{storageInfo.usedStr} used</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-800 transition-colors" />
                </button>

                {/* 5. Offline Tafsir & Translations Item */}
                <button
                  onClick={() => setActiveView("textDownloads")}
                  className="flex items-center justify-between py-5 text-left w-full focus:outline-none group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-800">
                      <BookOpen size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="font-sans font-bold text-gray-900 text-lg leading-tight">Offline Tafsir & Translations</h2>
                      <p className="font-sans text-gray-500 text-sm font-medium mt-0.5">Download for offline reading</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-800 transition-colors" />
                </button>

              </div>
            </div>

            {/* Dash Footer */}
            <div className="w-full text-center mt-8 mb-4">
              <p className="text-xs text-gray-500 font-sans tracking-wide">All changes are saved automatically</p>
            </div>
          </div>
        )}

        {/* ================= VIEW: DEFAULT LANGUAGE ================= */}
        {activeView === "language" && (
          <div className="flex-1 bg-slate-50 flex flex-col justify-between p-6">
            <div className="w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select App Language</h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Choose your preferred language for the interface, menus, and navigation.
              </p>

              {/* Language Selection Cards Stack */}
              <div className="space-y-4">
                
                {/* 1. English Card */}
                <button
                  onClick={() => setTempLang("en")}
                  className={`w-full text-left p-5 rounded-2xl border bg-white flex items-start gap-4 transition-all focus:outline-none shadow-sm ${
                    tempLang === "en" ? "border-emerald-800 ring-2 ring-emerald-800/10" : "border-gray-200"
                  }`}
                >
                  <div className={`p-2 rounded-xl ${tempLang === "en" ? "bg-emerald-800 text-white" : "bg-gray-100 text-gray-500"}`}>
                    <Globe size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-950 text-base leading-tight">English</h3>
                    <p className="text-xs text-gray-400 mt-1">Global Standard (US/UK)</p>
                  </div>
                  {tempLang === "en" && (
                    <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shadow-md">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* 2. Urdu Card */}
                <button
                  onClick={() => setTempLang("ur")}
                  className={`w-full text-left p-5 rounded-2xl border bg-white flex items-start gap-4 transition-all focus:outline-none shadow-sm ${
                    tempLang === "ur" ? "border-emerald-800 ring-2 ring-emerald-800/10" : "border-gray-200"
                  }`}
                >
                  <div className={`p-2 rounded-xl ${tempLang === "ur" ? "bg-emerald-800 text-white" : "bg-gray-100 text-gray-500"}`}>
                    <Languages size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-950 text-base leading-tight font-arabic text-right md:text-left">اردو</h3>
                    <p className="text-xs text-gray-400 mt-1">Urdu</p>
                  </div>
                  {tempLang === "ur" && (
                    <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shadow-md">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* 3. Arabic Card (Disabled Mock for visual fidelity) */}
                <button
                  onClick={() => {
                    alert("Arabic interface localization is coming soon. Using English standard.");
                  }}
                  className="w-full text-left p-5 rounded-2xl border border-gray-200 bg-white flex items-start gap-4 opacity-75 focus:outline-none shadow-sm"
                >
                  <div className="p-2 rounded-xl bg-gray-100 text-gray-500">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-950 text-base leading-tight font-arabic">العربية</h3>
                    <p className="text-xs text-gray-400 mt-1">Arabic (Read Only)</p>
                  </div>
                </button>

              </div>
            </div>

            {/* Footer apply changes box */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-100/90 backdrop-blur-md flex justify-end border-t border-gray-200 z-50">
              <div className="w-full max-w-md flex justify-end">
                <button
                  onClick={() => {
                    setLanguage(tempLang);
                    setActiveView("main");
                  }}
                  className="bg-emerald-800 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-emerald-800/20 active:scale-95 transition-all text-sm leading-none"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW: DEFAULT RECITER ================= */}
        {activeView === "reciter" && (
          <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-6">
            
            {/* Search Input Box */}
            {showReciterSearch && (
              <div className="relative animate-fade-in">
                <input
                  type="text"
                  placeholder="Search Qari..."
                  value={searchReciterQuery}
                  onChange={(e) => setSearchReciterQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/10 focus:border-emerald-800/40 transition-all placeholder:text-gray-400 shadow-sm"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            )}

            {/* Audio Settings Banner Card */}
            <div className="bg-emerald-600 text-white p-5 rounded-[1.5rem] flex items-center gap-4 shadow-md">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0">
                <Volume2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base">Audio Settings</h3>
                <p className="text-xs text-white/90 leading-normal mt-0.5">
                  Select your preferred Qari for verse-by-verse recitation and background playback.
                </p>
              </div>
            </div>

            {/* Reciter Options Cards List */}
            <div className="space-y-3 overflow-y-auto max-h-[55vh] pb-10 custom-scrollbar pr-1">
              {filteredReciters.map((r) => {
                const isSelected = reciterId === r.id;
                
                return (
                  <button
                    key={r.id}
                    onClick={() => setReciter(r.id)}
                    className={`w-full text-left p-4 rounded-2xl border bg-white flex items-center gap-4 transition-all focus:outline-none shadow-sm ${
                      isSelected
                        ? "border-emerald-800 bg-emerald-50/20 ring-2 ring-emerald-800/5"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Circle Avatar placeholder/photo */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                      isSelected ? "bg-emerald-800 text-white border-emerald-800/20" : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}>
                      <User size={20} />
                    </div>

                    <div className="flex-1">
                      <h4 className={`font-bold text-sm leading-tight ${isSelected ? "text-emerald-950 font-extrabold" : "text-gray-900"}`}>
                        {r.name}
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-1.5 inline-block">
                        {r.style || "Murattal"}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shadow-md shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredReciters.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-10">No Qaris match your search.</p>
              )}
            </div>

            {/* Bottom Nav Bar Representation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2.5 px-6 flex justify-around items-center z-50">
              <div className="w-full max-w-md flex justify-around items-center">
                <Link href="/read" className="flex flex-col items-center text-gray-400 hover:text-emerald-800 transition-colors">
                  <BookOpen size={20} />
                  <span className="text-[10px] font-bold mt-1">Read</span>
                </Link>
                <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-emerald-800 transition-colors">
                  <Search size={20} />
                  <span className="text-[10px] font-bold mt-1">Search</span>
                </Link>
                <div className="flex flex-col items-center text-emerald-800 scale-105 font-bold">
                  <Volume2 size={20} />
                  <span className="text-[10px] font-bold mt-1">Audio</span>
                </div>
                <button onClick={() => setActiveView("main")} className="flex flex-col items-center text-gray-400 hover:text-emerald-800 transition-colors">
                  <SlidersHorizontal size={20} />
                  <span className="text-[10px] font-bold mt-1">Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW: DEFAULT TRANSLATION ================= */}
        {activeView === "translation" && (
          <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-6">
            
            {/* Search Input Box */}
            {showTranslationSearch && (
              <div className="relative animate-fade-in">
                <input
                  type="text"
                  placeholder="Search translations..."
                  value={searchTranslationQuery}
                  onChange={(e) => setSearchTranslationQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/10 focus:border-emerald-800/40 transition-all placeholder:text-gray-400 shadow-sm"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            )}

            <p className="text-sm text-gray-500 leading-normal">
              Select your preferred translation for reading and search results. This will be applied globally across the library.
            </p>

            {/* Translation Options Cards List */}
            <div className="space-y-3 overflow-y-auto max-h-[65vh] pb-10 custom-scrollbar pr-1">
              {filteredTranslations.map((t) => {
                const isSelected = translationId === t.id;
                const initials = getInitials(t.name);
                
                return (
                  <button
                    key={t.id}
                    onClick={() => setTranslationId(t.id)}
                    className={`w-full text-left p-4 rounded-2xl border bg-white flex items-center gap-4 transition-all focus:outline-none shadow-sm ${
                      isSelected
                        ? "border-emerald-800 bg-emerald-50/20 ring-2 ring-emerald-800/5"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Circular Badge with Initials */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border shadow-sm text-xs font-bold ${
                      isSelected ? "bg-emerald-800 text-white border-emerald-800/20" : "bg-gray-100 text-emerald-800 border-gray-200"
                    }`}>
                      {initials}
                    </div>

                    <div className="flex-1">
                      <h4 className={`font-bold text-sm leading-tight ${isSelected ? "text-emerald-950 font-extrabold" : "text-gray-900"}`}>
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                        {t.author}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shadow-md shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredTranslations.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-10">No translations match your search.</p>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW: DEFAULT TAFSIR ================= */}
        {activeView === "tafsir" && (
          <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-6">

            {/* Search Input Box */}
            {showTafsirSearch && (
              <div className="relative animate-fade-in">
                <input
                  type="text"
                  placeholder="Search tafsirs..."
                  value={searchTafsirQuery}
                  onChange={(e) => setSearchTafsirQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/10 focus:border-emerald-800/40 transition-all placeholder:text-gray-400 shadow-sm"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            )}

            <p className="text-sm text-gray-500 leading-normal">
              Select your preferred tafsir (commentary). This is what opens by default when you tap the tafsir icon while reading.
            </p>

            {/* Tafsir Options Cards List */}
            <div className="space-y-3 overflow-y-auto max-h-[65vh] pb-10 custom-scrollbar pr-1">
              {filteredTafsirs.map((t) => {
                const isSelected = tafsirId === t.id;
                const initials = getInitials(t.name);

                return (
                  <button
                    key={t.id}
                    onClick={() => setTafsir(t.id)}
                    className={`w-full text-left p-4 rounded-2xl border bg-white flex items-center gap-4 transition-all focus:outline-none shadow-sm ${
                      isSelected
                        ? "border-emerald-800 bg-emerald-50/20 ring-2 ring-emerald-800/5"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Circular Badge with Initials */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border shadow-sm text-xs font-bold ${
                      isSelected ? "bg-emerald-800 text-white border-emerald-800/20" : "bg-gray-100 text-emerald-800 border-gray-200"
                    }`}>
                      {initials}
                    </div>

                    <div className="flex-1">
                      <h4 className={`font-bold text-sm leading-tight ${isSelected ? "text-emerald-950 font-extrabold" : "text-gray-900"}`}>
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                        {t.author} &bull; <span className="capitalize">{t.language}</span>
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shadow-md shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredTafsirs.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-10">No tafsirs match your search.</p>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW: MY DOWNLOADS ================= */}
        {activeView === "downloads" && (
          <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-6">
            
            {/* Offline Storage Info Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 shrink-0">
                <Download size={22} />
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Offline Storage</span>
                <p className="text-xl text-gray-900 mt-1">
                  <span className="font-black text-emerald-800">{storageInfo.usedStr}</span>{" "}
                  <span className="text-gray-400 font-medium text-sm">used</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">
                  {storageInfo.filesCount} files downloaded for offline use
                </p>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search surah..."
                  value={searchDownloadQuery}
                  onChange={(e) => setSearchDownloadQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/10 focus:border-emerald-800/40 transition-all placeholder:text-gray-400 shadow-sm"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <button className="p-3.5 bg-white border border-gray-200 rounded-2xl text-gray-500 shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
                <SlidersHorizontal size={20} />
              </button>
            </div>

            <div className="w-full">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-4">Recently Downloaded</h3>
              
              {/* Scrollable Downloads List */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar pb-10 pr-1">
                {downloadedSurahs.map((row) => (
                  <div
                    key={`${row.reciterSlug}-${row.surah}`}
                    className="p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Light Green Surah Index Square */}
                      <div className="w-11 h-11 bg-teal-50/70 border border-teal-100 rounded-2xl flex items-center justify-center text-teal-800 font-extrabold shrink-0">
                        {String(row.surah).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate">Surah {row.name}</h4>
                        <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">
                          {row.reciterName} &bull; {row.sizeStr}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Play Button */}
                      <button
                        onClick={() => handlePlaySurah(row.surah)}
                        className="p-2 text-gray-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-full active:scale-95 transition-all"
                        aria-label={`Play Surah ${row.name}`}
                      >
                        <Play size={18} fill="currentColor" />
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteSurah(row.reciterSlug, row.surah)}
                        className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full active:scale-95 transition-all"
                        aria-label={`Delete Surah ${row.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {downloadedSurahs.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-10 font-sans">
                    {searchDownloadQuery ? "No offline surahs match your search." : "No downloaded files found on device."}
                  </p>
                )}
              </div>
            </div>

            {downloadedTextResources.length > 0 && (
              <div className="w-full">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-4">Tafsir & Translations</h3>
                <div className="space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar pb-10 pr-1">
                  {downloadedTextResources.map((row) => (
                    <div
                      key={`${row.type}-${row.id}`}
                      className="p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 bg-teal-50/70 border border-teal-100 rounded-2xl flex items-center justify-center text-teal-800 shrink-0">
                          {row.type === "tafsir" ? <BookOpen size={20} /> : <Languages size={20} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 truncate">{row.name}</h4>
                          <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">
                            {row.type === "tafsir" ? "Tafsir" : "Translation"} &bull; {row.sizeStr}
                            {row.partial && (
                              <span className="text-amber-600"> &bull; {row.missingCount} surah{row.missingCount === 1 ? "" : "s"} missing</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTextResource(row.type, row.id)}
                        className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full active:scale-95 transition-all shrink-0"
                        aria-label={`Delete ${row.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW: OFFLINE TAFSIR & TRANSLATIONS ================= */}
        {activeView === "textDownloads" && (
          <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-6">
            <p className="text-sm text-gray-500 leading-normal">
              Download tafsir commentary and translations for offline reading. Each is a one-time download; no internet needed afterward.
            </p>
            <TafsirTranslationDownloads />
          </div>
        )}

      </main>
    </div>
  );
}

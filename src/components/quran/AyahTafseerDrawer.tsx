"use client";

import { ChevronLeft, ChevronDown, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { TAFSIRS, DEFAULT_TAFSIR_ID, getTafsirsByLanguage } from "@/lib/tafsirs";
import { resolveTafsirText } from "@/lib/offline/resolve/tafsir";

interface AyahTafseerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  arabicWords?: string[];
  pageNumber?: number;
  language: "en" | "ur";
  tafsirId: number;
}

export default function AyahTafseerDrawer({
  isOpen,
  onClose,
  surahId,
  surahName,
  ayahNumber,
  language,
  tafsirId,
}: AyahTafseerDrawerProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedTafseerId, setSelectedTafseerId] = useState(DEFAULT_TAFSIR_ID);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [coverageRange, setCoverageRange] = useState<{ from: number; to: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract unique languages from TAFSIRS
  const availableLanguages = useMemo(() => {
    const langs = TAFSIRS.map((t) => t.language);
    return [...new Set(langs)].sort();
  }, []);

  // Filter tafsirs based on selected language
  const filteredTafsirs = useMemo(() => {
    return getTafsirsByLanguage(selectedLanguage);
  }, [selectedLanguage]);

  // Handle Initial Defaults — prefer the user's persisted tafsir preference
  // (set via Settings or a prior manual pick in this drawer) over a hardcoded
  // guess based on the reading-language toggle. Only fall back to the
  // language-based guess when the user has never actually chosen one (i.e.
  // the persisted value is still sitting at its initial default).
  useEffect(() => {
    if (isOpen && !selectedLanguage) {
      if (tafsirId && tafsirId !== DEFAULT_TAFSIR_ID) {
        const persisted = TAFSIRS.find(t => t.id === tafsirId);
        if (persisted) {
          setSelectedLanguage(persisted.language);
          setSelectedTafseerId(persisted.id);
          return;
        }
      }
      if (language === "ur") {
        setSelectedLanguage("urdu");
        setSelectedTafseerId(159); // Bayan ul Quran
      } else {
        setSelectedLanguage("english");
        setSelectedTafseerId(DEFAULT_TAFSIR_ID);
      }
    }
  }, [isOpen, language, selectedLanguage, tafsirId]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Register overlay close handler for Android hardware back button
  useEffect(() => {
    if (!isOpen) return;

    const handleClose = () => {
      onCloseRef.current();
    };

    if (typeof window !== "undefined") {
      (window as any).__activeOverlays = (window as any).__activeOverlays || [];
      (window as any).__activeOverlays.push(handleClose);
    }

    return () => {
      if (typeof window !== "undefined" && (window as any).__activeOverlays) {
        (window as any).__activeOverlays = (window as any).__activeOverlays.filter(
          (cb: any) => cb !== handleClose
        );
      }
    };
  }, [isOpen]);

  // Fix: Sync Tafseer selection when Language changes
  useEffect(() => {
    if (selectedLanguage && filteredTafsirs.length > 0) {
      const isStillAvailable = filteredTafsirs.some(t => t.id === selectedTafseerId);
      if (!isStillAvailable) {
        setSelectedTafseerId(filteredTafsirs[0].id);
      }
    }
  }, [selectedLanguage, filteredTafsirs, selectedTafseerId]);

  // Fetch Tafsir text
  useEffect(() => {
    if (!isOpen || !surahId || !ayahNumber || !selectedTafseerId) return;

    const fetchTafsir = async () => {
      setIsLoading(true);
      setError(null);
      setTafsirText(null);
      setCoverageRange(null);

      const ayahKey = `${surahId}:${ayahNumber}`;
      try {
        // Prefer the pre-bundled, offline-capable copy shipped with the app;
        // fall back to a live fetch for any tafsir not in the bundled set.
        const bundled = await resolveTafsirText(selectedTafseerId, surahId, ayahNumber);
        if (bundled) {
          setTafsirText(bundled.text);
          if (bundled.coversFrom && bundled.coversTo) {
            setCoverageRange({ from: bundled.coversFrom, to: bundled.coversTo });
          }
          return;
        }

        // Without a timeout, a fetch on a genuinely offline device can hang
        // far longer than feels reasonable instead of failing fast with a
        // clear "check your connection" message.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        let response: Response;
        try {
          response = await fetch(`https://api.quran.com/api/v4/tafsirs/${selectedTafseerId}/by_ayah/${ayahKey}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.tafsir && data.tafsir.text) {
          setTafsirText(data.tafsir.text);
        } else {
          setError("Commentary not found for this ayah.");
        }
      } catch (_err) {
        setError("Network error. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTafsir();
  }, [isOpen, surahId, ayahNumber, selectedTafseerId]);

  const currentTafsirInfo = TAFSIRS.find(t => t.id === selectedTafseerId);
  const isArabicTafsir = currentTafsirInfo?.language === "arabic";
  const isUrduTafsir = currentTafsirInfo?.language === "urdu";
  const isRTL = isArabicTafsir || isUrduTafsir;

  const siteIsUrdu = language === "ur";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[1000] bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Side Drawer Unit */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[1010] w-full max-w-none bg-white shadow-2xl flex flex-col will-change-transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"} ${siteIsUrdu ? "font-sans text-right" : ""}`}
      >
        {/* Nav Header */}
            <div 
              className="flex items-center gap-3 px-6 border-b border-divider bg-white sticky top-0 z-10"
              style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 1rem)", paddingBottom: "1rem" }}
            >
              <button
                onClick={onClose}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-all text-emerald-800 active:scale-95 duration-200 shrink-0"
                aria-label="Go back"
              >
                <ChevronLeft size={24} strokeWidth={2.5} />
              </button>
              <div className={`flex-1 flex flex-col ${siteIsUrdu ? "items-end text-right pr-2" : "items-start pl-2"}`}>
                <h2 className={`text-xl font-bold text-gray-900 ${siteIsUrdu ? "font-urdu" : "font-sans"}`}>
                  {siteIsUrdu ? `${surahName} - آیت ${ayahNumber}` : `${surahName} - Ayah ${ayahNumber}`}
                </h2>
                <p className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] mt-0.5">Commentary / Tafseer</p>
              </div>
            </div>

            {/* Selection Engine */}
            <div className="px-6 py-6 space-y-5 border-b border-divider bg-gray-50/40">
              <div className="flex flex-col gap-2">
                <label className={`text-[10px] font-black text-muted-dark uppercase tracking-widest ${siteIsUrdu ? "text-right pr-1" : "pl-1"}`}>
                  {siteIsUrdu ? "زبان" : "Language"}
                </label>
                <div className="relative group">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full appearance-none bg-white border border-divider rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer capitalize shadow-sm group-hover:border-primary/30"
                  >
                    {availableLanguages.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" size={14} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className={`text-[10px] font-black text-muted-dark uppercase tracking-widest ${siteIsUrdu ? "text-right pr-1" : "pl-1"}`}>
                  {siteIsUrdu ? "تفسیر" : "Commentary Source"}
                </label>
                <div className="relative group">
                  <select
                    value={selectedTafseerId}
                    onChange={(e) => setSelectedTafseerId(Number(e.target.value))}
                    className="w-full appearance-none bg-white border border-divider rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm group-hover:border-primary/30"
                  >
                    {filteredTafsirs.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" size={14} />
                </div>
              </div>
            </div>

            {/* Viewport */}
            <div 
              className="flex-1 overflow-y-auto px-6 py-8 space-y-10 book-scrollbar bg-white"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {/* Dynamic Content Core */}
              <div
                className={`min-h-[200px] tafsir-content pb-10
                  ${isArabicTafsir ? "font-arabic-pure text-2xl leading-[1.8] text-right" : ""}
                  ${isUrduTafsir ? "font-urdu text-2xl leading-[2] text-right" : ""}
                  ${!isRTL ? "text-left text-gray-700 leading-[1.7] text-base font-sans" : ""}
                `}
                dir={isRTL ? "rtl" : "ltr"}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-5">
                    <div className="relative">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150 animate-pulse" />
                    </div>
                    <p className="text-xs text-primary font-bold uppercase tracking-widest animate-pulse">Fetching your tafseer...</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50/50 p-8 rounded-3xl border border-red-100/50 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-2xl">⚠️</div>
                    <p className="text-sm text-red-900 font-medium leading-relaxed">{error}</p>
                    <button
                      onClick={() => setSelectedTafseerId(selectedTafseerId)} // Trigger re-effect
                      className="mt-2 px-6 py-2 bg-red-600 text-white text-xs font-black uppercase rounded-full shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
                    >
                      {siteIsUrdu ? "دوبارہ کوشش کریں" : "Retry Connection"}
                    </button>
                  </div>
                ) : tafsirText ? (
                  <>
                    {coverageRange && (
                      <p className={`text-xs font-bold text-primary/60 uppercase tracking-wider mb-4 ${isRTL ? "text-right" : "text-left"}`}>
                        {siteIsUrdu
                          ? `یہ تفسیر آیات ${coverageRange.from}-${coverageRange.to} پر محیط ہے`
                          : `This commentary covers verses ${coverageRange.from}–${coverageRange.to}`}
                      </p>
                    )}
                    <div
                      dangerouslySetInnerHTML={{ __html: tafsirText }}
                      className="space-y-6"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted/40">
                    <div className="text-4xl mb-4">📖</div>
                    <p className="text-sm font-medium italic">
                      {siteIsUrdu ? "کوئی تبصرہ نہیں ملا" : "No record available for this selection."}
                    </p>
                  </div>
                )}
              </div>
            </div>
      </div>
    </>
  );
}

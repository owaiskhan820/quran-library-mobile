"use client";

import { useAudioContext } from "@/context/AudioContext";
import chapters from "../../public/data/chapters-tiny.json";
import type { ChapterTiny } from "@/types/quran";

const chaptersTiny = chapters as ChapterTiny[];
import { getSurahNameArabic } from "@/utils/surah";
import { 
  Play, 
  Pause, 
  X, 
  User, 
  Check, 
  RefreshCcw,
  Languages,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1
} from "lucide-react";
import { useState, useEffect, useRef, memo } from "react";

const MediaPlayer = memo(function MediaPlayer() {
  const {
    currentAyah,
    isPlaying,
    isAutoplay,
    togglePlay,
    toggleAutoplay,
    stopAudio,
    playNextAyah,
    playPreviousAyah,
    reciters,
    reciterId,
    setReciter,
    translationId,
    setTranslationId,
    translationText,
    translations,
    playAyah,
    repeatMode,
    setRepeatMode,
    repeatCount,
    setRepeatCount,
    repeatRange,
    setRepeatRange,
    rangeRepeatCount,
    setRangeRepeatCount,
    isTafseerVisible,
  } = useAudioContext();

  const [isReciterMenuOpen, setIsReciterMenuOpen] = useState(false);
  const [isTranslationMenuOpen, setIsTranslationMenuOpen] = useState(false);
  const [isRepeatMenuOpen, setIsRepeatMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [translationKey, setTranslationKey] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);



  const filteredReciters = reciters;
  const filteredTranslations = translations;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animate in when currentAyah appears, animate out on hide
  useEffect(() => {
    setIsVisible(!!(currentAyah && !isTafseerVisible));
  }, [currentAyah, isTafseerVisible]);

  // Fade translation text by cycling a key-based opacity trick
  useEffect(() => {
    if (currentAyah) {
      const newKey = `${currentAyah.surah}:${currentAyah.ayah}-${translationId}`;
      requestAnimationFrame(() => setTranslationKey(newKey));
    }
  }, [currentAyah, translationId]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsReciterMenuOpen(false);
        setIsTranslationMenuOpen(false);
        setIsRepeatMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Close menus when ayah changes or player is closed
  useEffect(() => {
    setTimeout(() => {
      setIsReciterMenuOpen(false);
      setIsTranslationMenuOpen(false);
      setIsRepeatMenuOpen(false);
    }, 0);
  }, [currentAyah?.surah, currentAyah?.ayah]);

  if (!currentAyah || isTafseerVisible) {
    // Render invisible but mounted so the slide-out transition plays
    if (!currentAyah) return null;
  }

  const surahName = getSurahNameArabic(currentAyah.surah);

  return (
    // Outer slide-in/out container — pure CSS transform + opacity
    <div
      className={`fixed z-[100] transition-all duration-300 ease-out will-change-transform ${
        isMobile
          ? "bottom-0 left-0 right-0 w-full max-w-full"
          : "bottom-6 left-1/2 w-[95vw] max-w-md -translate-x-1/2"
      } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
      style={isMobile ? { paddingBottom: "env(safe-area-inset-bottom)" } : undefined}
    >
      <div ref={containerRef} className={`relative bg-white/95 backdrop-blur-md border border-white/30 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 flex flex-col gap-3 overflow-visible transition-all duration-300 ${
        isMobile ? "rounded-t-[2.5rem] rounded-b-none" : "rounded-[2.5rem]"
      }`}>
        
        {/* Subtle Inner Glow */}
        <div className="absolute inset-0 rounded-[2.5rem] border border-white/20 pointer-events-none" />
        
        {/* Drag Handle Indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full opacity-50 mb-1 pointer-events-none" />
        
        {/* Popups — CSS scale+opacity transitions, always in DOM */}
        <div className="absolute bottom-[80px] left-0 right-0 mx-auto w-full max-w-[320px] z-50">
          {/* Reciter Menu */}
          <div
            className={`absolute bottom-0 w-full bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl overflow-hidden py-2 max-h-[300px] overflow-y-auto custom-scrollbar
              transition-all duration-200 ease-out origin-bottom
              ${isReciterMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
          >
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm px-4 py-2 border-b border-gray-50 mb-1 z-10">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Choose Reciter</span>
            </div>
            <div className="px-1">
              {reciters.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setReciter(r.id);
                    setIsReciterMenuOpen(false);
                  }}
                  className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-primary/5 rounded-xl transition-colors mb-0.5"
                >
                  <div className="flex flex-col">
                    <span className={`${reciterId === r.id ? 'text-primary font-semibold' : 'text-gray-700'} text-sm`}>
                      {r.name}
                    </span>
                    {r.style && <span className="text-[10px] text-muted opacity-80">{r.style}</span>}
                  </div>
                  {reciterId === r.id && (
                    <div className="bg-primary/10 p-1 rounded-full">
                      <Check size={14} className="text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Translation Menu */}
          <div
            className={`absolute bottom-0 w-full bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl overflow-hidden py-2 max-h-[300px] overflow-y-auto custom-scrollbar
              transition-all duration-200 ease-out origin-bottom
              ${isTranslationMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
          >
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm px-4 py-2 border-b border-gray-50 mb-1 z-10">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Choose Translation</span>
            </div>
            <div className="px-1 border-b border-gray-50 pb-1 mb-1">
              <button
                onClick={() => {
                  setTranslationId(0);
                  setIsTranslationMenuOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors ${translationId === 0 ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-500'}`}
              >
                <span className="text-sm">Turn Off Translation</span>
                {translationId === 0 && <Check size={14} />}
              </button>
            </div>
            <div className="px-1">
              {translations.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTranslationId(t.id);
                    setIsTranslationMenuOpen(false);
                  }}
                  className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-primary/5 rounded-xl transition-colors mb-0.5"
                >
                  <div className="flex flex-col">
                    <span className={`${translationId === t.id ? 'text-primary font-semibold' : 'text-gray-700'} text-sm`}>
                      {t.name}
                    </span>
                    <span className="text-[10px] text-muted opacity-80">{t.author}</span>
                  </div>
                  {translationId === t.id && (
                    <div className="bg-primary/10 p-1 rounded-full">
                      <Check size={14} className="text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat Menu */}
          <div
            className={`absolute bottom-0 w-full bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl overflow-hidden py-4 max-h-[60vh] overflow-y-auto custom-scrollbar px-4
              transition-all duration-200 ease-out origin-bottom
              ${isRepeatMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
          >
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-muted uppercase tracking-wider block">Repeat Settings</span>
                <button 
                  onClick={() => setIsRepeatMenuOpen(false)}
                  className="p-1 hover:bg-black/5 rounded-full text-muted transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mb-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-3">Repeat Mode</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setRepeatMode('none')}
                    className={`py-2 px-1 text-xs rounded-xl border transition-all ${repeatMode === 'none' ? 'bg-primary text-white border-primary shadow-md' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}
                  >
                    Off
                  </button>
                  <button
                    onClick={() => setRepeatMode('single')}
                    className={`py-2 px-1 text-xs rounded-xl border transition-all ${repeatMode === 'single' ? 'bg-primary text-white border-primary shadow-md' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}
                  >
                    Current
                  </button>
                  <button
                    onClick={() => setRepeatMode('range')}
                    className={`py-2 px-1 text-xs rounded-xl border transition-all ${repeatMode === 'range' ? 'bg-primary text-white border-primary shadow-md' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}
                  >
                    Range
                  </button>
                </div>
              </div>

              {/* Ayah Repetitions — CSS grid height transition */}
              <div className={`overflow-hidden transition-all duration-200 ${repeatMode !== 'none' ? 'max-h-[120px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-3">Ayah Repetitions</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[1, 2, 3, 5, 10, 0].map((c) => (
                    <button
                      key={c}
                      onClick={() => setRepeatCount(c)}
                      className={`py-2 text-xs rounded-lg border transition-all ${repeatCount === c ? 'bg-primary/10 text-primary border-primary/20 font-bold' : 'border-gray-100 hover:bg-gray-50 text-gray-500'}`}
                    >
                      {c === 0 ? '∞' : `${c}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range Repetitions — CSS grid height transition */}
              <div className={`overflow-hidden transition-all duration-200 ${repeatMode === 'range' ? 'max-h-[120px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-3">Range Repetitions</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[1, 2, 3, 5, 10, 0].map((c) => (
                    <button
                      key={c}
                      onClick={() => setRangeRepeatCount(c)}
                      className={`py-2 text-xs rounded-lg border transition-all ${rangeRepeatCount === c ? 'bg-primary/10 text-primary border-primary/20 font-bold' : 'border-gray-100 hover:bg-gray-50 text-gray-500'}`}
                    >
                      {c === 0 ? '∞' : `${c}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Range — CSS height transition */}
              <div className={`overflow-hidden transition-all duration-200 flex flex-col gap-3 ${repeatMode === 'range' ? 'max-h-[200px] opacity-100 mt-4 pt-4 border-t border-gray-50' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block">Select Range</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 block mb-1">From Ayah</span>
                      <select 
                        value={repeatRange.start?.ayah || currentAyah.ayah}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setRepeatRange({ 
                            ...repeatRange, 
                            start: { surah: currentAyah.surah, ayah: val } 
                          });
                        }}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary/20 outline-none"
                      >
                        {Array.from({ length: chaptersTiny.find(c => c.id === currentAyah.surah)?.verses_count || 0 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 block mb-1">To Ayah</span>
                      <select 
                        value={repeatRange.end?.ayah || ""}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          setRepeatRange({ 
                            ...repeatRange, 
                            end: val ? { surah: currentAyah.surah, ayah: val } : null 
                          });
                        }}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary/20 outline-none"
                      >
                        <option value="">End...</option>
                        {Array.from(
                          { length: chaptersTiny.find(c => c.id === currentAyah.surah)?.verses_count || 0 }, 
                          (_, i) => i + 1
                        )
                        .filter(n => n >= (repeatRange.start?.ayah || currentAyah.ayah))
                        .map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
                  
              <button
                onClick={() => {
                  let finalStart = repeatRange.start;
                  if (repeatMode === 'range' && !finalStart) {
                     finalStart = { surah: currentAyah.surah, ayah: currentAyah.ayah };
                     setRepeatRange({ ...repeatRange, start: finalStart });
                  }
                  if (repeatMode === 'range' && finalStart) {
                    playAyah(currentAyah.surah, finalStart.ayah, true);
                  }
                  setIsRepeatMenuOpen(false);
                }}
                className={`w-full bg-primary/90 hover:bg-primary text-white py-2.5 rounded-xl text-sm font-bold shadow-[0_8px_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_12px_25px_rgba(var(--primary-rgb),0.4)] hover:scale-[1.01] active:scale-95 transition-all border border-white/20 backdrop-blur-sm ${repeatMode !== 'none' ? 'mt-6' : 'mt-4'}`}
              >
                Confirm Settings
              </button>
            </div>
          </div>
        </div>

        {/* Top Section: Info and Close */}
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Now Playing</span>
            <div className="flex items-center gap-2">
              <span 
                className="text-primary font-semibold text-xl" 
                style={{ fontFamily: "surah-name-v3", textRendering: "optimizeLegibility" }}
              >
                سُورَةُ {surahName}
              </span>
              <span className="text-muted text-sm font-medium">Ayah {currentAyah.ayah}</span>
            </div>
          </div>
          <button 
            onClick={stopAudio}
            className="p-1.5 hover:bg-black/5 rounded-full transition-colors text-muted hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Translation Text Display — CSS opacity fade keyed by ayah */}
        {currentAyah && translationText && (
          <div
            key={translationKey}
            className="px-4 py-1 pb-2 max-h-[25vh] overflow-y-auto custom-scrollbar animate-fade-in"
          >
            <p 
              className={`text-gray-700 leading-relaxed text-center font-medium selection:bg-primary/20 transition-all duration-300
                ${[158, 97, 234, 54, 151, 819].includes(translationId) 
                  ? 'font-arabic text-xl border-t border-primary/5 pt-2' 
                  : 'text-sm'}`}
              dir={[158, 97, 234, 54, 151, 819].includes(translationId) ? "rtl" : "ltr"}
            >
              {[158, 97, 234, 54, 151, 819].includes(translationId) ? translationText : `"${translationText}"`}
            </p>
          </div>
        )}

        {/* Controls Section */}
        <div className="flex items-center justify-between bg-white/80 border border-gray-100 rounded-2xl p-2 shadow-sm">
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                setIsReciterMenuOpen(!isReciterMenuOpen);
                setIsTranslationMenuOpen(false);
                setIsRepeatMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${isReciterMenuOpen ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-primary'}`}
              title="Choose Qari"
            >
              <User size={20} />
            </button>

            <button 
              onClick={() => {
                setIsTranslationMenuOpen(!isTranslationMenuOpen);
                setIsReciterMenuOpen(false);
                setIsRepeatMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${isTranslationMenuOpen ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-primary'}`}
              title="Choose Translation"
            >
              <Languages size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={playPreviousAyah}
              className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all active:scale-90"
              title="Previous Ayah"
            >
              <SkipBack size={20} fill="currentColor" className="opacity-80" />
            </button>

            <button 
              onClick={togglePlay}
              className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
            >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
            </button>

            <button 
              onClick={playNextAyah}
              className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all active:scale-90"
              title="Next Ayah"
            >
              <SkipForward size={20} fill="currentColor" className="opacity-80" />
            </button>
          </div>

          <button 
            onClick={toggleAutoplay}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${isAutoplay ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-black/5'}`}
            title={isAutoplay ? "Autoplay On" : "Autoplay Off"}
          >
            <RefreshCcw size={20} className={isAutoplay ? 'animate-spin-slow' : ''} />
          </button>

          <button 
            onClick={() => {
              setIsRepeatMenuOpen(!isRepeatMenuOpen);
              setIsReciterMenuOpen(false);
              setIsTranslationMenuOpen(false);
            }}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${repeatMode !== 'none' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-black/5'}`}
            title="Repeat Settings"
          >
            {repeatMode === 'single' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>

        </div>
      </div>
    </div>
  );
});

export default MediaPlayer;

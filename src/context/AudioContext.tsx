"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import chapters from "../../public/data/chapters-tiny.json";
import type { ChapterTiny } from "@/types/quran";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { resolveAyahAudioSrc, pruneStaleAyahAudio } from "@/lib/offline/resolve/audio";
import { resolveTranslationText } from "@/lib/offline/resolve/translation";
import { TAFSIRS, DEFAULT_TAFSIR_ID } from "@/lib/tafsirs";

const chaptersTiny = chapters as ChapterTiny[];

interface AyahId {
  surah: number;
  ayah: number;
}

interface Reciter {
  id: number;
  name: string;
  style?: string;
  slug: string;
}

interface Translation {
  id: number;
  name: string;
  author: string;
  slug: string;
}

interface AudioActionsType {
  playAyah: (surah: number, ayah: number, shouldPlay?: boolean, overrideReciterId?: number, isInternal?: boolean) => void;
  playUrl: (url: string, id: string, surah?: number, ayah?: number) => void;
  togglePlay: () => void;
  toggleAutoplay: () => void;
  playNextAyah: () => void;
  playPreviousAyah: () => void;
  setReciter: (id: number) => void;
  stopAudio: () => void;
  setTranslationId: (id: number) => void;
  setTafsir: (id: number) => void;
  setRepeatMode: (mode: 'none' | 'single' | 'range') => void;
  setRepeatCount: (count: number) => void;
  setRepeatRange: (range: { start: AyahId | null, end: AyahId | null }) => void;
  setRangeRepeatCount: (count: number) => void;
  setLanguage: (lang: 'en' | 'ur') => void;
  setLastRead: (data: { pageNumber: number, surahName: string }) => void;
  setIsTafseerVisible: (visible: boolean) => void;
  reciters: Reciter[];
  translations: Translation[];
}

interface AudioStateType {
  currentAyah: AyahId | null;
  isPlaying: boolean;
  isAutoplay: boolean;
  reciterId: number;
  translationId: number;
  tafsirId: number;
  activeId: string | null;
  translationText: string | null;
  repeatMode: 'none' | 'single' | 'range';
  repeatCount: number;
  repeatRange: { start: AyahId | null, end: AyahId | null };
  rangeRepeatCount: number;
  currentRepeatIndex: number;
  rangeCycleIndex: number;
  language: 'en' | 'ur';
  lastRead: { pageNumber: number, surahName: string } | null;
  isTafseerVisible: boolean;
}

const AudioActionsContext = createContext<AudioActionsType | undefined>(undefined);
const AudioStateContext = createContext<AudioStateType | undefined>(undefined);

export const RECITERS: Reciter[] = [
  { id: 9, name: "Mohamed Siddiq al-Minshawi", style: "Murattal", slug: "minshawi-murattal" },
  { id: 8, name: "Mohamed Siddiq al-Minshawi", style: "Mujawwad", slug: "minshawi-mujawwad" },
  { id: 2, name: "AbdulBaset AbdulSamad", style: "Murattal", slug: "abdulbaset-murattal" },
  { id: 1, name: "AbdulBaset AbdulSamad", style: "Mujawwad", slug: "abdulbaset-mujawwad" },
  { id: 12, name: "Mahmoud Khalil Al-Husary", style: "Muallim", slug: "husary-muallim" },
  { id: 6, name: "Mahmoud Khalil Al-Husary", style: "Murattal", slug: "husary" },
  { id: 3, name: "Abdur-Rahman as-Sudais", style: "Murattal", slug: "sudais" },
  { id: 10, name: "Sa`ud ash-Shuraym", style: "Murattal", slug: "shuraym" },
  { id: 4, name: "Abu Bakr al-Shatri", style: "Murattal", slug: "shatri" },
  { id: 5, name: "Hani ar-Rifai", style: "Murattal", slug: "rifai" },
  { id: 11, name: "Mohamed al-Tablawi", style: "Murattal", slug: "tablawi" },
];

export function buildAyahAudioUrl(surah: number, ayah: number, reciterId: number): string {
  const s = String(surah).padStart(3, "0");
  const a = String(ayah).padStart(3, "0");
  const filename = `${s}${a}.mp3`;

  switch (reciterId) {
    case 9:  // Mohamed Siddiq al-Minshawi (Murattal)
      return `https://verses.quran.com/Minshawi/Murattal/mp3/${filename}`;
    case 8:  // Mohamed Siddiq al-Minshawi (Mujawwad)
      return `https://verses.quran.com/Minshawi/Mujawwad/mp3/${filename}`;
    case 2:  // AbdulBaset AbdulSamad (Murattal)
      return `https://verses.quran.com/AbdulBaset/Murattal/mp3/${filename}`;
    case 1:  // AbdulBaset AbdulSamad (Mujawwad)
      return `https://verses.quran.com/AbdulBaset/Mujawwad/mp3/${filename}`;
    case 12: // Mahmoud Khalil Al-Husary (Muallim)
      return `https://mirrors.quranicaudio.com/everyayah/Husary_Muallim_128kbps/${filename}`;
    case 6:  // Mahmoud Khalil Al-Husary (Murattal)
      return `https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/${filename}`;
    case 3:  // Abdur-Rahman as-Sudais (Murattal)
      return `https://verses.quran.com/Sudais/mp3/${filename}`;
    case 10: // Sa`ud ash-Shuraym (Murattal)
      return `https://verses.quran.com/Shuraym/mp3/${filename}`;
    case 4:  // Abu Bakr al-Shatri (Murattal)
      return `https://verses.quran.com/Shatri/mp3/${filename}`;
    case 5:  // Hani ar-Rifai (Murattal)
      return `https://verses.quran.com/Rifai/mp3/${filename}`;
    case 11: // Mohamed al-Tablawi (Murattal)
      return `https://mirrors.quranicaudio.com/everyayah/Mohammad_al_Tablaway_128kbps/${filename}`;
    default:
      return "";
  }
}

export const TRANSLATIONS: Translation[] = [
  // English
  { id: 20, name: "Sahih International", author: "Sahih International", slug: "en-sahih" },
  { id: 84, name: "Taqi Usmani", author: "Mufti Taqi Usmani", slug: "en-taqi-usmani" },
  { id: 85, name: "Abdul Haleem", author: "M.A.S. Abdel Haleem", slug: "en-abdul-haleem" },
  { id: 22, name: "Yusuf Ali", author: "Abdullah Yusuf Ali", slug: "en-yusuf-ali" },
  { id: 95, name: "Tafheem-ul-Quran (English)", author: "Syed Abu Ali Maududi", slug: "en-maududi" },
  
  // Urdu
  { id: 158, name: "Bayan-ul-Quran (Urdu)", author: "Dr. Israr Ahmad", slug: "bayan-ul-quran" },
  { id: 97, name: "Tafheem-e-Qur'an (Urdu)", author: "Syed Abu Ali Maududi", slug: "ur-al-maududi" },
  { id: 234, name: "Fatah Muhammad Jalandhari (Urdu)", author: "Fatah Muhammad Jalandhari", slug: "ur-fatah-muhammad-jalandhari" },
  { id: 54, name: "Maulana Muhammad Junagarhi (Urdu)", author: "Maulana Muhammad Junagarhi", slug: "ur-junagarri" },
  { id: 151, name: "Tafsir-e-Usmani (Urdu)", author: "Shaykh al-Hind Mahmud al-Hasan", slug: "tafsir-e-usmani" },
  { id: 819, name: "Maulana Wahiduddin Khan (Urdu)", author: "Maulana Wahiduddin Khan", slug: "maulana-wahid-uddin-khan-urdu" },
  { id: 831, name: "Maududi (Roman Urdu)", author: "Abul Ala Maududi", slug: "maududi-roman-urdu" },
];

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAyah, setCurrentAyah] = useState<AyahId | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);

  const { user } = useAuth();

  // Persistent Settings
  const [reciterId, setReciterId] = useState(RECITERS[0].id);
  const [translationId, setTranslationId] = useState(20);
  const [tafsirId, setTafsirIdState] = useState(DEFAULT_TAFSIR_ID);

  // Hydration-safe persistent settings initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedReciter = localStorage.getItem("defaultReciterId");
      const savedTranslation = localStorage.getItem("defaultTranslationId");
      
      const pReciter = parseInt(savedReciter || "");
      const pTrans = parseInt(savedTranslation || "");
      if (!isNaN(pReciter)) setReciterId(pReciter);
      if (!isNaN(pTrans)) {
        setTranslationId(pTrans === 0 || TRANSLATIONS.some(t => t.id === pTrans) ? pTrans : 20);
      }
    }
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [translationText, setTranslationText] = useState<string | null>(null);
  const translationCache = useRef<Map<string, string>>(new Map());
  const [language, setLanguageState] = useState<'en' | 'ur'>('en');
  const [lastRead, setLastReadState] = useState<{ pageNumber: number, surahName: string } | null>(null);
  
  // System State
  const [repeatMode, setRepeatMode] = useState<'none' | 'single' | 'range'>('none');
  const [repeatCount, setRepeatCount] = useState(1);
  const [repeatRange, setRepeatRange] = useState<{ start: AyahId | null, end: AyahId | null }>({ start: null, end: null });
  const [rangeRepeatCount, setRangeRepeatCount] = useState(1);
  const [currentRepeatIndex, setCurrentRepeatIndex] = useState(0);
  const [rangeCycleIndex, setRangeCycleIndex] = useState(0);
  const [isTafseerVisible, setIsTafseerVisible] = useState(false);

  // Initial Load Logic
  useEffect(() => {
    const savedLang = localStorage.getItem('language') || localStorage.getItem('app_language');
    const savedReciter = localStorage.getItem('preferred_qari');
    const savedTranslation = localStorage.getItem('preferred_translation');
    const savedTafsir = localStorage.getItem('preferred_tafsir');
    const savedRead = localStorage.getItem('last_opened_page');

    if (savedLang === 'ur' || savedLang === 'en') setLanguageState(savedLang);

    const pRec = Number(savedReciter);
    const pTrans = Number(savedTranslation);
    const pTafsir = Number(savedTafsir);
    if (!isNaN(pRec) && pRec > 0) setReciterId(pRec);
    if (!isNaN(pTrans) && savedTranslation !== null && savedTranslation !== "undefined") {
      setTranslationId(pTrans === 0 || TRANSLATIONS.some(t => t.id === pTrans) ? pTrans : 20);
    }
    if (!isNaN(pTafsir) && savedTafsir !== null && savedTafsir !== "undefined" && TAFSIRS.some(t => t.id === pTafsir)) {
      setTafsirIdState(pTafsir);
    }

    if (savedRead && savedRead !== "undefined") {
      try {
        const parsed = JSON.parse(savedRead);
        setLastReadState({ pageNumber: parsed.pageNumber, surahName: parsed.surahName });
      } catch { }
    }
  }, []);

  // Unified Syncing Logic
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const syncPreferences = useCallback((updates: Record<string, unknown>) => {
    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, String(value));
      }
    });

    const currentUser = userRef.current;
    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid), updates, { merge: true }).catch((err) => {
        console.error("Failed to sync preferences to Firestore:", err);
      });
    }
  }, []);

  // Pull down any previously-synced preferences when a user signs in,
  // so preferences follow the account across devices/reinstalls.
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return;
        const data = snap.data();

        if (data.language === 'en' || data.language === 'ur') {
          setLanguageState(data.language);
          localStorage.setItem('language', data.language);
        }
        if (typeof data.preferred_qari === 'number') {
          setReciterId(data.preferred_qari);
          localStorage.setItem('preferred_qari', String(data.preferred_qari));
        }
        if (typeof data.preferred_translation === 'number') {
          setTranslationId(data.preferred_translation);
          localStorage.setItem('preferred_translation', String(data.preferred_translation));
        }
        if (typeof data.preferred_tafsir === 'number') {
          setTafsirIdState(data.preferred_tafsir);
          localStorage.setItem('preferred_tafsir', String(data.preferred_tafsir));
        }
        if (data.last_opened_page) {
          setLastReadState({
            pageNumber: data.last_opened_page.pageNumber,
            surahName: data.last_opened_page.surahName,
          });
          localStorage.setItem('last_opened_page', JSON.stringify(data.last_opened_page));
        }
      } catch (err) {
        console.error("Failed to hydrate preferences from Firestore:", err);
      }
    })();
  }, [user]);

  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const isAutoplayRef = useRef(isAutoplay);
  const currentAyahRef = useRef(currentAyah);
  const repeatModeRef = useRef(repeatMode);
  const repeatCountRef = useRef(repeatCount);
  const repeatRangeRef = useRef(repeatRange);
  const rangeRepeatCountRef = useRef(rangeRepeatCount);
  const currentRepeatIndexRef = useRef(currentRepeatIndex);
  const rangeCycleIndexRef = useRef(rangeCycleIndex);
  const reciterIdRef = useRef(reciterId);

  useEffect(() => {
    isAutoplayRef.current = isAutoplay;
    currentAyahRef.current = currentAyah;
    repeatModeRef.current = repeatMode;
    repeatCountRef.current = repeatCount;
    repeatRangeRef.current = repeatRange;
    rangeRepeatCountRef.current = rangeRepeatCount;
    currentRepeatIndexRef.current = currentRepeatIndex;
    reciterIdRef.current = reciterId;
    rangeCycleIndexRef.current = rangeCycleIndex;
  }, [isAutoplay, currentAyah, repeatMode, repeatCount, repeatRange, rangeRepeatCount, currentRepeatIndex, rangeCycleIndex, reciterId]);

  useEffect(() => {
    // 1. Initialize Ayah Audio (Main Player)
    const ayahAudio = new Audio();
    ayahAudioRef.current = ayahAudio;

    // Hot Font Optimization: Pre-activate Urdu font immediately on mount
    if (typeof window !== "undefined" && document.fonts) {
      document.fonts.load('1em UrduNastaleeq')
        .then(() => console.log("Urdu font (Al Qalam) pre-activated successfully."))
        .catch(err => console.warn("Urdu font pre-activation failed:", err));
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      
      const mode = repeatModeRef.current;
      const count = repeatCountRef.current;
      const range = repeatRangeRef.current;
      const current = currentAyahRef.current;

      if (!current) return;

      if (mode === 'single') {
        if (count === 0 || (currentRepeatIndexRef.current + 1) < count) {
          setCurrentRepeatIndex(prev => prev + 1);
          playAyahRef.current?.(current.surah, current.ayah, true, undefined, true);
          return;
        } else {
          setCurrentRepeatIndex(0);
        }
      } else if (mode === 'range' && range.start && range.end) {
        if (count === 0 || (currentRepeatIndexRef.current + 1) < count) {
          setCurrentRepeatIndex(prev => prev + 1);
          playAyahRef.current?.(current.surah, current.ayah, true, undefined, true);
          return;
        } else {
          setCurrentRepeatIndex(0);
          
          const isAtEnd = current.surah === range.end.surah && current.ayah === range.end.ayah;
          if (isAtEnd) {
            const rCount = rangeRepeatCountRef.current;
            const cycleIndex = rangeCycleIndexRef.current;
            
            if (rCount === 0 || (cycleIndex + 1) < rCount) {
              setRangeCycleIndex(prev => prev + 1);
              playAyahRef.current?.(range.start.surah, range.start.ayah, true, undefined, true);
              return;
            } else {
              setRangeCycleIndex(0);
            }
          } else {
            const nextAyah = current.ayah + 1;
            const chapter = chaptersTiny.find(c => c.id === current.surah);
            if (chapter && nextAyah <= chapter.verses_count && nextAyah <= range.end.ayah) {
              playAyahRef.current?.(current.surah, nextAyah, true, undefined, true);
              return;
            } else {
              // Out of range fallback: Pause if not infinity
              if (count === 0) {
                setRangeCycleIndex(prev => prev + 1);
                playAyahRef.current?.(range.start.surah, range.start.ayah, true, undefined, true);
                return;
              } else {
                if (ayahAudioRef.current) {
                  ayahAudioRef.current.pause();
                  ayahAudioRef.current.currentTime = 0;
                }
                setIsPlaying(false);
                setCurrentRepeatIndex(0);
                setRangeCycleIndex(0);
                return;
              }
            }
          }
        }
      }

      if (isAutoplayRef.current) {
        const chapter = chaptersTiny.find(c => c.id === current.surah);
        if (chapter) {
          let nextSurah = current.surah;
          let nextAyah = current.ayah + 1;
          if (nextAyah > chapter.verses_count) {
             nextSurah += 1;
             nextAyah = 1;
          }
          if (nextSurah <= 114) {
            playAyahRef.current?.(nextSurah, nextAyah, true);
          }
        }
      }
    };

    // If a locally-downloaded file fails to play (deleted/corrupted outside
    // the app), prune the stale manifest entry and retry once against the
    // live CDN URL instead of leaving playback silently broken.
    let retryingAfterLocalFailure = false;
    const handleError = () => {
      const src = ayahAudio.src;
      const isLocalFile = src.startsWith("capacitor://") || src.startsWith("file://") || src.startsWith("https://localhost") || src.startsWith("http://localhost");
      const current = currentAyahRef.current;
      if (!isLocalFile || !current || retryingAfterLocalFailure) return;

      const reciter = RECITERS.find(r => r.id === reciterIdRef.current);
      if (!reciter) return;

      retryingAfterLocalFailure = true;
      pruneStaleAyahAudio(reciter.slug, current.surah, current.ayah)
        .catch(() => {})
        .finally(() => {
          const remoteUrl = buildAyahAudioUrl(current.surah, current.ayah, reciterIdRef.current);
          if (remoteUrl) {
            ayahAudio.src = remoteUrl;
            ayahAudio.currentTime = 0;
            ayahAudio.play().catch(() => {}).finally(() => {
              retryingAfterLocalFailure = false;
            });
          } else {
            retryingAfterLocalFailure = false;
          }
        });
    };

    ayahAudio.addEventListener("play", handlePlay);
    ayahAudio.addEventListener("pause", handlePause);
    ayahAudio.addEventListener("ended", handleEnded);
    ayahAudio.addEventListener("error", handleError);

    // 2. Initialize Word Audio
    const wordAudio = new Audio();
    wordAudioRef.current = wordAudio;

    const handleWordEnded = () => {
      // Restore ayah highlighting if it exists
      if (currentAyahRef.current) {
        setActiveId(`${currentAyahRef.current.surah}:${currentAyahRef.current.ayah}`);
      } else {
        setActiveId(null);
      }
    };

    wordAudio.addEventListener("ended", handleWordEnded);

    return () => {
      ayahAudio.removeEventListener("play", handlePlay);
      ayahAudio.removeEventListener("pause", handlePause);
      ayahAudio.removeEventListener("ended", handleEnded);
      ayahAudio.removeEventListener("error", handleError);
      ayahAudio.pause();
      ayahAudio.src = "";

      wordAudio.removeEventListener("ended", handleWordEnded);
      wordAudio.pause();
      wordAudio.src = "";
    };
  }, []);

  const playPromiseRef = useRef<Promise<void> | null>(null);
  const playAyahRef = useRef<(surah: number, ayah: number, shouldPlay?: boolean, overrideReciterId?: number, isInternal?: boolean) => void>(null);
  const playNextAyahRef = useRef<() => void>(null);
  const playPreviousAyahRef = useRef<() => void>(null);

  const playAyah = useCallback(async (surah: number, ayah: number, shouldPlay = false, overrideReciterId?: number, isInternal = false) => {
    if (!ayahAudioRef.current) return;

    const targetReciterId = overrideReciterId || reciterId;
    const ayahKey = `${surah}:${ayah}`;

    // Prefer a downloaded local file if this ayah/reciter is offline;
    // otherwise build the remote CDN URL exactly as before (zero network
    // request to construct it — the fetch happens when playback starts).
    const targetReciter = RECITERS.find(r => r.id === targetReciterId);
    const localSrc = targetReciter
      ? await resolveAyahAudioSrc(targetReciter.slug, surah, ayah)
      : null;
    const url = localSrc ?? buildAyahAudioUrl(surah, ayah, targetReciterId);
    if (!url) return;

    // Batch all state updates together
    setCurrentAyah({ surah, ayah });
    setActiveId(ayahKey);
    setIsTafseerVisible(false);
    if (!isInternal) {
      setCurrentRepeatIndex(0);
      setRangeCycleIndex(0);
    }

    // Set src and play — no .load() call needed
    if (ayahAudioRef.current.src !== url) {
      ayahAudioRef.current.src = url;
    }
    ayahAudioRef.current.currentTime = 0;

    if (shouldPlay) {
      const playPromise = ayahAudioRef.current.play();
      playPromiseRef.current = playPromise;
      playPromise.catch(err => {
        if (err.name !== "AbortError") console.error("Playback failed:", err);
      });
    } else {
      setIsPlaying(false);
    }
  }, [reciterId]);

  useEffect(() => {
    playAyahRef.current = playAyah;
  }, [playAyah]);

  // Media Session Metadata Sync
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !currentAyah) return;

    const targetReciter = RECITERS.find(r => r.id === reciterId);
    const reciterName = targetReciter ? targetReciter.name : "Quran Reciter";
    const chapter = chaptersTiny.find(c => Number(c.id) === Number(currentAyah.surah));
    const surahName = chapter ? chapter.name_simple : `Surah ${currentAyah.surah}`;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Surah ${surahName} - Ayah ${currentAyah.ayah}`,
      artist: reciterName,
      album: "Quran Library",
      artwork: [
        { src: "/icon.png", sizes: "512x512", type: "image/png" }
      ]
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [currentAyah, isPlaying, reciterId]);

  // Media Session Action Handlers
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler("play", () => {
        if (ayahAudioRef.current) {
          ayahAudioRef.current.play().catch(() => {});
        }
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        if (ayahAudioRef.current) {
          ayahAudioRef.current.pause();
        }
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        playNextAyahRef.current?.();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        playPreviousAyahRef.current?.();
      });
    } catch (err) {
      console.warn("MediaSession action handlers registration failed:", err);
    }

    return () => {
      if (!("mediaSession" in navigator)) return;
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, []);

  const playUrl = useCallback((url: string, id: string) => {
    if (!wordAudioRef.current) return;
    
    // Decoupled from currentAyah to prevent triggering the main MediaPlayer
    // if (surah && ayah) {
    //   setCurrentAyah({ surah, ayah });
    // }

    if (wordAudioRef.current.src !== url) {
      wordAudioRef.current.src = url;
    }

    wordAudioRef.current.currentTime = 0;
    setActiveId(id);

    const playPromise = wordAudioRef.current.play();
    playPromise.catch(err => {
      if (err.name !== "AbortError") {
        console.error("Word playback failed:", err);
      }
    });
  }, []);

  const playNextAyah = useCallback(() => {
    if (!currentAyah) return;
    const chapter = chaptersTiny.find(c => c.id === currentAyah.surah);
    if (!chapter) return;
    let nextSurah = currentAyah.surah;
    let nextAyah = currentAyah.ayah + 1;
    if (nextAyah > chapter.verses_count) {
      nextSurah += 1;
      nextAyah = 1;
    }
    if (nextSurah > 114) {
      setCurrentAyah(null);
      setActiveId(null);
      return;
    }
    playAyah(nextSurah, nextAyah, true);
  }, [currentAyah, playAyah]);

  const playPreviousAyah = useCallback(() => {
    if (!currentAyah) return;
    let prevSurah = currentAyah.surah;
    let prevAyah = currentAyah.ayah - 1;
    if (prevAyah < 1) {
      if (prevSurah <= 1) {
         if (ayahAudioRef.current) ayahAudioRef.current.currentTime = 0;
         return;
      }
      prevSurah -= 1;
      const prevChapter = chaptersTiny.find(c => c.id === prevSurah);
      prevAyah = prevChapter ? prevChapter.verses_count : 1;
    }
    playAyah(prevSurah, prevAyah, true);
  }, [currentAyah, playAyah]);

  useEffect(() => {
    playNextAyahRef.current = playNextAyah;
    playPreviousAyahRef.current = playPreviousAyah;
  }, [playNextAyah, playPreviousAyah]);

  const togglePlay = useCallback(async () => {
    if (!ayahAudioRef.current || !currentAyah) return;
    if (isPlaying) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => { });
      }
      ayahAudioRef.current.pause();
    } else {
      const playPromise = ayahAudioRef.current.play();
      playPromiseRef.current = playPromise;
      playPromise.catch(err => {
        if (err.name !== "AbortError") {
          console.error("Playback failed:", err);
        }
      });
    }
  }, [isPlaying, currentAyah]);

  const stopAudio = useCallback(() => {
    if (ayahAudioRef.current) {
      ayahAudioRef.current.pause();
      ayahAudioRef.current.currentTime = 0;
    }
    if (wordAudioRef.current) {
      wordAudioRef.current.pause();
      wordAudioRef.current.currentTime = 0;
    }
    setCurrentAyah(null);
    setActiveId(null);
    setIsPlaying(false);
    
    setRepeatMode('none');
    setRepeatCount(1);
    setRangeRepeatCount(1);
    setRepeatRange({ start: null, end: null });
    setCurrentRepeatIndex(0);
    setRangeCycleIndex(0);
  }, []);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay(prev => {
      const newVal = !prev;
      if (newVal) setRepeatMode('none');
      return newVal;
    });
  }, []);

  const handleSetRepeatMode = useCallback((mode: 'none' | 'single' | 'range') => {
    setRepeatMode(mode);
    if (mode !== 'none') setIsAutoplay(false);
    setCurrentRepeatIndex(0);
    setRangeCycleIndex(0);
    if (mode === 'none') {
      setRepeatCount(1);
      setRangeRepeatCount(1);
    }
  }, []);

  const setLanguage = useCallback((lang: 'en' | 'ur') => {
    setLanguageState(lang);
    syncPreferences({ language: lang });
    
    const defaultTranslationId = lang === 'ur' ? 158 : 20;
    setTranslationId(defaultTranslationId);
    syncPreferences({ preferred_translation: defaultTranslationId });
  }, [syncPreferences]);

  const setReciter = useCallback((id: number) => {
    setReciterId(id);
    syncPreferences({ preferred_qari: id });
    if (currentAyah) {
      playAyah(currentAyah.surah, currentAyah.ayah, true, id);
    }
  }, [currentAyah, playAyah, syncPreferences]);

  const handleSetTranslationId = useCallback((id: number) => {
    setTranslationId(id);
    syncPreferences({ preferred_translation: id });
  }, [syncPreferences]);

  const setTafsir = useCallback((id: number) => {
    setTafsirIdState(id);
    syncPreferences({ preferred_tafsir: id });
  }, [syncPreferences]);


  const fetchAyahTranslation = useCallback(async (surah: number, ayah: number, tId: number) => {
    const key = `${surah}:${ayah}:${tId}`;

    // Instant cache hit
    if (translationCache.current.has(key)) {
      setTranslationText(translationCache.current.get(key)!);
      return;
    }

    // Prefer the pre-bundled, offline-capable copy shipped with the app;
    // fall back to a live fetch for any translation not in the bundled set.
    const bundled = await resolveTranslationText(tId, surah, ayah);
    if (bundled) {
      translationCache.current.set(key, bundled.text);
      setTranslationText(bundled.text);
      return;
    }

    try {
      // Fail fast on a genuinely offline device instead of hanging indefinitely.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      let res: Response;
      try {
        res = await fetch(`https://api.quran.com/api/v4/quran/translations/${tId}?verse_key=${surah}:${ayah}`, {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const data = await res.json();
      if (data.translations && data.translations.length > 0) {
        const text = data.translations[0].text.replace(/<[^>]*>?/gm, '');
        translationCache.current.set(key, text);
        setTranslationText(text);
      }
    } catch (err) {
      console.error("Failed to fetch ayah translation:", err);
      setTranslationText(null);
    }
  }, []);

  useEffect(() => {
    if (currentAyah && translationId !== 0) {
      fetchAyahTranslation(currentAyah.surah, currentAyah.ayah, translationId);
    } else {
      setTranslationText(null);
    }
  }, [currentAyah, translationId, fetchAyahTranslation]);

  const handleSetLastRead = useCallback((data: { pageNumber: number, surahName: string }) => {
    setLastReadState(data);
    const lastReadData = {
      ...data,
      timestamp: Date.now()
    };
    syncPreferences({ last_opened_page: lastReadData });
  }, [syncPreferences]);

  const actionsValue = useMemo(() => ({
    playAyah, playUrl, togglePlay, toggleAutoplay,
    playNextAyah, playPreviousAyah, setReciter, stopAudio,
    setTranslationId: handleSetTranslationId,
    setTafsir,
    setRepeatMode: handleSetRepeatMode,
    setRepeatCount, setRepeatRange, setRangeRepeatCount,
    setLanguage, setLastRead: handleSetLastRead,
    setIsTafseerVisible,
    reciters: RECITERS,
    translations: TRANSLATIONS,
  }), [
    playAyah, playUrl, togglePlay, toggleAutoplay,
    playNextAyah, playPreviousAyah, setReciter, stopAudio,
    handleSetTranslationId, setTafsir, handleSetRepeatMode,
    setLanguage, handleSetLastRead,
  ]);

  const stateValue = useMemo(() => ({
    currentAyah, isPlaying, isAutoplay, reciterId,
    translationId, tafsirId, activeId, translationText,
    repeatMode, repeatCount, repeatRange, rangeRepeatCount,
    currentRepeatIndex, rangeCycleIndex,
    language, lastRead, isTafseerVisible,
  }), [
    currentAyah, isPlaying, isAutoplay, reciterId,
    translationId, tafsirId, activeId, translationText,
    repeatMode, repeatCount, repeatRange, rangeRepeatCount,
    currentRepeatIndex, rangeCycleIndex,
    language, lastRead, isTafseerVisible,
  ]);

  return (
    <AudioActionsContext.Provider value={actionsValue}>
      <AudioStateContext.Provider value={stateValue}>
        {children}
      </AudioStateContext.Provider>
    </AudioActionsContext.Provider>
  );
};

export const useAudioActions = () => {
  const context = useContext(AudioActionsContext);
  if (!context) throw new Error("useAudioActions must be used within AudioProvider");
  return context;
};

export const useAudioState = () => {
  const context = useContext(AudioStateContext);
  if (!context) throw new Error("useAudioState must be used within AudioProvider");
  return context;
};

export const useAudioContext = () => ({
  ...useAudioActions(),
  ...useAudioState(),
});

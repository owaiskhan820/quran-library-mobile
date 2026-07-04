"use client";

import { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SpecialFontLoader from "@/components/QpcFontStyleRegistry";
import { loadPageFont, preloadPageFonts } from "@/lib/fontLoader";
import { useAudioContext, useAudioState, useAudioActions } from "@/context/AudioContext";
import { openDownloadModal } from "@/components/offline/DownloadModalHost";
import type { MushafLine, MushafWord } from "@/types/mushaf";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MushafSkeleton from "@/components/MushafSkeleton";
import { getJuzForPage } from "@/utils/juz";
import { getSurahNameArabic, getSurahForPage } from "@/utils/surah";
import chapters from "../../public/data/chapters-tiny.json";
import type { ChapterTiny } from "@/types/quran";
import pageStarts from "../../public/data/page-starts.json";
import DownloadPageButton from "@/components/offline/DownloadPageButton";
import AyahActionPopup from "./quran/AyahActionPopup";
import AyahTafseerDrawer from "./quran/AyahTafseerDrawer";

const chaptersTiny = chapters as ChapterTiny[];

const toArabicDigits = (num: number) => {
  return num.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
};



function getWordAudioUrl(location: string): string | null {
  if (!location) return null;
  const parts = location.split(":");
  if (parts.length !== 3) return null;
  const [s, a, w] = parts.map((n) => n.padStart(3, "0"));
  return `https://audio.qurancdn.com/wbw/${s}_${a}_${w}.mp3`;
}

function SharedTooltip({
  word,
  lineIdx,
  language,
  onDismiss,
}: {
  word: MushafWord;
  lineIdx: number;
  language: 'en' | 'ur';
  onDismiss: () => void;
}) {
  const translation = language === 'ur' ? word.ur : word.en;
  if (!translation) return null;
  const isTop = lineIdx > 0;

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto
        ${isTop ? "top-0 -translate-y-full pb-2" : "bottom-0 translate-y-full pt-2"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`bg-[#54948F] text-white px-3 py-1.5 rounded-md
        whitespace-nowrap font-medium shadow-lg relative
        ${language === 'ur' ? 'font-arabic text-lg pb-2' : 'text-sm'}`}>
        {translation}
        <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0
          border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent
          ${isTop
            ? "top-full border-t-[6px] border-t-[#54948F]"
            : "bottom-full border-b-[6px] border-b-[#54948F]"
          }`}
        />
      </div>
    </div>
  );
}

const FifteenLineGrid = memo(function FifteenLineGrid({
  pageNumber,
  lines,
  onOpenTafseer,
}: {
  pageNumber: number;
  lines: MushafLine[];
  onOpenTafseer: (surah: number, ayah: number, arabicWords: string[], pageNumber: number) => void;
}) {
  const { playAyah } = useAudioActions();
  const { language } = useAudioState();
  const [actionMenuWord, setActionMenuWord] = useState<MushafWord | null>(null);
  const [menuPosition, setMenuPosition] = useState<"top" | "bottom">("top");
  const [menuShift, setMenuShift] = useState(0);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [activeTooltip, setActiveTooltip] = useState<{
    word: MushafWord;
    lineIdx: number;
  } | null>(null);
  const tooltipDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWordAction = useCallback((word: MushafWord, lineIdx: number, action: 'stopSign' | 'tooltip') => {
    if (action === 'stopSign') {
      setMenuPosition(lineIdx === 0 ? "bottom" : "top");
      setActionMenuWord(word);
    } else if (action === 'tooltip') {
      setActiveTooltip({ word, lineIdx });
    }
  }, []);

  useEffect(() => {
    setActiveTooltip(null);
  }, [pageNumber]);

  useEffect(() => {
    if (!activeTooltip) return;
    if (tooltipDismissTimer.current) clearTimeout(tooltipDismissTimer.current);
    tooltipDismissTimer.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 2000);
    return () => {
      if (tooltipDismissTimer.current) clearTimeout(tooltipDismissTimer.current);
    };
  }, [activeTooltip]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (actionMenuWord && menuContainerRef.current && gridRef.current) {
      const rect = menuContainerRef.current.getBoundingClientRect();
      const gridRect = gridRef.current.getBoundingClientRect();
      const padding = 32;
      let newShift = 0;
      const menuWidth = 200;

      if (rect.left - menuWidth/2 < gridRect.left + padding) {
        newShift = (gridRect.left + padding) - (rect.left - menuWidth/2);
      } else if (rect.right + menuWidth/2 > gridRect.right - padding) {
        newShift = (gridRect.right - padding) - (rect.right + menuWidth/2);
      }
      requestAnimationFrame(() => setMenuShift(newShift));
    }
  }, [actionMenuWord, setMenuShift]);

  useEffect(() => {
    requestAnimationFrame(() => setActionMenuWord(null));
  }, [pageNumber, setActionMenuWord]);

  useEffect(() => {
    const isReady = document.fonts.check(`1em p${pageNumber}`);
    console.log(
      `[GRID RENDER] page=${pageNumber} | font_ready=${isReady} | lines=${lines.length} | ts=${performance.now().toFixed(1)}`
    );
  });  // no dependency array — fires after EVERY render

  function Basmalah() {
    return (
      <div className="flex w-full h-full items-center justify-center text-black">
        <span
          className="leading-none text-[clamp(1.2rem,5vw,1.5rem)] lg:text-[1.5em]"
          style={{
            fontFamily: "QuranCommon",
            fontVariantLigatures: "common-ligatures",
            fontFeatureSettings: '"liga" on'
          }}
        >
          ﷽
        </span>
      </div>
    );
  }

  const linesToRender = lines.slice(0, 15);

  return (
    <div
      ref={gridRef}
      className="relative w-full h-full grid-container"
      onTouchStart={() => setActiveTooltip(null)}
      onClick={() => setActiveTooltip(null)}
    >
      <div className={`absolute inset-0 z-0 hidden`} aria-hidden="true">
        <MushafSkeleton />
      </div>

      <div
        dir="rtl"
        className="grid h-full w-full"
        style={{
          fontFamily: `p${pageNumber}`,
          gridTemplateRows: "repeat(15, minmax(0, 1fr))"
        }}
      >
      {linesToRender.map((line, lineIdx) => (
        <div
          key={`line-${pageNumber}-${line.line}`}
          className="flex min-w-0 flex-row items-center px-0 lg:px-4"
          style={{ justifyContent: line.is_centered ? "center" : "space-between" }}
        >
          {line.type === "surah_name" ? (
            <div className="relative flex w-full h-full items-center justify-center text-secondary">
              <span
                className="block text-center leading-none opacity-90 text-[clamp(1.5rem,8vw,2.5rem)] lg:text-[clamp(2.4rem,7vw,2.7rem)]"
                style={{
                  fontFamily: "QuranCommon",
                  fontVariantLigatures: "common-ligatures",
                  fontFeatureSettings: '"liga" on'
                }}
              >
                header
              </span>
              <span
                className="absolute leading-none text-[clamp(1.1rem,7vw,2.1rem)] lg:text-[clamp(1.8rem,7.5vw,2.1rem)]"
                style={{ fontFamily: "surah-name-v2", marginTop: "-0.2rem" }}
              >
                {`surah${String(Number(line.surah) || 0).padStart(3, "0")}`}
              </span>
            </div>
          ) : ["basmalah", "basmallah"].includes(line.type) ? (
            <Basmalah />
          ) : line.words.length === 0 ? (
            <div className="h-full w-full" />
          ) : (
            line.words.map((word, idx) => {
              const isTooltipActive = activeTooltip?.word.l === word.l;

              const getAyahArabicWords = (surah: string, ayah: string) => {
                const ayahWords: string[] = [];
                lines.forEach(l => {
                  l.words.forEach(w => {
                    if (w.s === surah && w.a === ayah && !w.isStopSign) {
                      ayahWords.push(w.c);
                    }
                  });
                });
                return ayahWords;
              };

              return (
                <div key={word.l || `word-${pageNumber}-${lineIdx}-${idx}`}
                  className="relative flex items-center justify-center">
                  {isTooltipActive && (
                    <SharedTooltip
                      word={word}
                      lineIdx={lineIdx}
                      language={language}
                      onDismiss={() => setActiveTooltip(null)}
                    />
                  )}
                  <WordGlyph
                    word={word}
                    lineIdx={lineIdx}
                    language={language}
                    onAction={handleWordAction}
                  />
                  {word.isStopSign && (
                    <div
                      ref={actionMenuWord?.l === word.l ? menuContainerRef : null}
                      className={`absolute inset-x-0 bottom-0 z-[10000]
                        ${actionMenuWord?.l === word.l ? 'pointer-events-auto' : 'pointer-events-none'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <AyahActionPopup
                        isOpen={actionMenuWord?.l === word.l}
                        onClose={() => setActionMenuWord(null)}
                        onListen={() => playAyah(parseInt(word.s), parseInt(word.a))}
                        onTafseer={() => onOpenTafseer(
                          parseInt(word.s), parseInt(word.a),
                          getAyahArabicWords(word.s, word.a),
                          pageNumber
                        )}
                        onDownload={() => {
                          openDownloadModal({
                            tab: "ayahRange",
                            surah: parseInt(word.s),
                            ayah: parseInt(word.a),
                            pageNo: pageNumber,
                          });
                        }}
                        language={language}
                        position={menuPosition}
                        shift={menuShift}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ))}
      </div>
    </div>
  );
});

const WordGlyphComponent = function WordGlyph({
  word,
  lineIdx,
  language,
  onAction,
}: {
  word: MushafWord;
  lineIdx: number;
  language: 'en' | 'ur';
  onAction: (word: MushafWord, lineIdx: number, action: 'stopSign' | 'tooltip') => void;
}) {
  const { activeId } = useAudioState();
  const { playUrl } = useAudioActions();
  
  const isWordActive = activeId === word.l;
  const isAyahActive = activeId === `${word.s}:${word.a}`;
  const isActive = Boolean(isWordActive || (word.isStopSign && isAyahActive));
  const translation = language === 'ur' ? word.ur : word.en;

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (word.isStopSign) {
      onAction(word, lineIdx, 'stopSign');
    } else {
      if (translation) onAction(word, lineIdx, 'tooltip');
      const url = getWordAudioUrl(word.l);
      if (url) playUrl(url, word.l, parseInt(word.s), parseInt(word.a));
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleTap}
      className={`leading-none font-normal cursor-pointer transition-colors duration-150
        text-[clamp(1.15rem,5.2vw,1.65rem)] lg:text-[1.75rem]
        ${isActive
          ? "text-primary bg-primary/15 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] scale-[1.03]"
          : word.isStopSign
            ? "text-primary hover:bg-primary/5"
            : "text-[#1a1a1a] hover:bg-primary/5 hover:text-primary"
        }`}
      suppressHydrationWarning
    >
      {word.c}
    </div>
  );
};

const WordGlyph = memo(WordGlyphComponent, (prev, next) => {
  return prev.word.l === next.word.l &&
         prev.language === next.language;
});

export interface MushafSpreadViewerProps { initialPage?: number; }

function getRightPageClient(page: number) { return page <= 1 ? 1 : page % 2 === 1 ? page : page - 1; }

type SpreadData = {
  requestedPage: number;
  rightPage: number;
  leftPage: number;
  rightLines: MushafLine[];
  leftLines: MushafLine[];
};

export default function MushafSpreadViewer({ initialPage }: MushafSpreadViewerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchPage = searchParams.get('p');
  
  const resolvedInitialPage = initialPage || (searchPage ? parseInt(searchPage, 10) : 1);
  const initialRight = getRightPageClient(resolvedInitialPage);
  const initialLeft = initialRight + 1 <= 604 ? initialRight + 1 : initialRight;

  const [activeSpread, setActiveSpread] = useState<SpreadData>({
    requestedPage: resolvedInitialPage,
    rightPage: initialRight,
    leftPage: initialLeft,
    rightLines: [],
    leftLines: []
  });
  const [bufferSpread, setBufferSpread] = useState<SpreadData | null>(null);
  const [transitionState, setTransitionState] = useState<'idle' | 'preparing' | 'sliding'>('idle');

  const { requestedPage, rightPage, leftPage, rightLines, leftLines } = activeSpread;

  useEffect(() => {
    const isRightReady = document.fonts.check(`1em p${activeSpread.rightPage}`);
    const isLeftReady = document.fonts.check(`1em p${activeSpread.leftPage}`);
    console.log(
      `[SPREAD LAND] right=${activeSpread.rightPage} ready=${isRightReady} | left=${activeSpread.leftPage} ready=${isLeftReady} | ts=${performance.now().toFixed(1)}`
    );
  }, [activeSpread]);
  const [isFetching, setIsFetching] = useState(false);
  const [pendingDirection, setPendingDirection] = useState<'next' | 'prev' | null>(null);
  const [boundaryFlash, setBoundaryFlash] = useState<'start' | 'end' | null>(null);
  const hasBootstrapped = useRef(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferSpreadRef = useRef<SpreadData | null>(null);
  const isTransitioningRef = useRef(false);
  const pageCacheRef = useRef<Map<number, MushafLine[]>>(new Map());
  useEffect(() => {
    bufferSpreadRef.current = bufferSpread;
  }, [bufferSpread]);
  const { setLastRead, stopAudio, setIsTafseerVisible } = useAudioActions();
  const { language, lastRead, isTafseerVisible, currentAyah, tafsirId } = useAudioState();

  const [tafseerData, setTafseerData] = useState<{ 
    surah: number; 
    ayah: number; 
    arabicWords: string[]; 
    surahName: string;
    pageNumber: number;
  } | null>(null);

  const handleOpenTafseer = useCallback((surah: number, ayah: number, arabicWords: string[], pageNumber: number) => {
    const chapter = chaptersTiny.find(c => Number(c.id) === Number(surah));
    requestAnimationFrame(() => {
      setTafseerData({
        surah,
        ayah,
        arabicWords,
        pageNumber,
        surahName: chapter?.name_simple || `Surah ${surah}`,
      });
      stopAudio();
      setIsTafseerVisible(true);
    });
  }, [stopAudio, setIsTafseerVisible]);

  const stateRef = useRef({ requestedPage: activeSpread.requestedPage, isFetching });
  useEffect(() => {
    stateRef.current = { requestedPage: activeSpread.requestedPage, isFetching };
  }, [activeSpread.requestedPage, isFetching]);

  const fetchingPageRef = useRef<number | null>(null);

  const getPageData = useCallback(async (pageNo: number): Promise<MushafLine[]> => {
    if (pageCacheRef.current.has(pageNo)) {
      return pageCacheRef.current.get(pageNo)!;
    }
    const data = await fetch(`/data/pages/${pageNo}.json`).then(r => r.json());
    pageCacheRef.current.set(pageNo, data);
    return data;
  }, []);

  const prefetchNeighbors = useCallback((rPage: number, lPage: number) => {
    const toFetch = [rPage - 2, rPage - 1, lPage + 1, lPage + 2]
      .filter(p => p >= 1 && p <= 604 && !pageCacheRef.current.has(p));
    toFetch.forEach(async (pageNo) => {
      try {
        const data = await fetch(`/data/pages/${pageNo}.json`).then(r => r.json());
        pageCacheRef.current.set(pageNo, data);
      } catch { }
    });
  }, []);

  const fetchPageData = useCallback(async (pageTarget: number) => {
    if (fetchingPageRef.current === pageTarget) return;
    fetchingPageRef.current = pageTarget;

    const rPage = getRightPageClient(pageTarget);
    const lPage = rPage + 1 <= 604 ? rPage + 1 : rPage;
    setIsFetching(true);
    const [rLines, lLines] = await Promise.all([
      getPageData(rPage),
      getPageData(lPage),
    ]);

    // Load active page fonts — await both before transitioning
    await Promise.all([
      loadPageFont(rPage),
      loadPageFont(lPage),
    ]);

    fetchingPageRef.current = null;
    requestAnimationFrame(() => {
        setActiveSpread(prev => {
          const newData = { requestedPage: pageTarget, rightPage: rPage, leftPage: lPage, rightLines: rLines, leftLines: lLines };
          if (prev.rightLines.length === 0) {
            setIsFetching(false);
            setPendingDirection(null);
            prefetchNeighbors(rPage, lPage);
            return newData;
          }
          setBufferSpread(newData);
          setIsFetching(false);
          setTransitionState('preparing');
          prefetchNeighbors(rPage, lPage);
          return prev;
        });
    });
  }, [getPageData, prefetchNeighbors]);

  useEffect(() => {
    if (transitionState === 'preparing') {
      isTransitioningRef.current = true;
      const raf = requestAnimationFrame(() => {
        setTransitionState('sliding');
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [transitionState]);

  useEffect(() => {
    if (transitionState === 'sliding') {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        if (bufferSpreadRef.current) {
          setActiveSpread(bufferSpreadRef.current);
          setBufferSpread(null);
          setTransitionState('idle');
          setPendingDirection(null);
          isTransitioningRef.current = false;
        }
      }, 170); // 20ms buffer over the 150ms transition
    }
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [transitionState]);

  useEffect(() => {
    if (!hasBootstrapped.current) {
      hasBootstrapped.current = true;
      requestAnimationFrame(() => fetchPageData(resolvedInitialPage));
    }
  }, [resolvedInitialPage, fetchPageData]);

  useEffect(() => {
    preloadPageFonts([
      rightPage - 2,
      rightPage - 1,
      leftPage + 1,
      leftPage + 2,
    ].filter(p => p >= 1 && p <= 604));
  }, [rightPage, leftPage]);

  useEffect(() => {
    if (!requestedPage || !rightLines.length) return;
    const currentSurahId = getSurahForPage(rightLines);
    const chapter = chaptersTiny.find(c => Number(c.id) === Number(currentSurahId));
    if (chapter) setLastRead({ pageNumber: requestedPage, surahName: chapter.name_simple });
  }, [requestedPage, rightLines, setLastRead]);

  const navigateToPage = useCallback((pageTarget: number) => {
    if (isTransitioningRef.current) return;  // hard lock
    if (pageTarget > 604 || pageTarget < 1) {
      setBoundaryFlash(pageTarget > 604 ? 'end' : 'start');
      setTimeout(() => setBoundaryFlash(null), 400);
      return;
    }
    setPendingDirection(pageTarget > stateRef.current.requestedPage ? 'next' : 'prev');
    router.replace(`/read?p=${pageTarget}`, { scroll: false });
    fetchPageData(pageTarget);
  }, [router, fetchPageData]);

  useEffect(() => {
    if (!currentAyah) return;
    let targetPage = 1;
    for (let i = pageStarts.length - 1; i >= 0; i--) {
      const [sStart, aStart] = (pageStarts[i] as string).split(':').map(Number);
      if (currentAyah.surah > sStart || (currentAyah.surah === sStart && currentAyah.ayah >= aStart)) {
        targetPage = i + 1;
        break;
      }
    }
    const isTargetActive = targetPage === rightPage || targetPage === leftPage || targetPage === requestedPage;
    const isTargetBuffer = bufferSpread && (targetPage === bufferSpread.rightPage || targetPage === bufferSpread.leftPage || targetPage === bufferSpread.requestedPage);
    const isTargetFetching = fetchingPageRef.current === targetPage;

    if (!isTargetActive && !isTargetBuffer && !isTargetFetching) {
      const timer = setTimeout(() => {
        navigateToPage(targetPage);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentAyah, rightPage, leftPage, requestedPage, bufferSpread, navigateToPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isDesktop = window.innerWidth >= 1024;
      if (e.key === "ArrowLeft") {
        const nextTarget = isDesktop ? leftPage + 1 : requestedPage + 1;
        if (nextTarget <= 604) navigateToPage(nextTarget);
      } else if (e.key === "ArrowRight") {
        const prevTarget = isDesktop ? rightPage - 1 : requestedPage - 1;
        if (prevTarget >= 1) navigateToPage(prevTarget);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestedPage, leftPage, rightPage, navigateToPage]);

  useEffect(() => {
    const handleNavigateEvent = (e: Event) => {
      const page = (e as CustomEvent).detail?.page;
      if (page && typeof page === 'number' && page >= 1 && page <= 604) {
        router.push(`/read?p=${page}`, { scroll: false });
        fetchPageData(page);
      }
    };
    window.addEventListener('navigate-to-page', handleNavigateEvent);
    return () => window.removeEventListener('navigate-to-page', handleNavigateEvent);
  }, [fetchPageData, router]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const isWheelLocked = useRef(false);
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFetching) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isFetching) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEndSwipe = () => {
    if (!touchStart || !touchEnd || isFetching) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    if (isRightSwipe) {
      const nextTarget = isDesktop ? leftPage + 1 : requestedPage + 1;
      if (nextTarget <= 604) navigateToPage(nextTarget);
    } else if (isLeftSwipe) {
      const prevTarget = isDesktop ? rightPage - 1 : requestedPage - 1;
      if (prevTarget >= 1) navigateToPage(prevTarget);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isWheelLocked.current || isFetching) return;
    const threshold = 40;
    const { deltaX, deltaY } = e;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      isWheelLocked.current = true;
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
      if (deltaX > 0) {
        const nextTarget = isDesktop ? leftPage + 1 : requestedPage + 1;
        if (nextTarget <= 604) navigateToPage(nextTarget);
      } else if (deltaX < 0) {
        const prevTarget = isDesktop ? rightPage - 1 : requestedPage - 1;
        if (prevTarget >= 1) navigateToPage(prevTarget);
      }
      setTimeout(() => { isWheelLocked.current = false; }, 800);
    }
  };

  const getTransformStyles = (isBuffer: boolean) => {
    const isNext = pendingDirection === 'next';
    
    if (transitionState === 'idle') {
      return { transform: 'translateX(0%)', transition: 'none' };
    }

    if (transitionState === 'preparing') {
      if (isBuffer) {
        return { transform: isNext ? 'translateX(-100%)' : 'translateX(100%)', transition: 'none' };
      }
      return { transform: 'translateX(0%)', transition: 'none' };
    }
    
    if (transitionState === 'sliding') {
      if (isBuffer) {
        return { transform: 'translateX(0%)', transition: 'transform 0.15s ease-out' };
      }
      return { transform: isNext ? 'translateX(100%)' : 'translateX(-100%)', transition: 'transform 0.15s ease-out' };
    }

    return {};
  };

  const spreadsToRender: { type: 'active' | 'buffer'; spread: SpreadData }[] = [
    { type: 'active', spread: activeSpread },
  ];
  if (bufferSpread && (transitionState === 'preparing' || transitionState === 'sliding')) {
    spreadsToRender.push({ type: 'buffer', spread: bufferSpread });
  }


  const preloadPages = [rightPage, leftPage];
  const nextPageHref = requestedPage < 604;
  const previousPageHref = requestedPage > 1;

  return (
    <main
      className="flex-1 w-full bg-background text-foreground overflow-hidden flex flex-col items-center justify-center p-0 lg:p-4"
      style={{ perspective: "2500px" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEndSwipe}
      onWheel={handleWheel}
    >
      <style jsx global>{`
        body {
          overflow: hidden !important;
          height: 100dvh !important;
          touch-action: none;
        }
      `}</style>
      <SpecialFontLoader />

      <div className="w-full max-w-[280dvh] flex-1 flex items-center lg:items-stretch justify-center relative overflow-hidden">

        <div
          className={`absolute inset-0 z-[101] pointer-events-none rounded-sm border-8 border-red-500/20 bg-red-500/5 mix-blend-multiply transition-opacity duration-200 ${boundaryFlash ? "opacity-100" : "opacity-0"}`}
        />

        {spreadsToRender.map(({ type, spread }) => {
          const pages = [
            { pageNumber: spread.rightPage, lines: spread.rightLines },
            { pageNumber: spread.leftPage, lines: spread.leftLines },
          ];
          const styles = getTransformStyles(type === 'buffer');

          return (
            <div 
              key={`spread-wrapper-${type}`}
              className="absolute inset-0 w-full h-full will-change-transform bg-background"
              style={styles}
            >
              <section
                dir="rtl"
                className="flex flex-col lg:flex-row gap-0 w-full h-[100dvh] max-h-[100dvh] lg:h-full lg:max-h-full origin-center relative items-center lg:items-stretch justify-center"
              >
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[1px] -translate-x-1/2 bg-divider/50 shadow-[0_0_20px_10px_rgba(var(--primary-rgb),0.08)] lg:block z-20" />

                  {pages.map((page, index) => (
                    <article
                      key={`page-slot-${index}`}
                      style={{ backfaceVisibility: "hidden", transformStyle: "preserve-3d" }}
                      className={`relative mx-0 w-full max-w-137.5 lg:rounded-sm bg-surface shadow-[0_0_40px_rgba(var(--primary-rgb),0.16)] lg:border lg:border-primary/10 flex-col pt-3 pb-1 h-full
                        ${page.pageNumber === spread.requestedPage ? "flex flex-1" : "hidden lg:flex flex-1"}
                      `}
                    >
                      <div
                        className="h-10 w-full flex items-center justify-between px-2 lg:px-8 text-xs font-medium text-muted sticky top-0 bg-white/80 backdrop-blur-md z-30 transition-all border-b border-divider/5"
                        style={{ paddingTop: "var(--safe-area-inset-top, 0px)", height: "calc(2.5rem + var(--safe-area-inset-top, 0px))" }}
                      >
                        <div
                          className="flex-1 text-right text-lg leading-none text-primary/80 select-none pr-2"
                          style={{
                            fontFamily: 'QuranCommon',
                            fontVariantLigatures: 'common-ligatures',
                            fontFeatureSettings: '"liga" on',
                            textRendering: 'optimizeLegibility',
                          }}
                          dir="ltr"
                        >
                          {`j${getJuzForPage(page.lines).toString().padStart(3, "0")}`}
                        </div>

                        <div
                          className="flex-1 flex justify-end items-center gap-2 text-xl leading-none text-primary/80 select-none pb-1"
                          dir="rtl"
                        >
                          <div style={{ fontFamily: 'surah-name-v3', textRendering: 'optimizeLegibility' }}>
                            سُورَةُ {getSurahNameArabic(getSurahForPage(page.lines))}
                          </div>
                          <DownloadPageButton pageNo={page.pageNumber} surah={getSurahForPage(page.lines)} />
                          <button
                            className="lg:hidden p-1 text-muted hover:text-primary transition-colors cursor-pointer"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-side-menu'))}
                            aria-label="Open side menu"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="3" y1="12" x2="21" y2="12" />
                              <line x1="3" y1="6" x2="21" y2="6" />
                              <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="mx-2 lg:mx-8 mb-3 border-t border-divider" />

                      <div className="relative z-10 flex-1 w-full pt-2 px-5 lg:px-8 pb-2 select-none">
                        <FifteenLineGrid
                          key={`grid-${page.pageNumber}`}
                          pageNumber={page.pageNumber}
                          lines={page.lines}
                          onOpenTafseer={handleOpenTafseer}
                        />
                      </div>

                      <div className="mt-auto py-1 flex items-center justify-center text-xl font-medium text-primary opacity-70">
                        {toArabicDigits(page.pageNumber)}
                      </div>
                    </article>
                  ))}
              </section>
            </div>
          );
        })}
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:flex pointer-events-none fixed inset-x-0 top-1/2 -translate-y-1/2 z-50 items-center justify-between w-full max-w-[1400px] mx-auto px-6 lg:px-12">
        {leftPage < 604 ? (
          <button
            onClick={() => navigateToPage(leftPage + 1)}
            className={`pointer-events-auto rounded-2xl border px-4 py-12 text-4xl font-semibold shadow-2xl transition-all active:scale-95 flex items-center justify-center min-w-[64px]
              ${isFetching && pendingDirection === 'next'
                ? "bg-primary text-white border-primary scale-105 animate-pulse"
                : "border-divider bg-surface/90 text-muted-dark hover:bg-primary hover:text-white hover:border-primary hover:scale-105"
              }`}
            aria-label="Next spread"
          >
            ‹
          </button>
        ) : <div />}
        {rightPage > 1 ? (
          <button
            onClick={() => navigateToPage(rightPage - 1)}
            className={`pointer-events-auto rounded-2xl border px-4 py-12 text-4xl font-semibold shadow-2xl transition-all active:scale-95 flex items-center justify-center min-w-[64px]
              ${isFetching && pendingDirection === 'prev'
                ? "bg-primary text-white border-primary scale-105 animate-pulse"
                : "border-divider bg-surface/90 text-muted-dark hover:bg-primary hover:text-white hover:border-primary hover:scale-105"
              }`}
            aria-label="Previous spread"
          >
            ›
          </button>
        ) : <div />}
      </div>



      <AyahTafseerDrawer
        isOpen={isTafseerVisible}
        onClose={() => {
          setTafseerData(null);
          setIsTafseerVisible(false);
        }}
        surahId={tafseerData?.surah || 0}
        surahName={tafseerData?.surahName || ""}
        ayahNumber={tafseerData?.ayah || 0}
        language={language}
        tafsirId={tafsirId}
      />
    </main>
  );
}

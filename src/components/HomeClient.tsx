"use client";

import { useState } from "react";
import { useAudioContext } from "@/context/AudioContext";
import Link from "next/link";
import { ChapterTiny, Juz } from "@/types/quran";
import SearchIcon from "@/components/icons/SearchIcon";
import FilterMenu from "@/components/FilterMenu";
import Footer from "@/components/Footer";
import JuzGrid from "@/components/JuzGrid";

interface HomeClientProps {
  chapters: ChapterTiny[];
  alKahf: ChapterTiny | undefined;
  juzs: Juz[];
}

// Fixed page mappings for Juz navigation
const JUZ_START_PAGES = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];

export default function HomeClient({ chapters, alKahf, juzs }: HomeClientProps) {
  const { lastRead } = useAudioContext();
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"surah" | "juz">("surah");
  const [searchQuery, setSearchQuery] = useState("");

  const isNumericSearch = /^\d+$/.test(searchQuery.trim());
  const searchNumber = isNumericSearch ? parseInt(searchQuery.trim(), 10) : 0;

  const textMatches = !isNumericSearch && searchQuery.trim().length >= 2
    ? chapters.filter(c => 
        c.name_simple.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const showDropdown = isNumericSearch || textMatches.length > 0;

  const filteredChapters = searchQuery 
    ? chapters.filter(c => c.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toString().includes(searchQuery))
    : chapters;
  const displayedChapters = searchQuery ? filteredChapters : (showAll ? chapters : chapters.slice(0, 9));

  return (
    <main 
      className="min-h-screen bg-surface flex flex-col relative"
      style={{
        backgroundImage: "url('/resources/background.png')",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Blurred overlay */}
      <div 
        className="fixed inset-0 pointer-events-none" 
        style={{
          backgroundImage: "url('/resources/background.png')",
          filter: "blur(2px)",
          opacity: 0.08,
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>
      
      <div className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
          <div className="space-y-6 text-center">
            {/* Title */}
            <div className="space-y-4">
              <h1 className="font-serif text-5xl sm:text-6xl font-bold text-primary leading-tight">
                The Sacred Quran Library
              </h1>
              <p className="text-lg text-muted mx-auto">
                Explore the beauty of the Quran with translations and detailed explanations
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto w-full z-50">
              <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-surface border-2 border-primary/20 shadow-sm hover:border-primary/40 focus-within:border-primary/50 transition">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search by chapter name or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-foreground/80 placeholder-muted"
                />
              </div>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-surface rounded-2xl shadow-xl border border-primary/10 overflow-hidden text-left flex flex-col p-2 gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  {isNumericSearch ? (
                    <>
                      <div className="px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">
                        Quick Jump to {searchNumber}
                      </div>
                      
                      {searchNumber >= 1 && searchNumber <= 114 && (() => {
                        const surah = chapters.find(c => c.id === searchNumber);
                        if (!surah) return null;
                        return (
                          <Link
                            href={`/read?p=${surah.pages[0]}`}
                            className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-primary/5 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                              S
                            </div>
                            <div>
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">Surah {surah.name_simple}</div>
                              <div className="text-xs text-muted">Go to Surah {searchNumber}</div>
                            </div>
                          </Link>
                        );
                      })()}

                      {searchNumber >= 1 && searchNumber <= 30 && (
                        <Link
                          href={`/read?p=${JUZ_START_PAGES[searchNumber - 1]}`}
                          className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-primary/5 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                            J
                          </div>
                          <div>
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">Juz {searchNumber}</div>
                            <div className="text-xs text-muted">Go to Juz {searchNumber}</div>
                          </div>
                        </Link>
                      )}

                      {searchNumber >= 1 && searchNumber <= 604 && (
                        <Link
                          href={`/read?p=${searchNumber}`}
                          className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-primary/5 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                            P
                          </div>
                          <div>
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">Page {searchNumber}</div>
                            <div className="text-xs text-muted">Go to Page {searchNumber}</div>
                          </div>
                        </Link>
                      )}

                      {searchNumber > 604 && (
                        <div className="px-4 py-3 text-sm text-muted text-center">
                          No results found for number {searchNumber}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">
                        Suggested Surahs
                      </div>
                      {textMatches.map(surah => (
                        <Link
                          key={surah.id}
                          href={`/read?p=${surah.pages[0]}`}
                          className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-primary/5 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {surah.id}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">Surah {surah.name_simple}</div>
                            <div className="text-xs text-muted">Go to Surah {surah.id}</div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Filter Menu */}
        <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <FilterMenu activeTab={activeTab} onTabChange={setActiveTab} />
        </section>

        {/* Hero Banner - Dynamic for Continue Reading / Start Reading */}
        <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href={lastRead ? `/read?p=${lastRead.pageNumber}` : "/read?p=1"}>
            <div 
              className="relative overflow-hidden rounded-2xl p-6 md:p-12 shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-500 bg-cover bg-center cursor-pointer group"
              style={{
                backgroundImage: "url('/resources/banner.png')",
              }}
            >
              {/* Premium Gradient Overlay */}
              <div 
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: "linear-gradient(to right, rgba(var(--primary-rgb), 0.7), transparent)"
                }}
              ></div>
              {/* Dark overlay for depth */}
              <div className="absolute inset-0 bg-black/10 rounded-2xl group-hover:bg-black/5 transition-all"></div>
              
              <div className="relative space-y-4 max-w-2xl">
                {lastRead ? (
                  <>
                    <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white leading-tight">
                      Continue Reading
                    </h2>
                    <p className="text-sm sm:text-lg text-white/90 leading-relaxed font-medium">
                      You were reading <span className="text-secondary-foreground underline decoration-primary/30 underline-offset-4">Surah {lastRead.surahName}</span>
                    </p>
                    <button className="flex items-center gap-2 px-6 py-2 sm:px-8 sm:py-3 bg-white text-primary font-bold rounded-full group-hover:bg-primary group-hover:text-white transition-all shadow-xl text-sm sm:text-base">
                      Continue
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white leading-tight">
                      Begin Your Journey
                    </h2>
                    <p className="text-sm sm:text-lg text-white/90 leading-relaxed font-medium">
                      Start your Quran journey right now
                    </p>
                    <button className="flex items-center gap-2 px-6 py-2 sm:px-8 sm:py-3 bg-white text-primary font-bold rounded-full group-hover:bg-primary group-hover:text-white transition-all shadow-xl text-sm sm:text-base">
                      Start Reading
                    </button>
                  </>
                )}
              </div>
            </div>
          </Link>
        </section>

        {/* Surah Grid */}
        {activeTab === "surah" && (
        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedChapters.map((chapter) => (
              <Link 
                href={`/read?p=${chapter.pages[0]}`} 
                key={chapter.id}
                className="group"
              >
                <div className="flex items-center gap-6 p-6 rounded-xl bg-surface border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300">
                  {/* Chapter Number Circle */}
                  <div className="shrink-0 w-16 h-16 rounded-full bg-background flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                    <span className="text-2xl font-serif font-bold text-primary">
                      {chapter.id}
                    </span>
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground leading-tight">
                      {chapter.name_simple}
                    </h3>
                    <p className="text-sm text-muted font-medium uppercase tracking-wide">
                      {chapter.translated_name}
                    </p>
                  </div>

                  {/* Right Side - Arabic Name and Ayahs */}
                  <div className="shrink-0 text-right flex flex-col justify-center items-end">
                    <div 
                      className="text-3xl leading-none text-primary" 
                      style={{ fontFamily: 'surah-name-v2' }}
                      dir="ltr"
                    >
                      {`surah${chapter.id.toString().padStart(3, "0")}`}
                    </div>
                    <div className="text-sm text-muted font-medium uppercase tracking-wide mt-1">
                      {chapter.verses_count} AYAHS
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* View All Button */}
          {!showAll && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => setShowAll(true)}
                className="px-8 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-colors duration-300 shadow-md hover:shadow-lg"
              >
                View All Surahs
              </button>
            </div>
          )}
        </section>
        )}

        {/* Juz Grid */}
        {activeTab === "juz" && (
          <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <JuzGrid juzs={juzs} juzStartPages={JUZ_START_PAGES} />
          </section>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}

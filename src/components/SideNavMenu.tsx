"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ChapterTiny, Juz } from "@/types/quran";
import SearchIcon from "@/components/icons/SearchIcon";
import { useAuth } from "@/context/AuthContext";

interface SideNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: ChapterTiny[];
  juzs: Juz[];
}

type NavTab = "surah" | "juz";

const JUZ_START_PAGES = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];

export default function SideNavMenu({
  isOpen,
  onClose,
  chapters,
  juzs,
}: SideNavMenuProps) {
  const { user, signOutUser } = useAuth();

  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentPage = Number(params?.pageNumber) || 1;
  const [activeTab, setActiveTab] = useState<NavTab>("surah");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Navigate to a Mushaf page without causing a full re-mount
  const navigateToMushafPage = useCallback((page: number) => {
    const isMushafActive = pathname === "/read" || pathname === "/read/";
    if (isMushafActive) {
      // Viewer is already mounted — dispatch event for zero-remount navigation
      window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: { page } }));
    } else {
      // First visit from home/settings — use Next's client-side router
      // instead of a hard window.location reload. A hard reload to a
      // directory-style export path plus a query string (/read/?p=X) does
      // not reliably resolve inside Capacitor's local WebView asset server;
      // router.push (the same mechanism the working Home page Link uses)
      // swaps the rendered route without requesting a new HTML document.
      router.push(`/read?p=${page}`);
    }
    onClose();
  }, [pathname, onClose, router]);

  const isNumericSearch = /^\d+$/.test(searchQuery.trim());
  const searchNumber = isNumericSearch ? parseInt(searchQuery.trim(), 10) : 0;

  const textMatches = !isNumericSearch && searchQuery.trim().length >= 2
    ? chapters.filter(c => 
        c.name_simple.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const showJumpList = isNumericSearch || textMatches.length > 0;

  const filteredChapters = chapters.filter((surah) =>
    surah.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.id.toString().includes(searchQuery)
  );

  const filteredJuzs = juzs.filter((juz) =>
    juz.juz.toString().includes(searchQuery) ||
    juz.name_arabic.includes(searchQuery)
  );

  const tabs: { id: NavTab; label: string }[] = [
    { id: "surah", label: "Surah" },
    { id: "juz", label: "Juz" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[100] bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-[110] w-full max-w-[340px] bg-white shadow-2xl flex flex-col will-change-transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header Area */}
            <div 
              className="flex flex-col gap-6 px-6 border-b border-gray-100 bg-surface/30"
              style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 2rem)", paddingBottom: "2rem" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">Index</h2>
                  
                  {/* Mobile-only settings and profile icons */}
                  <div className="flex items-center gap-2 md:hidden">
                    <Link
                      href="/"
                      onClick={onClose}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900 mt-1"
                      aria-label="Home"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </Link>
                    
                    <Link
                      href="/settings"
                      onClick={onClose}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900 mt-1"
                      aria-label="Settings"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </Link>

                    {user && (
                      <div className="relative">
                        <button
                          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                          className={`w-7 h-7 rounded-full border transition-all overflow-hidden mt-0.5 ${
                            isUserMenuOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-500/20'
                          }`}
                        >
                          <img
                            src={user.photoUrl || ''}
                            alt="User"
                            className="w-full h-full object-cover"
                          />
                        </button>

                        <>
                          {isUserMenuOpen && (
                            <>
                              {/* Overlay to catch clicks outside */}
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsUserMenuOpen(false)}
                              />
                              <div
                                className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden"
                              >
                                <button
                                  onClick={() => signOutUser()}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                  </svg>
                                  Sign Out
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                  aria-label="Close menu"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tools Section (Future) */}


              {/* Search Bar */}
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Navigation Tabs */}
              <div className="flex p-1 bg-gray-100 rounded-xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery("");
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === tab.id
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto book-scrollbar py-6 px-3">
              {showJumpList ? (
                <div className="space-y-2">
                  <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    {isNumericSearch ? `Jump to ${searchNumber}` : 'Suggested Surahs'}
                  </h3>
                  
                  {isNumericSearch ? (
                    <>
                      {searchNumber >= 1 && searchNumber <= 114 && (() => {
                        const surah = chapters.find(c => c.id === searchNumber);
                        if (!surah) return null;
                        return (
                          <button
                            onClick={() => navigateToMushafPage(surah.pages[0])}
                            className="group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-emerald-500/5 w-full text-left"
                          >
                            <div className="relative flex items-center justify-center w-11 h-11 shrink-0 bg-emerald-50 rounded-xl">
                              <span className="text-emerald-700 font-bold text-sm">S</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900">Surah {surah.name_simple}</div>
                              <div className="text-xs text-gray-500">Go to Surah {searchNumber}</div>
                            </div>
                          </button>
                        )
                      })()}

                      {searchNumber >= 1 && searchNumber <= 30 && (
                        <button
                          onClick={() => navigateToMushafPage(JUZ_START_PAGES[searchNumber - 1])}
                          className="group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-emerald-500/5 w-full text-left"
                        >
                            <div className="relative flex items-center justify-center w-11 h-11 shrink-0 bg-emerald-50 rounded-xl">
                              <span className="text-emerald-700 font-bold text-sm">J</span>
                            </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">Juz {searchNumber}</div>
                            <div className="text-xs text-gray-500">Go to Juz {searchNumber}</div>
                          </div>
                        </button>
                      )}

                      {searchNumber >= 1 && searchNumber <= 604 && (
                        <button
                          onClick={() => navigateToMushafPage(searchNumber)}
                          className="group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-emerald-500/5 w-full text-left"
                        >
                            <div className="relative flex items-center justify-center w-11 h-11 shrink-0 bg-emerald-50 rounded-xl">
                              <span className="text-emerald-700 font-bold text-sm">P</span>
                            </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">Page {searchNumber}</div>
                            <div className="text-xs text-gray-500">Go to Page {searchNumber}</div>
                          </div>
                        </button>
                      )}

                      {searchNumber > 604 && (
                        <div className="text-center py-8 text-sm text-gray-500">
                          No results found for {searchNumber}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {textMatches.map(surah => (
                        <button
                          key={surah.id}
                          onClick={() => navigateToMushafPage(surah.pages[0])}
                          className="group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-emerald-500/5 w-full text-left"
                        >
                          <div className="relative flex items-center justify-center w-11 h-11 shrink-0 bg-emerald-50 rounded-xl">
                            <span className="text-emerald-700 font-bold text-sm">{surah.id}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">Surah {surah.name_simple}</div>
                            <div className="text-xs text-gray-500">Go to Surah {surah.id}</div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ) : activeTab === "surah" ? (
                <div className="space-y-1">
                  {filteredChapters.map((surah) => {
                    const isActive = currentPage >= surah.pages[0] && currentPage <= surah.pages[1];
                    
                    return (
                      <button
                        key={surah.id}
                        onClick={() => navigateToMushafPage(surah.pages[0])}
                        className={`group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 w-full text-left ${
                          isActive 
                            ? "bg-emerald-500/10" 
                            : "hover:bg-emerald-500/5"
                        }`}
                      >
                        {/* Index Icon (The Rotated Square) */}
                        <div className="relative flex items-center justify-center w-11 h-11 shrink-0">
                          <div className={`w-9 h-9 border-2 rotate-45 transition-all duration-500 rounded-sm ${
                            isActive 
                              ? "border-emerald-500 bg-emerald-500/10 rotate-[135deg]" 
                               : "border-emerald-500/20 bg-transparent group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5 group-hover:rotate-[135deg]"
                          }`} />
                          <span className={`absolute font-mono text-[11px] font-bold tracking-tight ${
                            isActive ? "text-emerald-700" : "text-gray-500"
                          }`}>
                            {surah.id.toString().padStart(3, "0")}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="flex flex-col min-w-0 gap-0.5">
                            <span className={`text-sm font-semibold truncate ${
                              isActive ? "text-emerald-950" : "text-gray-900"
                            }`}>
                              {surah.name_simple}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-[0.15em] font-medium">
                              {surah.translated_name}
                            </span>
                          </div>
                          
                          <span className={`text-3xl leading-none text-right ${
                            isActive ? "text-emerald-800" : "text-primary"
                          }`}
                          style={{ fontFamily: 'surah-name-v2' }}
                          dir="ltr"
                          >
                            {`surah${surah.id.toString().padStart(3, "0")}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : activeTab === "juz" ? (
                <div className="space-y-1">
                  {filteredJuzs.map((juz) => {
                    const startPage = JUZ_START_PAGES[juz.juz - 1];
                    const nextJuzStartPage = JUZ_START_PAGES[juz.juz] || 605;
                    const isActive = currentPage >= startPage && currentPage < nextJuzStartPage;
                    
                    return (
                      <button
                        key={juz.juz}
                        onClick={() => navigateToMushafPage(startPage)}
                        className={`group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 w-full text-left ${
                          isActive 
                            ? "bg-emerald-500/10" 
                            : "hover:bg-emerald-500/5"
                        }`}
                      >
                        {/* Index Icon (The Rotated Square) */}
                        <div className="relative flex items-center justify-center w-11 h-11 shrink-0">
                          <div className={`w-9 h-9 border-2 rotate-45 transition-all duration-500 rounded-sm ${
                            isActive 
                              ? "border-emerald-500 bg-emerald-500/10 rotate-[135deg]" 
                              : "border-emerald-500/20 bg-transparent group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5 group-hover:rotate-[135deg]"
                          }`} />
                          <span className={`absolute font-mono text-[11px] font-bold tracking-tight ${
                            isActive ? "text-emerald-700" : "text-gray-500"
                          }`}>
                            {juz.juz.toString().padStart(3, "0")}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="flex flex-col min-w-0 gap-0.5">
                            <span className={`text-sm font-semibold truncate ${
                              isActive ? "text-emerald-950" : "text-gray-900"
                            }`}>
                              Juz {juz.juz}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-[0.15em] font-medium">
                              Page {startPage}
                            </span>
                          </div>
                          
                          <span 
                            className={`text-xl leading-none text-right ${
                              isActive ? "text-emerald-800" : "text-primary"
                            }`}
                            style={{ 
                              fontFamily: 'QuranCommon',
                              fontVariantLigatures: 'common-ligatures',
                              fontFeatureSettings: '"liga" on',
                              textRendering: 'optimizeLegibility'
                            }}
                            dir="ltr"
                          >
                            {`j${juz.juz.toString().padStart(3, "0")}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">
                    The {activeTab} view is coming soon.
                  </p>
                </div>
              )}
            </div>
      </div>
    </>
  );
}

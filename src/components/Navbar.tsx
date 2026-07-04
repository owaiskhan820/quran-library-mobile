"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChapterTiny, Juz } from "@/types/quran";
import SideNavMenu from "./SideNavMenu";
import { useAuth } from "@/context/AuthContext";

interface NavbarProps {
  chapters: ChapterTiny[];
  juzs: Juz[];
}

export default function Navbar({ chapters, juzs }: NavbarProps) {
  const { user, signInWithGoogle, signOutUser } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === "/" || pathname === "";

  useEffect(() => {
    const handleOpenMenu = () => setIsMenuOpen(true);
    window.addEventListener("open-side-menu", handleOpenMenu);
    return () => window.removeEventListener("open-side-menu", handleOpenMenu);
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      <header 
        className={`${isHomePage ? 'block' : 'hidden'} sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-100`}
        style={{ paddingTop: "var(--safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 hover:bg-emerald-500/5 rounded-full transition-colors group"
              aria-label="Open menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-600 group-hover:text-emerald-600 transition-colors"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary font-sans"
            >
              <img 
                src="/icons/logo.png" 
                alt="Quran Library Logo" 
                width="32" 
                height="32" 
                className="rounded-lg shadow-sm"
              />
              Quran Library
            </Link>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {/*
            <Link
              href="/breakdown"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200/50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Breakdown</span>
            </Link>
            */}

            <Link
              href="/settings"
              className="hidden md:block p-2 hover:bg-emerald-500/5 rounded-full transition-colors text-gray-600 hover:text-emerald-600"
              aria-label="Settings"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </Link>

            {user ? (
              <div className="hidden md:flex items-center gap-3 pl-2 border-l border-gray-100">
                <img
                  src={user.photoUrl || ''}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border-2 border-primary/20"
                />
                <button
                  onClick={() => signOutUser()}
                  className="hidden sm:block text-xs font-bold text-muted hover:text-red-500 transition-colors uppercase tracking-wider"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="bg-primary text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <SideNavMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        chapters={chapters}
        juzs={juzs}
      />

      {isSigningIn && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
          <div className="bg-white/95 border border-gray-100 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 max-w-[280px]">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest text-center">Google Sign-in...</p>
          </div>
        </div>
      )}
    </>
  );
}

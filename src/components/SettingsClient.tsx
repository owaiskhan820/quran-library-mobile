"use client";

import { useAudioContext } from "@/context/AudioContext";
import Link from "next/link";
import { useState } from "react";
import SearchIcon from "@/components/icons/SearchIcon";

type Category = "display" | "reciter" | "translation" | "profile" | "account" | "appearance";

export default function SettingsClient() {
  const { 
    reciterId, 
    setReciter, 
    reciters, 
    translationId, 
    setTranslationId, 
    translations,
    language,
    setLanguage,
    lastRead
  } = useAudioContext();

  const [activeCategory, setActiveCategory] = useState<Category>("display");
  const [reciterSearch, setReciterSearch] = useState("");
  const [translationSearch, setTranslationSearch] = useState("");

  const filteredReciters = reciters.filter(r => 
    r.name.toLowerCase().includes(reciterSearch.toLowerCase()) ||
    r.style?.toLowerCase().includes(reciterSearch.toLowerCase())
  );

  const filteredTranslations = translations.filter(t =>
    t.name.toLowerCase().includes(translationSearch.toLowerCase()) ||
    t.author.toLowerCase().includes(translationSearch.toLowerCase())
  );

  const categories = [
    { id: "display", label: "Display Language", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    )},
    { id: "reciter", label: "Reciter (Qari)", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    )},
    { id: "translation", label: "Verse Translation", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    )},
    { type: "divider", label: "ACCOUNT" },
    { id: "profile", label: "Public profile", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )},
    { id: "account", label: "Account", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )},
    { id: "appearance", label: "Appearance", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.32 2.1-.6a.5.5 0 0 0-.1-.9 1 1 0 0 1-.9-1.3l.2-.5a2 2 0 0 0-2-2.7h-.5a2 2 0 0 1-2-2v-1.5a3 3 0 0 1 3-3h1.5a4 4 0 0 1 4 4v1.5a2 2 0 0 0 2 2 2 2 0 0 0 2-2C22 6.5 17.5 2 12 2z" />
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen bg-white md:bg-[#f8fafb] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              href="/"
              className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-700"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-[#1a4d4a] font-serif tracking-tight">Quran Assistant</h1>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button className="p-2 hover:text-emerald-700 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button className="p-2 hover:text-emerald-700 transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:w-72 bg-white md:bg-transparent border-r border-gray-100 p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Settings</h2>
            <p className="text-xs text-gray-400 font-medium">Manage your preferences</p>
          </div>

          <nav className="flex flex-col gap-1">
            {categories.map((cat, idx) => {
              if (cat.type === "divider") {
                return (
                  <div key={`divider-${idx}`} className="mt-6 mb-2 px-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {cat.label}
                  </div>
                );
              }

              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as Category)}
                  className={`relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left group ${
                    isActive 
                      ? "bg-white text-emerald-700 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-800 rounded-full" />
                  )}
                  <div className={`shrink-0 transition-colors ${isActive ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"}`}>
                    {cat.icon}
                  </div>
                  <span className="font-semibold text-[13px]">{cat.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white md:bg-transparent overflow-y-auto p-6 lg:p-12">
          <div className="max-w-4xl mx-auto space-y-16">
            
            {activeCategory === "display" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-[#1a4d4a] mb-2">Display Language</h3>
                  <p className="text-sm text-slate-500">Choose your preferred interface language for a serene experience.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { id: 'en', name: 'English', desc: 'Default international interface', icon: 'A' },
                    { id: 'ur', name: 'Urdu', desc: 'اردو انٹرفیس منتخب کریں', icon: 'ع' }
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setLanguage(lang.id as 'en' | 'ur')}
                      className={`relative p-8 rounded-2xl border-2 transition-all text-left flex items-start gap-5 ${
                        language === lang.id
                          ? "border-[#1a4d4a] bg-white shadow-xl ring-1 ring-emerald-900/5"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl font-bold ${
                        language === lang.id ? "bg-[#1a4d4a] text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                        {lang.icon}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className={`text-xl font-bold ${language === lang.id ? "text-slate-900" : "text-slate-800"}`}>
                          {lang.name}
                        </span>
                        <span className="text-sm text-slate-400">{lang.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === "reciter" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-serif font-bold text-[#1a4d4a] mb-2">Reciter (Qari)</h3>
                    <p className="text-sm text-slate-500">Select your favorite reciter to listen to the Divine word.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {reciters.slice(0, 3).map((reciter) => (
                    <button
                      key={reciter.id}
                      onClick={() => setReciter(reciter.id)}
                      className={`flex items-center gap-6 p-4 rounded-2xl border transition-all text-left group ${
                        reciterId === reciter.id
                          ? "bg-white border-emerald-100 shadow-md"
                          : "bg-white border-transparent hover:border-gray-100"
                      }`}
                    >
                      <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 grayscale group-hover:grayscale-0 transition-all border-2 border-white shadow-sm">
                        <img 
                          src={`https://api.quran.com/api/v4/verses/by_key/1:1?audio=${reciter.id}`} 
                          className="w-full h-full object-cover bg-slate-200"
                          alt={reciter.name}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${reciter.name}&background=f1f5f9&color=475569`;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-md font-bold text-slate-900">{reciter.name}</h4>
                        <div className="flex gap-2 mt-1.5">
                          {reciter.style && (
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-full">
                              {reciter.style}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                            MUJAWWAD
                          </span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        reciterId === reciter.id ? "bg-[#1a4d4a] border-[#1a4d4a]" : "border-slate-200"
                      }`}>
                        {reciterId === reciter.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}
                  
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {reciters.slice(3, 5).map(reciter => (
                      <button
                        key={reciter.id}
                        onClick={() => setReciter(reciter.id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left bg-white ${
                          reciterId === reciter.id ? "border-emerald-100 shadow-sm" : "border-transparent hover:border-gray-50"
                        }`}
                      >
                        <span className="text-sm font-bold text-slate-800">{reciter.name}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          reciterId === reciter.id ? "bg-[#1a4d4a] border-[#1a4d4a]" : "border-slate-200"
                        }`}>
                           {reciterId === reciter.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeCategory === "translation" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-[#1a4d4a] mb-2">Verse Translation</h3>
                  <p className="text-sm text-slate-500">Enable multiple translations to deepen your understanding of the Quran.</p>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
                  {translations.slice(0, 5).map((t) => (
                    <div 
                      key={t.id}
                      className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => setTranslationId(t.id)}
                    >
                      <div>
                        <h4 className="text-md font-bold text-slate-900">{t.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{t.author}</p>
                      </div>
                      <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                        translationId === t.id ? "bg-[#1a4d4a]" : "bg-slate-200"
                      }`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                          translationId === t.id ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {["profile", "account", "appearance"].includes(activeCategory) && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 uppercase tracking-widest">Coming Soon</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-xs">
                    We are building advanced account management and theme customization features. Stay tuned!
                  </p>
                </div>
              </div>
            )}

            <div className="pt-8 flex justify-center">
              <Link 
                href={lastRead ? `/read?p=${lastRead.pageNumber}` : "/read?p=1"}
                className="flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-emerald-500/25"
              >
                Finish & Return to Mushaf
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </Link>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

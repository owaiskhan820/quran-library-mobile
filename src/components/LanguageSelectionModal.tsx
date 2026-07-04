"use client";

import { useState, useEffect } from "react";
import { useAudioContext } from "@/context/AudioContext";
import { Globe } from "lucide-react";

export default function LanguageSelectionModal() {
  const { setLanguage } = useAudioContext();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Only show if no language is set in local storage
    const hasLanguage = localStorage.getItem('language') || localStorage.getItem('app_language');
    if (!hasLanguage) {
      setTimeout(() => setShowModal(true), 0);
    }
  }, []);

  if (!showModal) return null;

  const handleSelect = (lang: 'en' | 'ur') => {
    setLanguage(lang);
    setShowModal(false);
    window.dispatchEvent(new Event('languageSelected'));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-primary/10 text-primary rounded-full mb-2">
            <Globe size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Select Language</h2>
          <p className="text-sm text-gray-500">Choose your preferred translation language</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => handleSelect('en')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <span className="text-2xl font-bold">A</span>
            <span className="font-bold text-gray-700 group-hover:text-primary">English</span>
          </button>
          <button 
            onClick={() => handleSelect('ur')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <span className="text-2xl font-arabic font-bold">ع</span>
            <span className="font-bold text-gray-700 group-hover:text-primary">Urdu</span>
          </button>
        </div>
      </div>
    </div>
  );
}

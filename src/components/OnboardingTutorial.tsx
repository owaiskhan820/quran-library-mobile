"use client";

import { useState, useEffect } from "react";
import { useAudioContext } from "@/context/AudioContext";
import { MousePointerClick, Settings2, Info } from "lucide-react";

export default function OnboardingTutorial() {
  const { language } = useAudioContext();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkAndShow = () => {
      // Only show if they HAVE selected a language
      const hasLanguage = localStorage.getItem('language') || localStorage.getItem('app_language');
      // But HAVEN'T seen the onboarding
      const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');

      if (hasLanguage && !hasSeenOnboarding) {
        setTimeout(() => setShowModal(true), 0);
      }
    };

    window.addEventListener('languageSelected', checkAndShow);
    checkAndShow();

    return () => window.removeEventListener('languageSelected', checkAndShow);
  }, []); // Run on mount and when custom event fires

  if (!showModal || !language) return null;

  const handleDismiss = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setShowModal(false);
  };

  const isUrdu = language === 'ur';

  const content = {
    en: {
      title: "Welcome to Quran Library",
      wordsText: "Hover (Desktop) or Tap (Mobile) on any Arabic word to see its meaning and hear its pronunciation.",
      ayahText: "Tap on any Ayah end sign (۝) to view options to play the recitation or read the complete Tafseer/Translation.",
      button: "Bismillah, Let's Begin",
    },
    ur: {
      title: "قرآن کریم میں خوش آمدید",
      wordsText: "کسی بھی عربی لفظ پر کلک کریں (یا ماؤس لائیں) تاکہ اس کا ترجمہ دیکھیں اور تلفظ سنیں۔",
      ayahText: "آڈیو تلاوت سننے یا مکمل تفسیر/ترجمہ پڑھنے کے لیے کسی بھی آیت کے اختتامی نشان (۝) پر کلک کریں۔",
      button: "بسم اللہ،  شروع کریں",
    }
  };

  const t = content[isUrdu ? 'ur' : 'en'];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-500"
        dir={isUrdu ? "rtl" : "ltr"}
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-primary/10 text-primary rounded-full mb-2">
            <Info size={28} />
          </div>
          <h2 className={`font-bold text-gray-900 ${isUrdu ? 'text-4xl font-urdu mt-1' : 'text-2xl tracking-tight'}`}>
            {t.title}
          </h2>
        </div>

        <div className="space-y-4 pt-2">
          {/* Step 1 */}
          <div className="flex items-start gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0 mt-0.5">
              <MousePointerClick size={20} />
            </div>
            <p className={`${isUrdu ? 'text-2xl font-urdu font-medium leading-[1.8]' : 'text-md'} text-gray-700 leading-relaxed`}>
              {t.wordsText}
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0 mt-0.5">
              <Settings2 size={20} />
            </div>
            <p className={`${isUrdu ? 'text-2xl font-urdu font-medium leading-[1.8]' : 'text-md'} text-gray-900 leading-relaxed`}>
              {t.ayahText}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className={`w-full py-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 ${isUrdu ? 'font-urdu text-3xl font-bold' : 'font-bold'}`}
        >
          {t.button}
        </button>
      </div>
    </div>
  );
}

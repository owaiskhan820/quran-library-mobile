"use client";

import { Play, BookOpen, Download } from "lucide-react";

interface AyahActionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onListen: () => void;
  onTafseer: () => void;
  onDownload?: () => void;
  language: "en" | "ur";
  position: "top" | "bottom";
  shift?: number;
}

export default function AyahActionPopup({
  isOpen,
  onClose,
  onListen,
  onTafseer,
  onDownload,
  language,
  position,
  shift = 0,
}: AyahActionPopupProps) {
  const isUrdu = language === "ur";
  const isTop = position === "top";

  const labels = {
    listen: isUrdu ? "سنیں" : "Listen",
    tafseer: isUrdu ? "تفسیر" : "Tafseer",
    download: isUrdu ? "آیت ڈاؤن لوڈ کریں" : "Download ayah",
  };

  return (
    <>
      {isOpen && (
        <>
          {/* Backdrop to catch clicks outside */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }} 
          />
          
          <div
            className={`absolute ${isTop ? "bottom-full mb-3" : "top-full mt-3"} left-1/2 z-[9999] pointer-events-auto`}
            style={{
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
              transformOrigin: isTop ? "bottom center" : "top center",
              transform: `translateX(calc(-50% + ${shift}px))`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`bg-white border border-divider rounded-xl overflow-hidden shadow-2xl flex items-center p-1.5 gap-1.5 min-w-max pointer-events-auto`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onListen();
                  onClose();
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/5 text-primary transition-colors whitespace-nowrap
                  ${isUrdu ? "flex-row-reverse font-arabic text-lg" : "text-sm font-semibold"}`}
              >
                <Play size={16} fill="currentColor" />
                <span>{labels.listen}</span>
              </button>
              
              <div className="w-[1px] h-6 bg-divider" />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onTafseer();
                  onClose();
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/5 text-primary transition-colors whitespace-nowrap
                  ${isUrdu ? "flex-row-reverse font-arabic text-lg" : "text-sm font-semibold"}`}
              >
                <BookOpen size={16} />
                <span>{labels.tafseer}</span>
              </button>

              {onDownload && (
                <>
                  <div className="w-[1px] h-6 bg-divider" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDownload();
                      onClose();
                    }}
                    aria-label={labels.download}
                    title={labels.download}
                    className="flex items-center justify-center p-2.5 rounded-lg hover:bg-primary/5 text-primary transition-colors"
                  >
                    <Download size={16} />
                  </button>
                </>
              )}

              {/* Arrow */}
              <div
                className={`absolute ${isTop ? "top-full" : "bottom-full"} left-1/2 w-0 h-0 
                          border-l-[6px] border-l-transparent 
                          border-r-[6px] border-r-transparent 
                          ${isTop
                    ? "border-t-[6px] border-t-white"
                    : "border-b-[6px] border-b-white"}`}
                style={{ 
                  transform: `translateX(calc(-50% - ${shift}px))`,
                  left: '50%'
                }}
              />
              {/* Arrow Border Shadow */}
              <div
                className={`absolute ${isTop ? "top-full" : "bottom-full"} left-1/2 w-0 h-0 -z-10
                          border-l-[7px] border-l-transparent 
                          border-r-[7px] border-r-transparent 
                          ${isTop
                    ? "border-t-[7px] border-t-divider"
                    : "border-b-[7px] border-b-divider"}`}
                style={{ 
                  transform: `translateX(calc(-50% - ${shift}px))`,
                  left: '50%',
                  marginTop: isTop ? '0px' : '-1px',
                  marginBottom: isTop ? '-1px' : '0px'
                }}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

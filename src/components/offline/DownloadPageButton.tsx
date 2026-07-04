"use client";

import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useAudioContext } from "@/context/AudioContext";
import { isPageAudioDownloaded, subscribeActiveDownloads } from "@/lib/offline/downloadManager";
import { openDownloadModal } from "@/components/offline/DownloadModalHost";

interface DownloadPageButtonProps {
  pageNo: number;
  surah?: number;
}

export default function DownloadPageButton({ pageNo, surah }: DownloadPageButtonProps) {
  const { reciters, reciterId } = useAudioContext();
  const [downloaded, setDownloaded] = useState(false);

  const reciter = reciters.find((r) => r.id === reciterId);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !reciter) return;
    const recheck = () => setDownloaded(isPageAudioDownloaded(reciter.slug, pageNo));
    recheck();
    // Re-check whenever any download finishes, so this flips to a checkmark
    // once a download started from the modal (or elsewhere) completes.
    return subscribeActiveDownloads(recheck);
  }, [pageNo, reciter]);

  if (!Capacitor.isNativePlatform() || !reciter) return null;

  if (downloaded) {
    return (
      <span className="p-1 text-emerald-600" aria-label="Page audio downloaded" title="Downloaded for offline use">
        <Check size={16} />
      </span>
    );
  }

  return (
    <button
      onClick={() => openDownloadModal({ tab: "page", pageNo, surah })}
      className="p-1 text-muted hover:text-primary transition-colors cursor-pointer"
      aria-label={`Download audio for page ${pageNo}`}
      title="Download audio for offline use"
    >
      <Download size={16} />
    </button>
  );
}

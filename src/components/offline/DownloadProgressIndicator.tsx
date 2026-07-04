"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { getActiveDownloads, subscribeActiveDownloads, type ActiveDownloadInfo } from "@/lib/offline/downloadManager";

export default function DownloadProgressIndicator() {
  const [downloads, setDownloads] = useState<ActiveDownloadInfo[]>([]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    setDownloads(getActiveDownloads());
    return subscribeActiveDownloads(() => setDownloads(getActiveDownloads()));
  }, []);

  if (downloads.length === 0) return null;

  const primary = downloads[0];
  const extraCount = downloads.length - 1;

  return (
    <div className="fixed top-3 right-3 z-[200] pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-gray-100 shadow-lg rounded-full pl-2.5 pr-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-primary">
        <Loader2 size={14} className="animate-spin" />
        <span>
          Downloading {primary.label} ({primary.progress.done}/{primary.progress.total})
          {extraCount > 0 ? ` +${extraCount} more` : ""}
        </span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import DownloadModal from "./DownloadModal";

interface OpenDownloadModalDetail {
  tab?: "ayahRange" | "page" | "pageRange" | "surah";
  surah?: number;
  ayah?: number;
  pageNo?: number;
}

// Global host so any component (Mushaf toolbar, ayah popup, surah list, etc.)
// can open the download modal via a CustomEvent instead of prop-drilling
// modal state through unrelated component trees — mirrors the existing
// 'open-side-menu' event pattern already used elsewhere in this app.
export default function DownloadModalHost() {
  const [detail, setDetail] = useState<OpenDownloadModalDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<OpenDownloadModalDetail>;
      setDetail(custom.detail ?? {});
    };
    window.addEventListener("open-download-modal", handler);
    return () => window.removeEventListener("open-download-modal", handler);
  }, []);

  return (
    <DownloadModal
      isOpen={detail !== null}
      onClose={() => setDetail(null)}
      initialTab={detail?.tab}
      initialSurah={detail?.surah}
      initialAyah={detail?.ayah}
      initialPageNo={detail?.pageNo}
    />
  );
}

export function openDownloadModal(detail: OpenDownloadModalDetail) {
  window.dispatchEvent(new CustomEvent("open-download-modal", { detail }));
}

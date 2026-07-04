"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import MushafSpreadViewer from "@/components/MushafSpreadViewer";

function ReadPageContent() {
  const searchParams = useSearchParams();
  const p = searchParams.get("p");
  const currentFromUrl = Number.parseInt(p ?? "1", 10);
  const safeCurrent = Number.isInteger(currentFromUrl) ? currentFromUrl : 1;
  const boundedCurrent = Math.min(604, Math.max(1, safeCurrent));

  return <MushafSpreadViewer initialPage={boundedCurrent} />;
}

export default function ReadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ReadPageContent />
    </Suspense>
  );
}

import { useState } from "react";
import Link from "next/link";

interface JuzData {
  id: number;
  juz: number;
  name_english?: string;
  name_arabic: string;
  verses_count: number;
  verse_mapping: {
    start_surah: number;
    start_verse: number;
    end_surah: number;
    end_verse: number;
  };
}

interface JuzGridProps {
  juzs: JuzData[];
  juzStartPages: number[];
}

export default function JuzGrid({ juzs, juzStartPages }: JuzGridProps) {
  const [showAll, setShowAll] = useState(false);

  // Filter duplicates - keep only unique Juz numbers (1-30)
  const uniqueJuzs = Array.from(
    new Map(juzs.map((juz) => [juz.juz, juz])).values()
  ).sort((a, b) => a.juz - b.juz);

  const displayedJuzs = showAll ? uniqueJuzs : uniqueJuzs.slice(0, 12);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayedJuzs.map((juz, index) => {
          const startPage = juzStartPages[index];

          return (
            <Link
              href={`/read?p=${startPage}`}
              key={juz.juz}
              className="group"
            >
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300 min-h-[100px]">
                {/* Center Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground leading-tight">
                    Juz {juz.juz}
                  </h3>
                </div>

                {/* Right Side - Arabic Name and Page */}
                <div className="shrink-0 text-right flex flex-col justify-center items-end">
                  <div
                    className="text-2xl leading-none text-primary"
                    style={{
                      fontFamily: 'QuranCommon',
                      fontVariantLigatures: 'common-ligatures',
                      fontFeatureSettings: '"liga" on',
                      textRendering: 'optimizeLegibility'
                    }}
                    dir="ltr"
                  >
                    {`j${juz.juz.toString().padStart(3, "0")}`}
                  </div>
                  <div className="text-sm text-muted font-medium uppercase tracking-wide mt-1">
                    Page {startPage}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* View All Button */}
      {!showAll && uniqueJuzs.length > 12 && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll(true)}
            className="px-8 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-colors duration-300 shadow-md hover:shadow-lg"
          >
            View All Juz
          </button>
        </div>
      )}
    </div>
  );
}

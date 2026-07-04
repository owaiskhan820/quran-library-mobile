"use client";
import { useEffect } from "react";

// These fonts are loaded once and never change
const SPECIAL_FONTS = [
  { family: "QuranCommon", url: "/fonts/common/QuranCommon.woff2" },
  { family: "surah-name-v2", url: "/fonts/common/surah-name-v2.woff2" },
  { family: "surah-name-v3", url: "/fonts/common/surah-name-v3.woff2" },
];

let specialFontsLoaded = false;

export default function SpecialFontLoader() {
  useEffect(() => {
    if (specialFontsLoaded) return;
    specialFontsLoaded = true;

    SPECIAL_FONTS.forEach(({ family, url }) => {
      if (document.fonts.check(`1em ${family}`)) return;
      const face = new FontFace(family, `url('${url}') format('woff2')`);
      face.load().then(loaded => {
        document.fonts.add(loaded);
      }).catch(() => {});
    });
  }, []);

  return null;
}

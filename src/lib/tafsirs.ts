export const TAFSIRS = [
  { id: 14,  slug: "ar-tafsir-ibn-kathir",             name: "Tafsir Ibn Kathir",              author: "Hafiz Ibn Kathir",                  language: "arabic"  },
  { id: 15,  slug: "ar-tafsir-al-tabari",              name: "Tafsir al-Tabari",               author: "Tabari",                            language: "arabic"  },
  { id: 16,  slug: "ar-tafsir-muyassar",               name: "Tafsir Muyassar",                author: "Al-Muyassar",                       language: "arabic"  },
  { id: 90,  slug: "ar-tafseer-al-qurtubi",            name: "Al-Qurtubi",                     author: "Qurtubi",                           language: "arabic"  },
  { id: 91,  slug: "ar-tafseer-al-saddi",              name: "Tafsir Al-Sa'di",                author: "Al-Sa'di",                          language: "arabic"  },
  { id: 93,  slug: "ar-tafsir-al-wasit",               name: "Al-Tafsir al-Wasit",             author: "Tantawi",                           language: "arabic"  },
  { id: 94,  slug: "ar-tafsir-al-baghawi",             name: "Tafseer Al-Baghawi",             author: "Al-Baghawi",                        language: "arabic"  },
  { id: 157, slug: "tafsir-fe-zalul-quran-syed-qatab", name: "Fi Zilal al-Quran",              author: "Sayyid Qutb",                       language: "urdu"    },
  { id: 159, slug: "tafsir-bayan-ul-quran",            name: "Bayan ul Quran",                 author: "Dr. Israr Ahmad",                   language: "urdu"    },
  { id: 160, slug: "tafseer-ibn-e-kaseer-urdu",        name: "Tafsir Ibn Kathir (Urdu)",       author: "Hafiz Ibn Kathir",                  language: "urdu"    },
  { id: 168, slug: "en-tafsir-maarif-ul-quran",        name: "Ma'arif al-Qur'an",              author: "Mufti Muhammad Shafi",              language: "english" },
  { id: 169, slug: "en-tafisr-ibn-kathir",             name: "Ibn Kathir (Abridged)",          author: "Hafiz Ibn Kathir",                  language: "english" },
  { id: 817, slug: "tazkirul-quran-en",                name: "Tazkirul Quran",                 author: "Maulana Wahiduddin Khan",           language: "english" },
  { id: 818, slug: "tazkiru-quran-ur",                 name: "Tazkir ul Quran",                author: "Maulana Wahiduddin Khan",           language: "urdu"    },
] as const;

export type Tafsir = (typeof TAFSIRS)[number];

// Helper: get tafsirs by language
export const getTafsirsByLanguage = (lang: string) =>
  TAFSIRS.filter((t) => t.language === lang);

// Default tafsir for English users
export const DEFAULT_TAFSIR_ID = 169;

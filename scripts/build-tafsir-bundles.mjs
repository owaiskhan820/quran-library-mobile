#!/usr/bin/env node
// Maintainer-run script — NOT part of the shipped app or its build.
// Pre-fetches tafsir/translation text from api.quran.com and writes it as
// static, ayah-keyed JSON bundles under public/data/tafsirs and
// public/data/translations, so the app can ship this content directly in
// the APK instead of live-fetching it at runtime.
//
// Usage:
//   node scripts/build-tafsir-bundles.mjs                 # run everything, resumable
//   node scripts/build-tafsir-bundles.mjs --only=tafsir:169   # just one resource
//   node scripts/build-tafsir-bundles.mjs --force             # ignore existing output, refetch

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHAPTERS_PATH = path.join(ROOT, "public/data/chapters-tiny.json");
// Output goes to content-bundles/ (NOT public/) — this content is downloaded
// on-demand by the app at runtime, not shipped in the APK. These files get
// hosted externally (see plan) and fetched via the offline download manager.
const TAFSIR_OUT_DIR = path.join(ROOT, "content-bundles/tafsirs");
const TRANSLATION_OUT_DIR = path.join(ROOT, "content-bundles/translations");

const CONCURRENCY = 5;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// ---- Resource lists (per the agreed priority set) ----

// Tafsirs: fetched via /tafsirs/{id}/by_ayah/{surah}:{ayah}
const TAFSIR_RESOURCES = [
  { id: 14, slug: "ar-tafsir-ibn-kathir", name: "Tafsir Ibn Kathir (Arabic)" },
  { id: 169, slug: "en-tafisr-ibn-kathir", name: "Ibn Kathir (Abridged, English)" },
  { id: 160, slug: "tafseer-ibn-e-kaseer-urdu", name: "Tafsir Ibn Kathir (Urdu)" },
];

// Translations WITH footnotes to splice in (Maududi's Tafheem-ul-Quran
// commentary is delivered as translation text + linked footnotes).
const TRANSLATION_RESOURCES_WITH_FOOTNOTES = [
  { id: 95, slug: "en-maududi", name: "Tafheem-ul-Quran (English)" },
  { id: 97, slug: "ur-al-maududi", name: "Tafheem-e-Qur'an (Urdu)" },
];

// Plain translations, no footnote splicing needed — the remainder of the
// app's full TRANSLATIONS catalog (src/context/AudioContext.tsx), so every
// translation the app already offers becomes downloadable, not just Maududi.
const TRANSLATION_RESOURCES_PLAIN = [
  { id: 84, slug: "en-taqi-usmani", name: "Taqi Usmani (English)" },
  { id: 20, slug: "en-sahih", name: "Sahih International" },
  { id: 85, slug: "en-abdul-haleem", name: "Abdul Haleem" },
  { id: 22, slug: "en-yusuf-ali", name: "Yusuf Ali" },
  { id: 158, slug: "bayan-ul-quran", name: "Bayan-ul-Quran (Urdu)" },
  { id: 234, slug: "ur-fatah-muhammad-jalandhari", name: "Fatah Muhammad Jalandhari (Urdu)" },
  { id: 54, slug: "ur-junagarri", name: "Maulana Muhammad Junagarhi (Urdu)" },
  { id: 151, slug: "tafsir-e-usmani", name: "Tafsir-e-Usmani (Urdu)" },
  { id: 819, slug: "maulana-wahid-uddin-khan-urdu", name: "Maulana Wahiduddin Khan (Urdu)" },
  { id: 831, slug: "maududi-roman-urdu", name: "Maududi (Roman Urdu)" },
];

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1] : null; // e.g. "tafsir:169" or "translation:95"
const surahArg = args.find((a) => a.startsWith("--surah="));
const onlySurah = surahArg ? Number(surahArg.split("=")[1]) : null; // limit to one surah, for quick testing

function pad3(n) {
  return String(n).padStart(3, "0");
}

async function fetchJsonWithRetry(url) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastErr;
}

async function runPool(items, worker, concurrency = CONCURRENCY) {
  let index = 0;
  let active = 0;
  return new Promise((resolve, reject) => {
    let hadError = null;
    function next() {
      if (hadError) return;
      if (index >= items.length && active === 0) return resolve();
      while (active < concurrency && index < items.length) {
        const item = items[index++];
        active++;
        worker(item)
          .catch((err) => {
            hadError = err;
          })
          .finally(() => {
            active--;
            next();
          });
      }
    }
    next();
    if (items.length === 0) resolve();
  });
}

async function loadChapters() {
  const raw = await fs.readFile(CHAPTERS_PATH, "utf-8");
  const chapters = JSON.parse(raw); // [{ id, verses_count, ... }, ...]
  return onlySurah ? chapters.filter((c) => c.id === onlySurah) : chapters;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ---- Tafsir bundling ----
//
// IMPORTANT: api.quran.com's per-ayah "verses" metadata field is unreliable
// for detecting verse-range grouping — verified empirically: querying
// by_ayah for tafsir 169 (Ibn Kathir abridged) on 105:2..105:5 each returns
// the identical text block as 105:1, but every one of those responses'
// own "verses" field only lists "105:1", never itself. Relying on that
// field to skip fetching sibling ayahs silently drops them. So: always
// fetch every single ayah individually and write its own key, then
// detect actual grouping afterward by comparing the returned text content
// directly (byte-identical consecutive ayahs = one grouped passage).

async function buildTafsirResource(resource, chapters) {
  const outDir = path.join(TAFSIR_OUT_DIR, String(resource.id));
  await fs.mkdir(outDir, { recursive: true });

  console.log(`\n=== Tafsir ${resource.id} (${resource.name}) ===`);

  for (const chapter of chapters) {
    const surah = chapter.id;
    const outPath = path.join(outDir, `${pad3(surah)}.json`);

    if (!force && (await fileExists(outPath))) {
      console.log(`  surah ${surah}: already exists, skipping`);
      continue;
    }

    const rawTextByAyah = new Map(); // ayah number -> text
    const items = Array.from({ length: chapter.verses_count }, (_, i) => i + 1);

    await runPool(items, async (ayah) => {
      const key = `${surah}:${ayah}`;
      try {
        const data = await fetchJsonWithRetry(
          `https://api.quran.com/api/v4/tafsirs/${resource.id}/by_ayah/${key}`
        );
        const text = data?.tafsir?.text;
        if (text) rawTextByAyah.set(ayah, text);
      } catch (err) {
        console.error(`  FAILED ${key}: ${err.message}`);
      }
    });

    // Detect grouping: consecutive ayahs with byte-identical text form one range.
    const ayahs = {};
    let i = 1;
    while (i <= chapter.verses_count) {
      const text = rawTextByAyah.get(i);
      if (text === undefined) {
        i += 1;
        continue;
      }
      let j = i;
      while (j + 1 <= chapter.verses_count && rawTextByAyah.get(j + 1) === text) {
        j += 1;
      }
      for (let a = i; a <= j; a++) {
        ayahs[`${surah}:${a}`] = j > i ? { text, coversFrom: i, coversTo: j } : { text };
      }
      i = j + 1;
    }

    await fs.writeFile(outPath, JSON.stringify({ resourceId: resource.id, surah, ayahs }));
    console.log(`  surah ${surah}: wrote ${Object.keys(ayahs).length} ayahs`);
  }
}

// ---- Translation bundling (with footnote splicing for Maududi) ----

async function fetchFootnote(id, cache) {
  if (cache.has(id)) return cache.get(id);
  const data = await fetchJsonWithRetry(`https://api.quran.com/api/v4/foot_notes/${id}`);
  const text = data?.foot_note?.text ?? "";
  cache.set(id, text);
  return text;
}

async function buildTranslationResource(resource, chapters, { withFootnotes }) {
  await fs.mkdir(TRANSLATION_OUT_DIR, { recursive: true });
  const outPath = path.join(TRANSLATION_OUT_DIR, `${resource.id}.json`);

  if (!force && (await fileExists(outPath))) {
    console.log(`\n=== Translation ${resource.id} (${resource.name}) === already exists, skipping`);
    return;
  }

  console.log(`\n=== Translation ${resource.id} (${resource.name}) ===`);
  const ayahs = {};
  const footnoteCache = new Map();

  for (const chapter of chapters) {
    const surah = chapter.id;
    const items = Array.from({ length: chapter.verses_count }, (_, i) => i + 1);

    await runPool(items, async (ayah) => {
      const key = `${surah}:${ayah}`;
      try {
        const data = await fetchJsonWithRetry(
          `https://api.quran.com/api/v4/quran/translations/${resource.id}?verse_key=${key}`
        );
        const rawText = data?.translations?.[0]?.text ?? "";
        if (!rawText) return;

        if (!withFootnotes) {
          ayahs[key] = { text: rawText.replace(/<[^>]*>?/gm, "") };
          return;
        }

        const footnoteIds = [...rawText.matchAll(/foot_note="(\d+)"/g)].map((m) => m[1]);
        const cleanText = rawText.replace(/<sup[^>]*>\d+<\/sup>/g, "").replace(/<[^>]*>?/gm, "");
        const footnotes = [];
        for (const fid of footnoteIds) {
          try {
            const text = await fetchFootnote(fid, footnoteCache);
            if (text) footnotes.push(text.replace(/<[^>]*>?/gm, ""));
          } catch (err) {
            console.error(`  FAILED footnote ${fid} for ${key}: ${err.message}`);
          }
        }

        ayahs[key] = footnotes.length > 0 ? { text: cleanText, footnotes } : { text: cleanText };
      } catch (err) {
        console.error(`  FAILED ${key}: ${err.message}`);
      }
    });

    console.log(`  surah ${surah}: done`);
  }

  await fs.writeFile(outPath, JSON.stringify({ resourceId: resource.id, ayahs }));
  console.log(`  wrote ${Object.keys(ayahs).length} ayahs total`);
}

// ---- Main ----

async function main() {
  const chapters = await loadChapters();

  for (const resource of TAFSIR_RESOURCES) {
    if (only && only !== `tafsir:${resource.id}`) continue;
    await buildTafsirResource(resource, chapters);
  }

  for (const resource of TRANSLATION_RESOURCES_WITH_FOOTNOTES) {
    if (only && only !== `translation:${resource.id}`) continue;
    await buildTranslationResource(resource, chapters, { withFootnotes: true });
  }

  for (const resource of TRANSLATION_RESOURCES_PLAIN) {
    if (only && only !== `translation:${resource.id}`) continue;
    await buildTranslationResource(resource, chapters, { withFootnotes: false });
  }

  console.log("\nAll done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

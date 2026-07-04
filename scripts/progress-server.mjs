#!/usr/bin/env node
// Local-only progress page for scripts/build-tafsir-bundles.mjs.
// Run this alongside (or independently of) the bundling script to watch
// progress in a browser. Does NOT run the bundling script itself.
//
// Usage: node scripts/progress-server.mjs
// Then open: http://localhost:5050

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TAFSIR_DIR = path.join(ROOT, "content-bundles/tafsirs");
const TRANSLATION_DIR = path.join(ROOT, "content-bundles/translations");
const TOTAL_SURAHS = 114;
const PORT = 5050;

// Keep in sync with TAFSIR_RESOURCES / TRANSLATION_RESOURCES_* in
// scripts/build-tafsir-bundles.mjs — this is just the display catalog,
// it doesn't need to run that script's logic.
const TAFSIRS = [
  { id: 14, name: "Tafsir Ibn Kathir (Arabic)" },
  { id: 169, name: "Ibn Kathir (Abridged, English)" },
  { id: 160, name: "Tafsir Ibn Kathir (Urdu)" },
  { id: 15, name: "Tafsir al-Tabari (Arabic)" },
  { id: 16, name: "Tafsir Muyassar (Arabic)" },
  { id: 90, name: "Al-Qurtubi (Arabic)" },
  { id: 91, name: "Tafsir Al-Sa'di (Arabic)" },
  { id: 93, name: "Al-Tafsir al-Wasit (Arabic)" },
  { id: 94, name: "Tafseer Al-Baghawi (Arabic)" },
  { id: 157, name: "Fi Zilal al-Quran (Urdu)" },
  { id: 159, name: "Bayan ul Quran (Urdu)" },
  { id: 168, name: "Ma'arif al-Qur'an (English)" },
  { id: 817, name: "Tazkirul Quran (English)" },
  { id: 818, name: "Tazkir ul Quran (Urdu)" },
];

const TRANSLATIONS = [
  { id: 20, name: "Sahih International" },
  { id: 84, name: "Taqi Usmani" },
  { id: 85, name: "Abdul Haleem" },
  { id: 22, name: "Yusuf Ali" },
  { id: 95, name: "Tafheem-ul-Quran (English)" },
  { id: 158, name: "Bayan-ul-Quran (Urdu)" },
  { id: 97, name: "Tafheem-e-Qur'an (Urdu)" },
  { id: 234, name: "Fatah Muhammad Jalandhari (Urdu)" },
  { id: 54, name: "Maulana Muhammad Junagarhi (Urdu)" },
  { id: 151, name: "Tafsir-e-Usmani (Urdu)" },
  { id: 819, name: "Maulana Wahiduddin Khan (Urdu)" },
  { id: 831, name: "Maududi (Roman Urdu)" },
];

function countSurahFiles(tafsirId) {
  const dir = path.join(TAFSIR_DIR, String(tafsirId));
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.endsWith(".part")).length;
}

function translationDone(translationId) {
  return fs.existsSync(path.join(TRANSLATION_DIR, `${translationId}.json`));
}

// Rolling rate estimate, computed between consecutive requests to this
// server (works whether you check every few seconds or once an hour).
let lastSample = null; // { count, time }

function computeProgress() {
  const tafsirRows = TAFSIRS.map((t) => {
    const done = countSurahFiles(t.id);
    return { id: t.id, name: t.name, done, total: TOTAL_SURAHS, percent: Math.round((done / TOTAL_SURAHS) * 100) };
  });

  const translationRows = TRANSLATIONS.map((t) => ({
    id: t.id,
    name: t.name,
    done: translationDone(t.id) ? 1 : 0,
    total: 1,
  }));

  const tafsirDone = tafsirRows.reduce((sum, r) => sum + r.done, 0);
  const tafsirTotal = tafsirRows.length * TOTAL_SURAHS;
  const translationDoneCount = translationRows.reduce((sum, r) => sum + r.done, 0);
  const translationTotal = translationRows.length;

  const overallDone = tafsirDone + translationDoneCount;
  const overallTotal = tafsirTotal + translationTotal;
  const overallPercent = Math.round((overallDone / overallTotal) * 100);

  const now = Date.now();
  let ratePerMinute = null;
  let etaMinutes = null;
  if (lastSample) {
    const deltaCount = overallDone - lastSample.count;
    const deltaMs = now - lastSample.time;
    if (deltaMs > 0 && deltaCount >= 0) {
      ratePerMinute = deltaCount / (deltaMs / 60000);
      if (ratePerMinute > 0) {
        etaMinutes = (overallTotal - overallDone) / ratePerMinute;
      }
    }
  }
  lastSample = { count: overallDone, time: now };

  return { tafsirRows, translationRows, overallDone, overallTotal, overallPercent, ratePerMinute, etaMinutes };
}

function formatEta(etaMinutes) {
  if (etaMinutes === null) return "Calculating… (refresh again in a bit)";
  if (etaMinutes <= 0) return "Almost done";
  const hours = Math.floor(etaMinutes / 60);
  const mins = Math.round(etaMinutes % 60);
  if (hours > 0) return `~${hours}h ${mins}m remaining`;
  return `~${mins}m remaining`;
}

function renderHtml(data) {
  const bar = (percent) =>
    `<div style="background:#e5e7eb;border-radius:6px;overflow:hidden;height:10px;width:100%">
      <div style="background:#0f766e;height:100%;width:${percent}%"></div>
    </div>`;

  const tafsirRowsHtml = data.tafsirRows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 10px">${r.name}</td>
        <td style="padding:6px 10px;width:160px">${bar(r.percent)}</td>
        <td style="padding:6px 10px;text-align:right;color:#6b7280">${r.done}/${r.total}</td>
      </tr>`
    )
    .join("");

  const translationRowsHtml = data.translationRows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 10px">${r.name}</td>
        <td style="padding:6px 10px;text-align:right;color:${r.done ? "#0f766e" : "#6b7280"}">${r.done ? "✓ done" : "pending"}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tafsir/Translation Download Progress</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #111827; }
    h1 { font-size: 1.3rem; }
    table { width: 100%; border-collapse: collapse; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Tafsir &amp; Translation Bundle Progress</h1>

  <div class="card">
    <strong>Overall: ${data.overallDone} / ${data.overallTotal} (${data.overallPercent}%)</strong>
    ${bar(data.overallPercent)}
    <p style="color:#6b7280;margin-bottom:0">${formatEta(data.etaMinutes)}${
      data.ratePerMinute ? ` &bull; ~${data.ratePerMinute.toFixed(1)} items/min` : ""
    }</p>
  </div>

  <h2 style="font-size:1rem">Tafsirs (114 surahs each)</h2>
  <table>${tafsirRowsHtml}</table>

  <h2 style="font-size:1rem;margin-top:24px">Translations</h2>
  <table>${translationRowsHtml}</table>

  <p style="color:#9ca3af;font-size:0.8rem;margin-top:24px">Auto-refreshes every 5 seconds. This page only reads files on disk — it does not run the download script itself.</p>

  <script>
    setTimeout(() => location.reload(), 5000);
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    const data = computeProgress();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderHtml(data));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Progress page: http://localhost:${PORT}`);
});

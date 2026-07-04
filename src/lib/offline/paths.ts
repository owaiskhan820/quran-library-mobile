// Path builders for offline content stored under Directory.Data.
// All paths are relative (Filesystem resolves them against the given Directory).
// Naming deliberately mirrors the existing remote URL identity keys
// (reciter slug, zero-padded surah/ayah, translation/tafsir id) so that
// "is this available offline" is a pure string transform of the same
// inputs already used by buildAyahAudioUrl / fetchAyahTranslation / tafsir fetch.

const ROOT = "offline";

export function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function manifestPath(): string {
  return `${ROOT}/manifest.json`;
}

export function audioSurahDir(reciterSlug: string, surah: number): string {
  return `${ROOT}/audio/${reciterSlug}/${pad3(surah)}`;
}

export function audioAyahPath(reciterSlug: string, surah: number, ayah: number): string {
  return `${audioSurahDir(reciterSlug, surah)}/${pad3(surah)}${pad3(ayah)}.mp3`;
}

// Temp filename used during download, renamed to the final path only after
// a successful full write — guards against a killed-mid-write process
// leaving a corrupt file that a naive existence check would treat as complete.
export function audioAyahTempPath(reciterSlug: string, surah: number, ayah: number): string {
  return `${audioAyahPath(reciterSlug, surah, ayah)}.part`;
}

export function translationPath(translationId: number): string {
  return `${ROOT}/translations/${translationId}.json`;
}

export function tafsirWholeBookPath(tafsirId: number): string {
  return `${ROOT}/tafsirs/${tafsirId}.json`;
}

export function tafsirSurahPath(tafsirId: number, surah: number): string {
  return `${ROOT}/tafsirs/${tafsirId}/${pad3(surah)}.json`;
}

export function audioKey(reciterSlug: string, surah: number, ayah: number): string {
  return `${reciterSlug}:${surah}:${ayah}`;
}

export function ayahKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

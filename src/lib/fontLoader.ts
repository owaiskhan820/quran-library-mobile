// Module-level registry — persists for the entire browser session
// Maps page number to its FontFace load Promise
const fontRegistry = new Map<number, Promise<void>>();

/**
 * Loads a QPC page font directly into document.fonts via the FontFace API.
 * Never touches any stylesheet. Never triggers style recalculation.
 * Safe to call multiple times — subsequent calls return the cached Promise.
 */
export function loadPageFont(pageNumber: number): Promise<void> {
  if (fontRegistry.has(pageNumber)) {
    return fontRegistry.get(pageNumber)!;
  }

  const promise = (async () => {
    const face = new FontFace(
      `p${pageNumber}`,
      `url('/fonts/qpc/p${pageNumber}.woff2') format('woff2')`
    );

    try {
      const loaded = await face.load();
      document.fonts.add(loaded);
    } catch (err) {
      // Remove from registry so it can be retried
      fontRegistry.delete(pageNumber);
      throw err;
    }
  })();

  fontRegistry.set(pageNumber, promise);
  return promise;
}

/**
 * Preloads fonts for neighbor pages — fire and forget.
 * Errors are silently swallowed.
 */
export function preloadPageFonts(pageNumbers: number[]): void {
  pageNumbers.forEach(p => {
    loadPageFont(p).catch(() => {});
  });
}

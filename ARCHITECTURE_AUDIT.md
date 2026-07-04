# Architecture Audit — `refactor-routing` Branch
*Branch: `refactor-routing` | Date: 2026-05-01*

---

## 1. Routing Analysis — Full Re-mount on Every Page Turn ⚠️ CRITICAL

**Verdict: Full server round-trip on every Mushaf page change.**

`navigateToPage()` in `MushafSpreadViewer.tsx` calls `router.push(`/page/${pageTarget}`)` wrapped in a `useTransition()`.

```tsx
// MushafSpreadViewer.tsx:506-508
startTransition(() => {
  router.push(`/page/${pageTarget}`);
});
```

This hits the **dynamic App Router route** at `src/app/page/[pageNumber]/page.tsx`. That server component:
1. Reads the `pageNumber` from the URL params.
2. **Synchronously reads two JSON files from disk** (`rightLines`, `leftLines`) using `fs.readFile`.
3. Passes them as props to `MushafSpreadViewer`.

**The consequence:** Even though `generateStaticParams()` pre-generates all 604 pages, every navigation still causes **React to fully unmount and re-mount `MushafSpreadViewer`** because it is receiving new props from a new server component render. The `useTransition` softens the visual jank, but the component tree is destroyed and rebuilt from scratch every page turn.

**What `<Link>` is used for:** Only for the *desktop* nav arrows and two hidden prefetch links. The arrows call `e.preventDefault()` and fall back to `router.push()` anyway, so `<Link>` is essentially decorative for navigation.

---

## 2. State Management — pageNumber is URL-Driven, State is Local ⚠️

**Verdict: The most important state lives in two places — the URL and `AudioContext`. The viewer component is stateless per page, which is the root cause of full re-mounts.**

- **`requestedPage`** — derived entirely from the URL (`/page/[pageNumber]`). It is a Server Component prop, not React state.
- **`rightPage`, `leftPage`, `rightLines`, `leftLines`** — also props from the server. When the URL changes, these are all new, destroying the previous render tree.
- **`AudioContext`** — *global* state that survives page turns (it lives in the root layout above the route segment). This is why audio playback and preferences persist, but the Mushaf viewer does not.
- **`wordTranslations`, `fetchedPages`** — live in `AudioContext`. The `fetchedPages` ref prevents re-fetching the same page, but it resets on full app reload.
- **Local `MushafSpreadViewer` state** (`direction`, `prevRight`, `actionMenuWord`, etc.) is reset on every page turn because the component re-mounts.

**The critical insight:** If `MushafSpreadViewer` were mounted once in the root layout and received `rightLines`/`leftLines` via a client-side fetch triggered by `useRouter`, none of this re-mounting would occur.

---

## 3. The Glyph Mystery — Client-Side, Inline in Render Loop ✅ (by design, but heavy)

**Verdict: Glyph rendering is a custom QPC ligature font system. There is no JS glyph-ID-to-character mapping. Glyphs are rendered directly from character codes (`word.c`) via CSS `font-family` rules.**

Here is how it works:
1. **Data**: Each `word.c` in the page JSON is a raw Unicode character (or sequence) that maps to an Arabic glyph when rendered in the correct page-specific font.
2. **Font Loading**: `buildPageFontCss()` generates `@font-face` CSS at runtime for `p${pageNumber}` fonts. This is injected into the `<head>` by `QpcFontStyleRegistry` via a `useLayoutEffect`.
3. **Font Wait**: `FifteenLineGrid` uses a `useEffect` with `document.fonts.load(`1em p${pageNumber}`)` to detect when the font is ready. It flips `isFontLoaded` from `false` → `true`, which fades in the text and fades out the skeleton.

**The performance cost:** On every page navigation:
- `isFontLoaded` resets to `false` immediately (line 91: `setTimeout(() => setIsFontLoaded(false), 0)`).
- The skeleton appears instantly.
- The font is fetched (or pulled from cache).
- 50ms after font is ready, text appears.
- If font fails, a 2500ms fallback kicks in.

This is the **correct and unavoidable design** for QPC glyph fonts. The `document.fonts.load()` check is the right approach. **The only optimization is ensuring fonts are cached aggressively** — which the neighbor preloading (lines 461-472) already does.

---

## 4. Framer Motion Audit — Complete Inventory

### `MushafSpreadViewer.tsx` (the problem child)

| Location | Usage | Can Remove? |
|---|---|---|
| **Line 131** (`FifteenLineGrid`) | `motion.div` wrapping `MushafSkeleton` for fade-in/out. Uses `AnimatePresence`. | ✅ Replace with CSS `opacity` transition |
| **Line 358** (`WordTooltip`) | `motion.div` for word meaning tooltip (scale + opacity + y). JS-driven on every hover on every word. | ✅ Replace with CSS transitions |
| **Line 667** | `motion.div` boundary flash (red border on first/last page). Short lived. | ✅ Replace with CSS |
| **Line 677** | **`motion.section`** — THE BIG ONE. The entire Mushaf spread (both pages) is wrapped in a `motion.section` with a 3D `rotateY` page-flip animation. Uses `AnimatePresence mode="popLayout"`. | ⚠️ Keep or replace with CSS 3D — removing changes the feel significantly |

### `MushafSkeleton.tsx`

| Location | Usage | Can Remove? |
|---|---|---|
| **Line 27** | `motion.div` shimmer — an infinitely repeating JS animation inside 15 skeleton bars. **This runs on the JS thread continuously while fonts load.** | ✅ Replace with CSS `@keyframes` shimmer |

### `MediaPlayer.tsx`

| Location | Usage | Can Remove? |
|---|---|---|
| **Lines 100, 128, 166, 216** | Sub-menu panels (Reciter, Translation, Repeat) enter/exit animations. | ✅ Replace with CSS transitions |
| **Lines 258, 275, 292** | `height: 0 → auto` accordion items inside Repeat menu. | ⚠️ Keep (CSS `height: auto` transitions are not trivial) |
| **Line 385** | Translation text fade (`mode="wait"`). | ✅ Replace with CSS |
| **Line 481** | Main MediaPlayer slide-up. | ✅ Replace with CSS |

---

## 5. Dependency Bottlenecks — Direct JSON Imports ⚠️

**Three components import JSON directly into their JS bundles:**

| File | Import | Size | Impact |
|---|---|---|---|
| `src/app/layout.tsx` | `chapters.json` | **59 KB** | Bundled into every page's server JS. Passed as props to `<Navbar>`. |
| `src/app/layout.tsx` | `juzs.json` | **7 KB** | Same — bundled into root layout server component. |
| `src/components/MushafSpreadViewer.tsx` | `chapters.json` | **59 KB** | Bundled into the **client-side** JS bundle. This is the most damaging. The full 59 KB chapters JSON is shipped to every mobile browser. |
| `src/components/MediaPlayer.tsx` | `chapters.json` | **59 KB** | Also bundled into the client-side JS. Same 59 KB, second time. |

**The `layout.tsx` imports are acceptable** — they run server-side only and the data is needed for `<Navbar>`. **The `MushafSpreadViewer.tsx` and `MediaPlayer.tsx` client-side imports are the problem.** They only need 1-2 fields from the chapter object (e.g., `name_simple`). Importing the entire 59 KB file to look up one field is wasteful.

---

## Surgical Order of Operations

Priority is ranked by **performance impact × implementation risk**.

| # | Fix | Files | Impact | Risk |
|---|---|---|---|---|
| **1** | **Replace `MushafSkeleton` shimmer with CSS `@keyframes`** | `MushafSkeleton.tsx` | 🔴 High — removes a continuously-running JS animation that blocks the thread | 🟢 Low |
| **2** | **Replace `WordTooltip` `motion.div` with CSS transitions** | `MushafSpreadViewer.tsx` | 🔴 High — fires JS on every single word hover. On a 300-word page this is significant | 🟢 Low |
| **3** | **Replace Skeleton fade `motion.div` with CSS opacity transition** | `MushafSpreadViewer.tsx:131` | 🟡 Medium — simple `AnimatePresence` replacement | 🟢 Low |
| **4** | **Replace boundary flash `motion.div` with CSS** | `MushafSpreadViewer.tsx:667` | 🟢 Low isolated impact | 🟢 Low |
| **5** | **Replace `chapters.json` client import with a tiny lookup utility** | `MushafSpreadViewer.tsx`, `MediaPlayer.tsx` | 🟡 Medium — reduces client bundle by ~59 KB each. Can use a server-fetched prop or a pre-built lightweight map | 🟡 Medium |
| **6** | **Shallow-route the page turns (the big refactor)** | `MushafSpreadViewer.tsx`, `page/[pageNumber]/page.tsx` | 🔴 Critical — eliminates full re-mounts on every page turn. Move `MushafSpreadViewer` to root layout, fetch page data client-side | 🔴 High |
| **7** | **Evaluate the `motion.section` 3D page-flip** | `MushafSpreadViewer.tsx:677` | 🟡 Medium — the 3D `rotateY` is beautiful but heavy on mobile. Could simplify to a CSS `translateX` fade | 🟡 Medium |

> [!IMPORTANT]
> **Do items 1–4 first.** They are zero-risk, high-reward wins with no architectural changes.
> **Item 6 (shallow routing) is the root cause** of the re-mount problem, but it requires moving data fetching to the client, which changes the component architecture significantly. Plan this carefully with a proper implementation design before touching code.

> [!NOTE]
> The glyph rendering system (Item 3 in the investigation) is well-designed and does not need structural changes. The 50ms font-settle delay and neighbor preloading are correct patterns. The only gain here is ensuring fonts are cached on first visit, which the existing `document.fonts.load()` preload logic already handles.

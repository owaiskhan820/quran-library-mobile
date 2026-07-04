# Quran Library Web

Quran library Web is a beautiful, highly optimized, and responsive Quran reading application built with modern web technologies. Designed for a premium reading experience, it authentically replicates the 15-line Mushaf layout with smooth interactive enhancements.

## 🛠 Tech Stack

- **Framework**: Next.js 16.2.2 (App Router)
- **Library**: React 19.2.4
- **Language**: TypeScript (^5)
- **Styling**: Tailwind CSS v4 / PostCSS
- **Animations**: Framer Motion (^12.38.0)

## 📁 Project Structure

```text
quran-assistant/
├── public/                 # Static assets
│   ├── data/               # Local JSON data (chapters, juzs, and 604 mushaf pages)
│   ├── fonts/              # Custom QPC fonts per page & common Surah fonts
│   └── resources/          # Background images and banners
├── src/
│   ├── app/                # Next.js App Router root
│   │   ├── layout.tsx      # Root layout & core HTML setup
│   │   ├── page.tsx        # Server component fetching initial chapters/juzs data
│   │   └── page/[pageNumber]/page.tsx # Dynamic routing for the 604 Mushaf pages
│   ├── components/         # Reusable React components
│   │   ├── HomeClient.tsx  # Interactive homepage with tabs (Surah/Juz)
│   │   ├── MushafSpreadViewer.tsx # Core viewer for reading lines
│   │   ├── QpcFontStyleRegistry.tsx # Dynamic font injector for loaded pages
│   │   └── FilterMenu.tsx, JuzGrid.tsx, Navbar.tsx, Footer.tsx
│   └── types/              # TypeScript definitions for Quran & Mushaf types
```

## ✨ Key Features

- **High-Fidelity Mushaf Reading Environment**: Accurately renders the 15-line standard Medina (QPC) layout.
- **Server-Side Rendering (SSG)**: Pre-renders all 604 pages of the Quran instantly using native file-system queries (`fs/promises`) avoiding HTTP bottlenecks.
- **Dynamic Right-to-Left (RTL) Book Spread**: Displays two pages simultaneously, automatically routing back to the correct right-side page context.
- **Interactive Navigation grids**: View and explore by Surah or Juz through visually rich, searchable components.
- **Premium User Experience**: Embedded custom Surah headers, elegant "Continue Reading" banner, and frosted glass layout effects.
- **Intelligent Page Preloading**: Handles complex font face declarations per-page to drastically reduce font load jitter.

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (or yarn / pnpm)

### Steps

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **View the app**:
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 💡 Unique & Special Parts

- **Native Book-Flipping Mechanics**: Utilizing `framer-motion`'s 3D rotational mechanics (`rotateY`, `transformStyle: "preserve-3d"`), the page turns convincingly simulate a physical right-to-left Arabic book, complete with an aesthetic spine shadow projection.

- **Dynamic WOFF2 Font Injector (`QpcFontStyleRegistry`)**: Rather than bloating the browser with every Quran font, the app dynamically constructs `<style>` tags mapping exclusively to the `p${pageNumber}` arrays on the current spread, maximizing render performance.

- **"Smart" Spread Detection**: In an RTL environment on desktop/tablet, starting from a left page can break the layout flow. The custom routing logic transparently intercepts navigation to left pages and snaps the user to the start of the spread (right page).

- **Granular Baseline Interventions**: Includes special conditional checks for word types (like `.isStopSign`), dynamically re-coloring and formatting text seamlessly into the HTML rendering pipeline without needing complex DOM measurements.

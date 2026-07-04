import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-surface-container mt-16">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Links Section */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <nav className="flex gap-8">
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-primary transition">
              ABOUT
            </Link>
            <Link href="/privacy" className="text-sm font-medium text-gray-600 hover:text-primary transition">
              PRIVACY
            </Link>
            <Link href="/terms" className="text-sm font-medium text-gray-600 hover:text-primary transition">
              TERMS
            </Link>
            <Link href="/support" className="text-sm font-medium text-gray-600 hover:text-primary transition">
              SUPPORT
            </Link>
          </nav>
        </div>

        {/* Branding */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-primary">Quran Assistant</h3>
        </div>

        {/* Copyright */}
        <div className="text-center border-t border-surface-container pt-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">
            © 2024 QURAN ASSISTANT: THE SACRED LIBRARY
          </p>
        </div>
      </div>
    </footer>
  );
}

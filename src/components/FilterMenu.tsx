"use client";

interface FilterMenuProps {
  activeTab: "surah" | "juz";
  onTabChange: (tab: "surah" | "juz") => void;
}

export default function FilterMenu({ activeTab, onTabChange }: FilterMenuProps) {
  return (
    <div className="flex gap-0.5 justify-center bg-white rounded-full p-1 w-fit mx-auto border-2 border-primary/20 shadow-sm">
      <button
        onClick={() => onTabChange("surah")}
        className={`px-8 py-2 rounded-full font-semibold transition-all duration-300 ${
          activeTab === "surah"
            ? "bg-primary text-white shadow-md"
            : "bg-transparent text-gray-600 hover:text-gray-900"
        }`}
      >
        Surah
      </button>
      <button
        onClick={() => onTabChange("juz")}
        className={`px-8 py-2 rounded-full font-semibold transition-all duration-300 ${
          activeTab === "juz"
            ? "bg-primary text-white shadow-md"
            : "bg-transparent text-gray-600 hover:text-gray-900"
        }`}
      >
        Juz
      </button>
    </div>
  );
}

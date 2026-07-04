"use client";

export default function MushafSkeleton() {
    const rows = [
      "92%", "88%", "95%", "90%", "85%",
      "94%", "89%", "96%", "91%", "87%",
      "93%", "86%", "98%", "89%", "92%"
    ];

    return (
      <div className="w-full h-full grid grid-rows-15 py-2 gap-0">
        {rows.map((width, i) => (
          <div
            key={i}
            className="w-full flex items-center justify-center px-6 lg:px-12"
          >
            <div
              className="h-3.5 bg-gray-200 rounded-full relative overflow-hidden shadow-sm animate-shimmer"
              style={{ width, opacity: 0.7 }}
            />
          </div>
        ))}
      </div>
    );
  }

"use client";

import { useState } from "react";
import { ListingPhoto } from "./listing-photo";
import { cn } from "./ui";

export function ListingGallery({
  images,
  title,
  credit,
  placeholder,
}: {
  images: string[];
  title: string;
  credit?: string;
  placeholder: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return <>{placeholder}</>;
  return (
    <div>
      <div className="relative">
        <ListingPhoto
          key={images[active]}
          src={images[active]}
          alt={`${title} — photo ${active + 1} of ${images.length}`}
          className="h-56 w-full animate-rise sm:h-80"
          fallback={placeholder}
        />
        {credit && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur">
            {credit}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label="Listing photos">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 overflow-hidden rounded-xl ring-2 transition",
                i === active ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100",
              )}
            >
              <ListingPhoto src={src} alt="" className="h-16 w-24" fallback={<span className="block h-16 w-24 bg-line" />} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

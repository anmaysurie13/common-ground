"use client";

import { useState } from "react";
import { cn } from "./ui";

/** Remote listing photo that quietly falls back to the placeholder if it fails to load. */
export function ListingPhoto({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied hosts
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("bg-line/60 object-cover", className)}
    />
  );
}

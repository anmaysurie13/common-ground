"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

export function GroupNav({ code }: { code: string }) {
  const pathname = usePathname();
  const base = `/g/${code}`;
  const tabs = [
    { href: base, label: "Group" },
    { href: `${base}/preferences`, label: "Preferences" },
    { href: `${base}/listings`, label: "Listings" },
    { href: `${base}/results`, label: "Shortlist" },
    { href: `${base}/compare`, label: "Compare" },
  ];
  return (
    <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Group sections">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition",
              active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

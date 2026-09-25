import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          Common Ground
        </Link>
        <Link href="/new" className="text-sm font-medium text-muted transition hover:text-ink">
          New group
        </Link>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="8" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="16" r="5.5" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" />
    </svg>
  );
}

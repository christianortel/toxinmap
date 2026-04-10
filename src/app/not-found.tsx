import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[70vh] items-center py-24">
      <div className="surface-panel editorial-gradient max-w-3xl px-8 py-14 md:px-12">
        <p className="eyebrow mb-5">Page not found</p>
        <h1 className="section-title mb-6">The requested file is outside this published atlas.</h1>
        <p className="body-md max-w-2xl">
          The current build includes the published editorial routes and globe-first explorer, but
          this particular page does not exist in the atlas.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-[var(--foreground)] transition hover:bg-white/15"
          >
            Return home
          </Link>
          <Link
            href="/explore"
            className="rounded-full border border-[rgba(167,116,78,0.32)] bg-[rgba(167,116,78,0.14)] px-5 py-3 text-sm text-[var(--foreground)] transition hover:bg-[rgba(167,116,78,0.22)]"
          >
            Open explorer
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { featuredStats, warningCategories } from "@/data/mock/methodology";
import { FeaturedStatisticBlock } from "@/components/featured-statistic-block";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="page-shell pb-20 pt-14 md:pb-28 md:pt-18">
      <div className="surface-panel editorial-gradient relative overflow-hidden px-6 py-8 md:px-10 md:py-12 lg:px-14 lg:py-16">
        <div className="absolute inset-y-0 right-0 hidden w-[44%] lg:block">
          <div className="absolute inset-8 rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_30%_30%,rgba(135,160,176,0.18),transparent_28%),radial-gradient(circle_at_68%_58%,rgba(167,116,78,0.22),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
          <div className="absolute inset-14 rounded-full border border-white/10 bg-[radial-gradient(circle_at_45%_35%,rgba(255,255,255,0.1),transparent_16%),radial-gradient(circle_at_50%_50%,rgba(78,90,99,0.4),rgba(8,10,12,0.1)_56%,transparent_58%)] shadow-[0_0_120px_rgba(0,0,0,0.38)]" />
        </div>

        <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_320px] lg:items-end">
          <div className="max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--foreground-soft)]">
            <ShieldAlert className="h-3.5 w-3.5 text-[var(--accent-warning)]" />
            Globe-first investigative atlas
          </div>
          <h1 className="display-title text-white">
            The maps of contamination stop too early.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--foreground-muted)] md:text-xl">
            DOWNSTREAM explores how industrial contamination records, emerging chemical
            pathways, wildlife abnormalities, reproductive-health warning signs, and legal
            pressure may begin to overlap across place and time.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button asChild variant="industrial" size="lg">
              <Link href="/explore">
                Enter the globe
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/methodology">Read the methodology</Link>
            </Button>
          </div>
          </div>

          <div className="surface-panel-soft self-start p-5 lg:ml-auto">
            <p className="eyebrow mb-3">Editorial posture</p>
            <p className="font-serif text-2xl tracking-[-0.05em] text-white">
              A careful atlas for the signals public systems do not align cleanly enough to show.
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                <p className="meta-kicker">Measured</p>
                <p className="mt-2 body-sm">Facility, release, permit, and cleanup context.</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                <p className="meta-kicker">Interpretive</p>
                <p className="mt-2 body-sm">
                  Wildlife, reproductive context, and editorial synthesis remain clearly labeled.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glow-divider my-10" />

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-3 md:grid-cols-2">
            {warningCategories.slice(0, 4).map((category) => (
              <div key={category.key} className="surface-panel-soft p-5">
                <p className="eyebrow mb-3" style={{ color: category.accent }}>
                  {category.title}
                </p>
                <p className="body-sm">{category.summary}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {featuredStats.map((stat) => (
              <FeaturedStatisticBlock key={stat.label} stat={stat} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

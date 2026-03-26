import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      {/* Background image */}
      <Image
        src="/rak-hero.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
        quality={75}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-deep-forest/40" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-center px-4 sm:px-12 py-4 sm:py-6">
        <span className="text-xs tracking-[0.35em] uppercase text-white/60 font-heading">
          Real Estate Done Right
        </span>
      </header>

      {/* Content — logo + body grouped, CTA separate below */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-between px-4 sm:px-8 pt-4 sm:pt-6 pb-10 sm:pb-16">

        {/* Logo + body copy card */}
        <div className="flex flex-col items-center text-center mt-2 sm:mt-4">
          <div className="bg-white/6 backdrop-blur-md border border-white/10 rounded-3xl px-6 sm:px-12 py-8 sm:py-10 max-w-2xl">
            <Image
              src="/logo.png"
              alt="Namou Properties"
              width={520}
              height={160}
              className="object-contain w-auto h-[14vh] sm:h-[26vh] lg:h-[32vh] mx-auto"
              priority
            />
            <p className="text-sm sm:text-base md:text-lg text-white/75 max-w-lg mx-auto leading-relaxed mt-4 sm:mt-5">
              Review land opportunities, compare pricing scenarios, and model ROI or Joint-venture outcomes in real time to guide each conversation toward the right deal.
            </p>
          </div>
        </div>

        {/* CTA — placed separately in lower portion of screen */}
        <div className="flex flex-col items-center gap-3 mb-4 sm:mb-8">
          <Link
            href="/master-plan"
            className="px-10 sm:px-14 py-3.5 sm:py-4 bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl text-base sm:text-lg font-semibold text-white hover:bg-white/25 hover:border-white/50 transition-all text-center shadow-lg"
          >
            Begin the Land Search
          </Link>
          <span className="text-xs text-white/40 tracking-wide">
            Guided land review and deal structuring
          </span>
        </div>

      </main>
    </div>
  );
}

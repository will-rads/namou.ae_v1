import Link from "next/link";
import ContentCard from "@/components/ContentCard";

const MODELS = [
  {
    id: "build-sell",
    label: "Sell-Out Model",
    tag: "Developer Exit",
    href: "/JV/build-sell",
    bullets: [
      "Build for sale",
      "Profit shared at exit",
      "Includes comparison vs land sale today",
    ],
  },
  {
    id: "build-lease",
    label: "Income Model",
    tag: "Tenants",
    href: "/JV/build-lease",
    bullets: [
      "Build and lease to tenants",
      "Recurring income and NOI",
      "Tracks yield, ROI, and payback",
    ],
  },
  {
    id: "build-hotel",
    label: "Hospitality Model",
    tag: "Operator Model",
    href: "/JV/build-hotel",
    bullets: [
      "Build and operate as hotel",
      "Operator fees deducted first",
      "Profit shared after operations",
    ],
  },
];

export default function JVPage() {
  return (
    <div className="flex flex-col flex-1 gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">
          Joint-Venture Simulator
        </h1>
        <p className="text-sm text-muted mt-1">
          Model joint-venture returns for landowners and capital partners.
        </p>
      </div>

      {/* Structure */}
      <ContentCard>
        <h2 className="text-lg font-semibold text-deep-forest mb-2">
          How It Works
        </h2>
        <ul className="space-y-1 text-sm text-muted">
          <li className="flex items-start gap-2"><span className="text-forest mt-0.5">&#8226;</span>Landowner contributes land</li>
          <li className="flex items-start gap-2"><span className="text-forest mt-0.5">&#8226;</span>Investor / developer contributes capital</li>
          <li className="flex items-start gap-2"><span className="text-forest mt-0.5">&#8226;</span>Returns are shared by structure</li>
        </ul>
      </ContentCard>

      {/* Step 1 */}
      <div className="flex flex-col flex-1 min-h-0">
        <ContentCard className="flex flex-col flex-1">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white bg-forest px-2 py-0.5 rounded-full">
                Step 1
              </span>
              <h2 className="text-lg font-semibold text-deep-forest">
                Choose Investment Strategy
              </h2>
            </div>
            <p className="text-xs text-muted">
              Select how the JV will create value. Each model uses a different return logic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 auto-rows-fr">
            {MODELS.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className="group flex flex-col items-start text-left p-4 rounded-xl border transition-all bg-white border-mint-light hover:bg-forest hover:text-white hover:border-forest hover:shadow-md"
              >
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2 bg-forest/10 text-forest group-hover:bg-white/20 group-hover:text-white transition-colors">
                  {m.tag}
                </span>
                <span className="text-base font-bold mb-1">{m.label}</span>
                <ul className="space-y-0.5 text-xs leading-relaxed text-muted group-hover:text-white/80 transition-colors">
                  {m.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-1.5">
                      <span className="mt-0.5">&#8226;</span>{b}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto pt-3 text-xs font-medium text-forest group-hover:text-white/90 flex items-center gap-1 transition-colors">
                  Open simulator
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </span>
              </Link>
            ))}
          </div>

          <p className="text-xs text-muted mt-3">
            Each model applies different assumptions for cost, revenue, and profit-sharing.
          </p>
        </ContentCard>
      </div>
    </div>
  );
}

import Link from "next/link";
import ContentCard from "@/components/ContentCard";

const MODELS = [
  {
    id: "build-sell",
    label: "Build & Sell",
    tag: "Developer Exit",
    href: "/JV/build-sell",
    description:
      "Develop the land and sell completed units. The landowner contributes the plot, the investor funds construction, and both share proceeds from unit sales based on the agreed JV split.",
  },
  {
    id: "build-lease",
    label: "Build & Lease",
    tag: "Tenants",
    href: "/JV/build-lease",
    description:
      "Build residential or commercial units and lease them to tenants. Revenue is generated through recurring rental income, distributed between the landowner and investor over the hold period.",
  },
  {
    id: "build-hotel",
    label: "Build & Hotel",
    tag: "Operator Model",
    href: "/JV/build-hotel",
    description:
      "Develop a hospitality asset and appoint a hotel operator. Returns are driven by room revenue and occupancy rates, shared between the landowner and the investor under the JV terms.",
  },
];

export default function JVPage() {
  return (
    <div className="flex flex-col flex-1 gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">
          JV Simulator
        </h1>
        <p className="text-sm text-muted mt-1">
          New Core Engine — Joint-venture ROI modelling for landowners and investors.
        </p>
      </div>

      {/* Explanation */}
      <ContentCard>
        <h2 className="text-lg font-semibold text-deep-forest mb-2">
          How It Works
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl">
          In a JV structure, a landowner contributes land while a developer or investor contributes
          capital. Both parties share the resulting profits based on an agreed split. The JV Simulator
          lets you model returns across different investment strategies so each side can evaluate the
          opportunity before committing.
        </p>
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
                Select Investment Model
              </h2>
            </div>
            <p className="text-xs text-muted">
              Choose how the joint venture will generate returns. Each model has different ROI logic.
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
                <span className="text-xs leading-relaxed text-muted group-hover:text-white/80 transition-colors">
                  {m.description}
                </span>
                <span className="mt-auto pt-3 text-xs font-medium text-forest group-hover:text-white/90 flex items-center gap-1 transition-colors">
                  Open simulator
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </span>
              </Link>
            ))}
          </div>

          <p className="text-xs text-muted mt-3">
            Each model applies distinct assumptions for construction costs, revenue projections, and
            profit-sharing timelines.
          </p>
        </ContentCard>
      </div>
    </div>
  );
}

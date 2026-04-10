import { EditorialContentBlock } from "@/components/editorial-content-block";
import { MethodologyAccordion } from "@/components/methodology-accordion";
import { SectionIntro } from "@/components/section-intro";
import { methodologyNarrativeBlocks, warningCategories } from "@/data/mock/methodology";

export default function MethodologyPage() {
  return (
    <div className="page-shell py-10 md:py-14">
      <SectionIntro
        eyebrow="Methodology"
        title="A careful U.S. map for overlap, sequence, uncertainty, and missingness."
        body="toxinmap.com is a public-interest exploratory map. It compares how official records, emerging chemical context, wastewater pathways, PFAS site records, and legal pressure become visible through different institutions and on different timelines."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {methodologyNarrativeBlocks.map((block) => (
          <EditorialContentBlock
            key={block.title}
            eyebrow={block.eyebrow}
            title={block.title}
            body={block.body}
          />
        ))}
      </div>

      <div className="mt-10">
        <MethodologyAccordion />
      </div>

      <section className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="surface-panel p-6 md:p-8">
          <p className="eyebrow mb-4">How to read overlap</p>
          <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">
            Dense signal does not mean simple proof.
          </h3>
          <div className="mt-5 space-y-4">
            <p className="body-md">
              A dense area on the globe can mean that multiple public systems point at the same
              geography. It does not mean the product has established dose, mechanism, or
              causation.
            </p>
            <p className="body-md">
              A sparse area can reflect sparse monitoring, fragmented research coverage, or
              unresolved institutional blind spots. It should not be mistaken for a clean
              environment.
            </p>
          </div>
        </div>

        <div className="surface-panel p-6 md:p-8">
          <p className="eyebrow mb-4">Interpretation guardrails</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface-panel-soft p-4">
              <p className="text-sm text-white">Modeled air-toxics layers are screens.</p>
              <p className="mt-2 body-sm">
                They can help prioritize scrutiny, but they are not the same as direct personal
                exposure measurements.
              </p>
            </div>
            <div className="surface-panel-soft p-4">
              <p className="text-sm text-white">PFAS site maps are still incomplete.</p>
              <p className="mt-2 body-sm">
                Documented sites matter, but their absence does not prove absence of concern.
              </p>
            </div>
            <div className="surface-panel-soft p-4">
              <p className="text-sm text-white">Wastewater context is pathway context.</p>
              <p className="mt-2 body-sm">
                Wastewater and discharge layers help show plausible routes, not guaranteed health
                outcomes.
              </p>
            </div>
            <div className="surface-panel-soft p-4">
              <p className="text-sm text-white">Regulation can lag emerging science.</p>
              <p className="mt-2 body-sm">
                The map is designed to show that mismatch without filling the gap with false
                certainty.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionIntro
          eyebrow="Layer groups"
          title="Every group carries a different burden of proof."
          body="The map uses group framing to keep official registries, emerging research context, wildlife warning, reproductive context, and legal pressure legible without pretending they mean the same thing."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {warningCategories.map((category) => (
            <div key={category.key} className="surface-panel-soft p-5">
              <p className="eyebrow mb-3" style={{ color: category.accent }}>
                {category.title}
              </p>
              <p className="body-sm">{category.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 surface-panel p-6 md:p-8">
        <p className="eyebrow mb-4">What users should not infer</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="surface-panel-soft p-4">
            <p className="text-sm text-white">Not a direct personal exposure meter</p>
            <p className="mt-2 body-sm">
              The map does not claim to know each person&apos;s dose, body burden, or medical risk.
            </p>
          </div>
          <div className="surface-panel-soft p-4">
            <p className="text-sm text-white">Not a clean nationwide microplastics map</p>
            <p className="mt-2 body-sm">
              Plastic-associated chemicals remain literature-backed context, not a falsely precise
              household-scale layer.
            </p>
          </div>
          <div className="surface-panel-soft p-4">
            <p className="text-sm text-white">Not a causal engine</p>
            <p className="mt-2 body-sm">
              The map is designed to support careful scrutiny, not to automate causation claims.
            </p>
          </div>
          <div className="surface-panel-soft p-4">
            <p className="text-sm text-white">Not a complete monitoring inventory</p>
            <p className="mt-2 body-sm">
              Missingness and uneven public coverage remain part of the product logic and stay
              visible as real sources are added.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

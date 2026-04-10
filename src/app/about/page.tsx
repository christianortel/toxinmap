import { EditorialContentBlock } from "@/components/editorial-content-block";
import { SectionIntro } from "@/components/section-intro";
import { editorialBlocks } from "@/content/mock-data";

export default function AboutPage() {
  return (
    <div className="page-shell py-10 md:py-14">
      <SectionIntro
        eyebrow="About"
        title="A U.S.-first toxin globe built for careful public-interest investigation."
        body="toxinmap.com is framed as a practical map for exploring whether facility reporting, PFAS site records, wastewater pathways, modeled air-toxics screens, and research context appear to be concentrating around the same places."
      />
      <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="surface-panel p-6 md:p-8">
          <p className="eyebrow mb-4">Why this project exists</p>
          <p className="body-md">
            Environmental concern often becomes visible through fragments: facility reporting,
            water sampling, wastewater pathways, legal records, and research literature that were
            never designed to speak in one visual language.
          </p>
          <p className="mt-4 body-md">
            toxinmap.com is a concept build for holding those fragments apart while still letting
            them be read together.
          </p>
        </div>
        <div className="surface-panel-soft p-6">
          <p className="eyebrow mb-4">Core caution</p>
          <p className="font-serif text-3xl tracking-[-0.05em] text-white">
            The product is built for investigation, not mechanistic proof.
          </p>
          <p className="mt-4 body-sm">
            Every relevant surface distinguishes direct measurement, proxy, screening signal,
            literature evidence, and editorial case study.
          </p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {editorialBlocks.map((block) => (
          <EditorialContentBlock
            key={block.title}
            eyebrow={block.eyebrow}
            title={block.title}
            body={block.body}
          />
        ))}
      </div>
    </div>
  );
}

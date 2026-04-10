import { CaseStudiesGrid } from "@/components/case-studies-grid";
import { SectionIntro } from "@/components/section-intro";

export default function CaseStudiesPage() {
  return (
    <div className="page-shell py-10 md:py-14">
      <SectionIntro
        eyebrow="Case studies"
        title="Geographies where multiple public warning systems begin to converge."
        body="Each case study is structured as a careful editorial synthesis across place, sequence, sources, and evidence type. The goal is not to automate conclusions, but to make chronology, caveats, and overlap readable."
      />
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-panel-soft p-5">
          <p className="eyebrow mb-3">Structure</p>
          <p className="body-sm">Every file includes summary, methodology note, signals, findings, and source references.</p>
        </div>
        <div className="surface-panel-soft p-5">
          <p className="eyebrow mb-3">Tone</p>
          <p className="body-sm">The cases are written as restrained editorial synthesis rather than advocacy copy or certainty theater.</p>
        </div>
        <div className="surface-panel-soft p-5">
          <p className="eyebrow mb-3">Evidence</p>
          <p className="body-sm">Wildlife, reproductive context, and legal pressure stay visibly distinct from direct measurement.</p>
        </div>
        <div className="surface-panel-soft p-5">
          <p className="eyebrow mb-3">Future-ready</p>
          <p className="body-sm">Real reporting, documents, and source files can replace the mock narratives without changing the interface structure.</p>
        </div>
      </div>
      <CaseStudiesGrid />
    </div>
  );
}

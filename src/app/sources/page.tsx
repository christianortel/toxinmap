import { SectionIntro } from "@/components/section-intro";
import { SourcesRegistry } from "@/components/sources-registry";

export default function SourcesPage() {
  return (
    <div className="page-shell py-10 md:py-14">
      <SectionIntro
        eyebrow="Sources"
        title="A source registry built for auditability, caveats, and real ingest replacement."
        body="Each source entry tracks evidence support, spatial resolution, cadence, and whether toxinmap.com is ingesting the data directly, deriving map behavior from methodology, or using the source as a reference benchmark. That keeps the map ambitious without blurring provenance."
      />
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="surface-panel-soft p-5">
          <p className="eyebrow mb-3">Project rule</p>
          <p className="body-sm">
            toxinmap.com distinguishes direct measurement from proxy, screening signal, literature
            evidence, and editorial case study at the source level, not just in page copy.
          </p>
        </div>
        <div className="surface-panel-soft p-5">
          <p className="eyebrow mb-3">Replacement-ready</p>
          <p className="body-sm">
            Each registry entry is structured so EPA, ATSDR, and USGS ETL outputs can replace mock
            records later without a redesign of the sources page or the explorer drawer.
          </p>
        </div>
        <div className="surface-panel-soft p-5">
          <p className="eyebrow mb-3">Reference products</p>
          <p className="body-sm">
            Linked projects such as ProPublica ToxMap, EDF CEAM, Clear Collaborative, EWG, IPEN,
            and the Plastic Health Map are tracked explicitly as methodology or QA inputs rather
            than being treated as mysterious inspiration.
          </p>
        </div>
      </div>
      <SourcesRegistry />
    </div>
  );
}

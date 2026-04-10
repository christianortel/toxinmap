"use client";

import { methodologySections } from "@/data/mock/methodology";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function MethodologyAccordion() {
  return (
    <div className="surface-panel p-6 md:p-8">
      <Accordion type="single" collapsible className="w-full">
        {methodologySections.map((section) => (
          <AccordionItem key={section.title} value={section.title}>
            <AccordionTrigger>
              <div>
                <p className="eyebrow mb-2">{section.layerType}</p>
                <p className="text-xl text-white">{section.title}</p>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="surface-panel-soft p-4">
                  <p className="eyebrow mb-2">Measures</p>
                  <p className="body-sm">{section.measures}</p>
                </div>
                <div className="surface-panel-soft p-4">
                  <p className="eyebrow mb-2">Does not measure</p>
                  <p className="body-sm">{section.doesNotMeasure}</p>
                </div>
                <div className="surface-panel-soft p-4">
                  <p className="eyebrow mb-2">Caution</p>
                  <p className="body-sm">{section.caution}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {section.examples.map((example) => (
                  <div
                    key={example}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]"
                  >
                    {example}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

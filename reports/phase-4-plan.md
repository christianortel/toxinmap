# DOWNSTREAM Phase 4 Plan

## Final Polish Goals
- Tighten visual consistency across headings, panels, badges, chips, buttons, and section spacing.
- Refine the explorer layout and HUD so the globe remains dominant while controls and the drawer feel calmer, more intentional, and more usable on smaller screens.
- Improve navigation, responsiveness, focus treatment, and keyboard usability so the site feels complete rather than desktop-only.
- Refine copy and metadata presentation across the landing page, methodology, sources, about, and case-study pages.
- Clean up setup and handoff materials so the project is easy to run, understand, and present.

## Likely Files To Change
- `src/app/globals.css`
- `src/components/site-header.tsx`
- `src/components/site-footer.tsx`
- `src/components/hero-section.tsx`
- `src/components/filter-chip.tsx`
- `src/components/ui/button.tsx`
- `src/components/empty-state.tsx`
- `src/components/loading-skeleton.tsx`
- `src/components/explore/globe-shell.tsx`
- `src/components/explore/detail-drawer-shell.tsx`
- `src/components/explore/search-control-shell.tsx`
- `src/components/explore/layer-control-shell.tsx`
- `src/components/explore/map-legend-shell.tsx`
- `src/components/explore/timeline-shell.tsx`
- `src/app/page.tsx`
- `src/app/methodology/page.tsx`
- `src/app/sources/page.tsx`
- `src/app/about/page.tsx`
- `src/app/case-studies/page.tsx`
- `src/app/case-studies/[slug]/page.tsx`
- `README.md`
- `.env.example`

## Validation / QA Steps
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Manual smoke-check of copy, route hierarchy, and explorer state logic through code review after edits

## Cleanup And Documentation Tasks
- Remove leftover phase-language and placeholder-feeling copy where it weakens presentation quality.
- Fix any stray text encoding or metadata inconsistencies.
- Improve README framing, setup notes, route overview, and real-data integration guidance.
- Ensure environment variables and script expectations are clearly documented.

## Known Risks
- Explorer polish must not destabilize Cesium interaction or the stronger Phase 2-3 structure.
- Mobile navigation and drawer polish should remain lightweight rather than introducing a large new UI system.
- Visual consistency changes in global styles can have broad effects, so shared component refinements need to stay disciplined.

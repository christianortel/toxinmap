# DOWNSTREAM Phase 2 Plan

## Goals
- Turn `/explore` into the emotional and functional centerpiece of the product.
- Preserve the Phase 1 visual language and route architecture while upgrading the explorer into a richer atlas experience.
- Centralize explorer state so layer visibility, selection, hover, search, camera, timeline, legend, and drawer behavior are coordinated instead of scattered.
- Replace the thin demo-signal approach with a typed mock layer system that is structurally ready for real spatial data later.
- Improve Cesium interaction quality, camera behavior, drawer content density, and responsive HUD layout.

## Likely Files To Change
- `src/app/explore/page.tsx`
- `src/components/explore/*`
- `src/store/explore-store.ts` or a closely related replacement
- `src/content/mock-data.ts` and/or new explorer-specific data modules
- `src/app/globals.css`
- New files under:
  - `src/types/`
  - `src/lib/map/`
  - `src/content/`

## Risks / Unknowns
- Cesium + Resium interaction abstractions can become brittle if hover, selection, and camera transitions are mixed directly into UI components.
- Screen-space hover cards and clustering need to stay lightweight enough to avoid degrading performance.
- Mobile layout needs to remain usable without shrinking the globe into a secondary panel.
- Any Cesium-specific adjustments should avoid destabilizing the working webpack/Cesium asset setup established in Phase 1.

## Validation Steps
- Run `npm run lint`
- Run `npm run typecheck`
- Run `npm run build`
- Fix any new issues introduced during the refactor

## Dependencies To Review
- No new dependency is guaranteed yet.
- If local search quality needs a small helper library, add only if the current stack cannot support a clean lightweight implementation.
- Prefer solving clustering, legend logic, and transforms with the existing stack before adding packages.

## Notes
- Phase 1 styling and structure are worth preserving.
- If any Phase 1 choice changes, keep the change minimal and document the reason in the phase report.

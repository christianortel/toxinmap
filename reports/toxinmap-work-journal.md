# toxinmap.com Work Journal

## Current objective

Drive the project from a broader concept site into a U.S.-first toxin globe that feels useful immediately: search a place, locate yourself, inspect nearby toxic signals, and understand the source and evidence quality behind each layer.

## 2026-04-22 non-map entity activation slice

- Reconstructed current repo state from:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
  - current live `local:status`
- Confirmed the next real gap after the selected-drawer dismissal slice:
  - selected-record dismissal and nearby-focus dismissal were now coherent
  - but non-map entity activation still split into ad hoc paths
  - detail-drawer nearby headline result buttons only called `setSelectedEntityId(...)`
  - search-result entity activation only called:
    - `setSelectedEntityId(...)`
    - `setDrawerOpen(true)`
- Fixed that gap with a shared non-map focus reducer in:
  - `src/lib/map/entity-activation.ts`
  - added:
    - `resolveExplorerEntityFocusState(...)`
    - `EXPLORER_ENTITY_FOCUS_HEIGHT = 420000`
- Wired nearby headline-result activation to that reducer in:
  - `src/components/explore/detail-drawer-shell.tsx`
  - headline activation now:
    - selects the target entity
    - keeps the drawer open
    - sets selected-record camera target
- Wired search-result entity activation to that reducer in:
  - `src/components/explore/search-control-shell.tsx`
  - search activation now:
    - selects the target entity
    - opens the drawer coherently
    - preserves the current camera target when the search row does not carry geometry
- Extended the no-browser validator in:
  - `scripts/qa/validate-selection-context-contract.ts`
  - it now validates:
    - nearby headline activation focuses the map with canonical selected-record height
    - search entity activation without coordinates preserves the current camera target

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run local:verify`
- `npm run local:status`

### Measured result

- runtime remains healthy:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`
- readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- shared non-map activation now validates as:
  - nearby headline activation:
    - selected entity set
    - drawer open
    - camera target label set to the entity title
    - focus height `= 420000`
  - search entity activation without coordinates:
    - selected entity set
    - drawer open
    - current camera target preserved

### Learned

- The real remaining inconsistency was not another recovery path. It was activation paths outside the globe click flow.
- Nearby headline results and search results need the same contract boundary even though only one of them currently carries geometry.
- Preserving the current camera target is the correct truthful fallback when a search row does not yet carry coordinates. Fabricating a map move would be worse than leaving the focus where it is.

### Better next

- Enrich entity search results with coordinates so search-result activation can explicitly focus the map instead of preserving the current camera target by necessity.

## 2026-04-22 selected-record drawer dismissal slice

- Reconstructed current repo state from:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
  - current live `local:status`
- Confirmed the remaining gap after the drawer-side nearby camera-contract slice:
  - nearby-only dismissal already used the shared recovery reducer
  - selected-record dismissal still bypassed it
  - the top-right close button just called:
    - `setDrawerOpen(false)`
    - `setSelectedEntityId(null)`
  - `Escape` also bypassed the same recovery logic
- Fixed shared selected-record dismissal in:
  - `src/lib/map/selection-context.ts`
  - added `resolveDetailDrawerCloseState(...)`
  - selected-record drawer dismissal now shares the same reducer path as command-surface recovery
- Wired the live drawer to that shared contract in:
  - `src/components/explore/detail-drawer-shell.tsx`
  - top-right selected-record close now:
    - clears the selected entity
    - preserves nearby focus when present
    - restores nearby camera target when present
    - otherwise closes the drawer and clears stale selected-focus camera target
  - `Escape` now follows the same shared dismissal semantics instead of closing ad hoc
- Extended the no-browser validator in:
  - `scripts/qa/validate-selection-context-contract.ts`
  - it now validates:
    - selected drawer close with nearby focus
    - selected drawer close without nearby focus

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run local:verify`
- `npm run local:status`

### Measured result

- runtime remains healthy:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`
- readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- selected-record dismissal now validates as:
  - with nearby focus:
    - selected cleared
    - nearby focus preserved
    - nearby summary stays open
    - nearby camera target restored to `1250000` for the current `50 mi` focus
  - without nearby focus:
    - selected cleared
    - drawer closed
    - stale selected-focus camera target cleared

### Learned

- The previous slice fixed nearby-only dismissal truth, not full drawer dismissal truth.
- If selected close and nearby close use different recovery paths, the shell still drifts under normal use.
- The right boundary is one shared dismissal reducer for selected records too, not more direct component-level state mutation.

### Better next

- Unify non-map entity activation with the same shared focus contract:
  - search result activation
  - nearby headline result activation
  so non-map selections restore explicit focus intent instead of only selecting an entity id.

## 2026-04-22 drawer-side nearby camera-contract slice

- Reconstructed current repo state from:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
  - current live `local:status`
- Confirmed the remaining gap after the command-surface camera-recovery slice:
  - top command-surface actions already restored nearby camera intent coherently
  - drawer-side nearby controls still mutated focus ad hoc
  - nearby radius buttons only changed `nearbyFocus`
  - the nearby-only close button only nulled `nearbyFocus`
- Fixed the shared nearby-focus contract in:
  - `src/lib/map/selection-context.ts`
  - added `resolveNearbyFocusRadiusState(...)`
  - nearby radius changes now resolve through the same canonical camera-target heights
- Wired the drawer-side nearby controls to that shared contract in:
  - `src/components/explore/detail-drawer-shell.tsx`
  - nearby-only close now uses the same shared `clear-nearby` reducer path
  - nearby radius buttons now also update:
    - `cameraTarget`
    - `isCameraAtHome`
    - not only `nearbyFocus`
- Extended the no-browser validator in:
  - `scripts/qa/validate-selection-context-contract.ts`
  - it now checks:
    - `25 mi -> 850000`
    - `100 mi -> 1900000`
    - radius changes leave `isCameraAtHome = false`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run local:verify`
- `npm run local:status`

### Measured result

- runtime remains healthy:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`
- readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- drawer-side nearby controls now share the same canonical camera contract as the command surface:
  - `25 mi -> 850000`
  - `50 mi -> 1250000`
  - `100 mi -> 1900000`

### Learned

- The previous slice fixed command-surface truth, not full nearby-control truth.
- If nearby radius controls do not also restore camera intent, the UI still splits responsibility between shell and drawer in a way that drifts over time.
- The right boundary is one shared nearby-focus reducer path, not duplicating radius-to-height rules in multiple components.

### Better next

- Unify selected-record drawer close with the same recovery contract when nearby focus exists, so close behavior is as coherent as the command surface and nearby drawer controls.

## 2026-04-22 selection-context camera recovery slice

- Reconstructed current repo state from:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
  - current live `local:status`
- Confirmed the remaining gap after the shared recovery-state slice:
  - the command surface already had explicit context and actions
  - drawer/search state recovery was explicit
  - camera recovery was still implicit, so `clear-selection` and `return-nearby` could leave stale map focus semantics behind
- Fixed the shared recovery contract in:
  - `src/lib/map/selection-context.ts`
  - recovery actions now return explicit camera intent in addition to shell state
  - added canonical nearby camera targets by radius:
    - `25 mi -> 850000`
    - `50 mi -> 1250000`
    - `100 mi -> 1900000`
    - `>100 mi -> 2600000`
- Wired the live shell to honor that shared camera recovery in:
  - `src/components/explore/globe-shell-supported.tsx`
  - command-surface actions now update:
    - `cameraTarget`
    - `isCameraAtHome`
    - not only drawer/search/selection state
- Tightened the no-browser contract in:
  - `scripts/qa/validate-selection-context-contract.ts`
  - validator now checks:
    - `clear-selection` restores nearby camera target
    - `return-nearby` restores nearby camera target
    - `clear-nearby` clears stale camera target
    - `clear-search` preserves current camera target

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run local:verify`
- `npm run local:status`

### Measured result

- runtime remains healthy:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`
- readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- selection-context recovery now validates:
  - `clear-selection` restores nearby camera height `= 1250000` for the current `50 mi` focus
  - `return-nearby` restores the nearby focus target instead of only reopening the summary surface
  - `clear-nearby` clears stale camera target
  - `clear-search` preserves current camera target

### Learned

- The previous recovery slice fixed shell truth, not full interaction truth.
- Camera intent needs to be part of the same shared contract as selection/drawer/search state or the map will drift from the shell.
- The right implementation boundary is a shared reducer, not more special-case imperative camera code in the shell.

### Better next

- Unify drawer-side nearby controls with the same canonical camera-target contract:
  - nearby radius buttons
  - map-focus clear / return buttons

## 2026-04-22 selected-state clarity and linked detail slice

- Reconstructed current repo state from:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
  - current no-browser readiness output
- Confirmed the next real product gap after the click-target clarity slice:
  - local markers were easier to hit
  - but the selected marker still did not stand out enough from nearby markers
  - the detail drawer also made the user infer too much about whether it represented the currently selected marker or an indirect linked record
- Fixed selected-state clarity in:
  - `src/lib/map/globe-rendering.ts`
  - `src/components/explore/three-safe-globe.tsx`
  - `src/lib/map/detail-drawer-state.ts`
  - `src/components/explore/detail-drawer-shell.tsx`
- New selected-state behavior:
  - selected local markers now render with a dedicated outer beacon shell beyond the normal local halo
  - detail drawer header now exposes:
    - `Selected on map`
    - layer label
    - group label
    - selected / indirect data attributes
- Added a no-browser validator in:
  - `scripts/qa/validate-selected-state-contract.ts`
  - validates:
    - selected beacon exists
    - selected beacon radius > halo radius
    - unselected markers do not get the beacon
    - detail drawer header state correctly distinguishes selected vs indirect linkage

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selected-state-contract`
- `npm run local:verify`

### Measured result

- runtime remains healthy:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`
- release readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- current selected-state contract:
  - `selected beacon radius = 0.047`
  - `selected beacon opacity = 0.18`
  - `selected layer label = Wastewater`
  - `selected group label = Emerging`

### Learned

- Better clickability and better selected-state clarity are separate problems.
- The right fix was not more size inflation on the selected sphere.
- The selected state needed:
  - its own dedicated beacon layer
  - an explicit matching header state in the drawer

### Better next

- Improve cross-surface selection context so nearby/search-driven selection changes feel more clearly tied to the current map focus and selected marker, without reopening density explosion or using browser-launch validation.

## 2026-04-22 local click-target clarity and object-marker interpretation slice

- Reconstructed current repo state from:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
  - live validation state from the bounded local-density slice
- Confirmed the next real product gap:
  - focused local density was already fixed
  - close-range points were smoother
  - but nearby concrete markers still relied on almost bare spheres with nearly identical altitude and silhouette
  - that made close-range selection harder than it needed to be
- Fixed the local object-marker contract in:
  - `src/lib/map/globe-rendering.ts`
  - `src/components/explore/three-safe-globe.tsx`
- New local object behavior:
  - visible halo shell around the concrete sphere
  - larger transparent hit shell for easier clicking
  - stack-separated altitudes for nearby concrete markers in the same close-range bucket
- Kept the existing density and source-truth behavior unchanged:
  - no reopening of the local tail
  - no browser-launch validation
  - no change to click-preservation rules
- Tightened the no-browser validator in:
  - `scripts/qa/validate-local-marker-rendering.ts`
  - new assertions cover:
    - halo > core
    - hit shell > halo
    - selected halo stronger than unselected
    - nearby local object stack offsets are distinct

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-local-marker-rendering`
- `npm run local:verify`

### Measured result

- runtime remains healthy:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`
- release readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- current local marker clarity contract:
  - `core radius = 0.024`
  - `selected radius = 0.028`
  - `halo radius = 0.035`
  - `hit radius = 0.045`
  - nearby local object stack offsets:
    - `local-point -> 0`
    - `local-point-sibling -> 1`

### Learned

- Smooth geometry fixed the ugly close-range shape problem, but it did not fully solve click clarity.
- The real remaining issue was interaction affordance:
  - visible sphere size
  - actual click target size
  - nearby-object separation
- Those need to be treated as explicit rendering contracts, not incidental side effects of sphere radius.

### Better next

- Improve selected-marker emphasis and its relationship to the detail surface without reopening density explosion or reintroducing browser-launch validation.

## 2026-04-22 focused local density contract slice

- Reconstructed current repo state from:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
  - live `npm run local:status`
- Confirmed the next real product defect after the object-marker slice:
  - close-range geometry was better
  - focused local views were still dumping the full local tail
  - Cape Fear local still showed `874` visible rows, which is not usable as a GPS-like inspection surface
- Fixed local density in:
  - `src/lib/map/entity-transforms.ts`
  - focused local output no longer returns the entire filtered local set
  - the selector now preserves the opening investigation mix, then caps the long tail by layer
- Added same-site local dedupe in:
  - `src/lib/map/entity-transforms.ts`
  - uniqueness key uses:
    - layer
    - normalized title
    - lon/lat rounded to `3` decimals
  - dedupe now applies to:
    - `industrial-sites`
    - `wastewater-sites`
    - `hazardous-sites`
    - `power-plants`
    - `legal-markers`
- Enforced the local caps:
  - total visible max `= 160`
  - industrial `= 72`
  - wastewater `= 56`
  - pfas `= 10`
  - hazardous `= 8`
  - legal `= 4`
  - power `= 4`
  - air / reproductive / sentinel `= 1`
- Added a no-browser validator in:
  - `scripts/qa/validate-local-density-contract.ts`
  - validates:
    - local visible count is bounded
    - layer caps are respected
    - PFAS / wastewater / industrial still survive in the top ten
    - same-site duplicates are removed
- Wired that validator into:
  - `package.json`
  - `scripts/local/verify.ps1`
- Bumped persistent atlas cache semantics in:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v32`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-local-density-contract`
- `npm run qa:validate-zoom-drilldown`
- `npm run qa:validate-interaction-contract`
- `npm run local:verify`

### Measured result

- current runtime:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`
- local readiness:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- focused local Cape Fear now returns:
  - `visible = 96`
  - `industrial-sites = 72`
  - `wastewater-sites = 19`
  - `pfas-sites = 3`
  - `legal-markers = 1`
  - `air-toxics-regions = 1`
- focused local top ten still include:
  - PFAS
  - wastewater
  - industrial

### Learned

- The remaining clutter problem was not the close-range geometry anymore.
- It was:
  - unlimited local tail size
  - same-site duplicate variants
- A stale live process initially made the API appear unchanged, but the selector logic itself was already correct.
- The right next step is not more density tuning. It is better local click-target clarity and point interpretation on top of the new bounded local set.

### Better next

- Improve local click-target clarity and point interpretation without reopening density explosion or violating the no-browser validation constraint.

## 2026-04-22 no-browser readiness + close-range object markers slice

- Reconstructed current repo state from:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
  - live `npm run local:status`
- Confirmed the stale blocker state before editing:
  - continuity still claimed browser-launch validation and `dev-managed` runtime were active blockers
  - live repo truth was already:
    - `runtimeMode = prod-start`
    - `listenerPid = managedPid`
    - `readyForFullLocalStack = true`
- Preserved the user’s hard constraint:
  - do not launch installed browsers
  - do not open desktop tabs/windows for validation
- Kept automated readiness on the no-browser path and moved the next real product slice to close-range rendering quality.
- Added a dedicated render-contract helper in:
  - `src/lib/map/globe-rendering.ts`
  - local concrete points now split onto a smooth object layer
  - local aggregates and broad context stay on the point layer
  - local sphere radius and detail now scale with zoom in a bounded way
- Updated the live Three.js renderer in:
  - `src/components/explore/three-safe-globe.tsx`
  - local concrete point records now render as smooth sphere objects
  - broad-band and contextual layers still render through the point layer
  - click handling is preserved on both paths
- Added a no-browser validator in:
  - `scripts/qa/validate-local-marker-rendering.ts`
  - verifies:
    - local point/object split
    - selected-vs-unselected local radius
    - close-vs-far sphere detail
- Wired that validator into:
  - `package.json`
  - `scripts/local/verify.ps1`
- Reconciled continuity to the real current state after verification.

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:up`
- `npm run local:status`
- `npm run qa:validate-local-marker-rendering`
- `npm run local:verify`

### Measured result

- current runtime:
  - `listenerPid = managedPid = 7964`
  - `runtimeMode = prod-start`
- release readiness:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- current local marker render contract:
  - `localObjectEntities = 1`
  - `localPointEntities = 2`
  - `closeRadius = 0.024`
  - `selectedRadius = 0.028`
  - `farLocalRadius = 0.025`
  - `closeDetail = 20`
  - `farDetail = 14`

### Learned

- More camera tuning would not have solved the screenshot failure by itself.
- The real defect was primitive choice:
  - close-range concrete records were still cylinders
  - cylinders stay visually crude no matter how much the camera math improves
- The right boundary is:
  - broad-band/context = point layer
  - close concrete records = object layer
- Hardcoded blocker state in continuity is dangerous; runtime truth has to be refreshed from live status before picking the next task.

### Better next

- Improve close-zoom local density and click-target clarity now that the local marker geometry is no longer the limiting factor.

## 2026-04-17 opening air-toxics quality slice

- Reconstructed current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the live `3000` runtime before editing.
- Verified the real remaining contextual defect:
  - opening `legal-markers` were already fixed and cluster-truthful
  - opening `air-toxics-regions` still included weak rows such as `MILWAUKEE, WI` with `Legal overlap = 0`
- Fixed broad-band air quality in `src/lib/map/entity-transforms.ts`:
  - air rows still score on TRI density, legal overlap, cluster size, and source mix
  - opening air rows now also pass a hard quality gate:
    - `epa-echo` required
    - `Legal overlap >= 50` required
- Bumped opening-atlas cache semantics to:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v31`
- Tightened `scripts/qa/validate-home-atlas-cache.ts` so the opening atlas now fails if:
  - any air-toxics region lacks `epa-echo`
  - any air-toxics region lacks legal overlap
  - any air-toxics region falls below the strong-overlap floor

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`

### Learned

- score tuning alone was not enough for opening air quality
- the correct rule is a hard product gate: broad-band air context must carry meaningful legal/regulatory overlap
- it is acceptable for the opening atlas to show `5` stronger air rows instead of `6` mixed-quality rows

### Better next

- Decide whether the opening atlas should stay at `5` high-quality `air-toxics-regions` or reserve a sixth slot only if another region can meet the same quality bar.

## 2026-04-17 opening legal-context quality and verify-truthfulness slice

- Reconstructed current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the live `3000` runtime before editing.
- Verified the real remaining context defect:
  - opening `legal-markers` were still broad clusters, but their visible signals were leaking bland representative metadata such as `FRS registry match`
  - opening `air-toxics-regions` were already reasonably useful, so legal quality was the first fix
- Fixed opening legal quality in `src/lib/map/entity-transforms.ts`:
  - legal broad-band scoring now boosts stronger legal rows before clustering
  - cluster representative replacement now uses broad-band focus quality
  - legal clusters now expose:
    - `Aggregated legal markers: N`
    - optional max federal case count
    - wastewater-linked legal context
    - air-toxics-linked legal context
- Bumped opening-atlas cache semantics to:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v28`
- Tightened `scripts/qa/validate-home-atlas-cache.ts` so the opening atlas now fails if:
  - legal markers do not expose cluster-level context
  - fewer than `4` legal markers are materially aggregated
  - no opening legal marker carries wastewater-linked legal context
- Found and fixed a separate runtime truth bug:
  - all `local:verify` subchecks were passing
  - but the final readiness summary could still falsely report ETL mode because it read flattened `local:status` health as if it were raw `/api/health`
- Fixed that in:
  - `scripts/local/verify.ps1`
  - `scripts/local/status.ps1`
  - `local:verify` now normalizes both raw and flattened health shapes
  - `local:status` now also includes `preferredDerivedLayerSource`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:status`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`

### Learned

- The legal quality issue was not density. It was representative semantics inside broad-band clustering.
- Runtime verification needs the same schema discipline as product data paths. Flattened summary shapes must not silently drift from raw API shapes.
- The next real product task is narrower now:
  - reassess `air-toxics-regions` quality inside the corrected opening atlas without regressing the now-correct legal cluster contract.

## 2026-04-17 PFAS opening-atlas direct-point preservation slice

- Reconstructed current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the live `3000` atlas before editing.
- Verified the remaining PFAS opening defect:
  - the opening regional atlas had already fixed source-family concentration, chemistry quality, and exact-coordinate duplication
  - but one PFAS slot was still consumed by an ATSDR aggregate cluster even though direct ATSDR point rows existed
- Fixed the broad-band PFAS preserve path in `src/lib/map/entity-transforms.ts`:
  - chemistry-rich PFAS boosts remain in place
  - ATSDR PFAS rows now get direct-point preservation before clustering at national and regional bands
  - PFAS aggregate rows now take an additional broad-band penalty so they stop beating source-backed point rows for opening-atlas slots
- Bumped persistent atlas cache semantics to:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v23`
- Tightened `scripts/qa/validate-home-atlas-cache.ts` so the opening atlas now fails if:
  - any PFAS aggregate marker survives into the opening atlas
  - chemistry-rich PFAS density drops
  - source-family diversity regresses
- Hardened `scripts/qa/validate-browser-interactions.ts` with a Windows fallback browser path:
  - if Playwright hits `spawn EPERM` on the bundled launcher, it retries with installed Chrome / Edge / Brave

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:seed:home-atlas -- --force`
- `npm run local:up`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`

### Learned

- The remaining PFAS atlas defect was not a ranking-weight issue alone.
- ATSDR PFAS rows were still being clustered too early, before the opening atlas ever had a chance to choose them as direct points.
- The right fix was the pre-cluster preservation step, not more chemistry weighting.

### Better next

- Reassess whether the opening atlas should reserve one bounded `hazardous-sites` slot without weakening the current:
  - concrete-first opening mix
  - actionable NPDES wastewater path
  - PFAS direct-point-only opening slice

## 2026-04-17 PFAS opening-atlas geographic diversity slice

- Added regional PFAS diversity caps to the real opening-atlas balancing path in `src/lib/map/entity-transforms.ts`.
- Bumped persistent atlas cache namespace to `schema-v16`.
- Hardened `scripts/qa/validate-home-atlas-cache.ts` so the opening atlas now enforces:
  - at least `4` PFAS regional diversity buckets
  - no PFAS regional bucket larger than `3` markers
- Verified opening atlas on `3000`:
  - `visible = 49`
  - `industrial-sites = 17`
  - `pfas-sites = 10`
  - `wastewater-sites = 8`
  - `legal-markers = 8`
  - `air-toxics-regions = 6`
  - PFAS buckets:
    - `-96,32 = 3`
    - `-88,40 = 2`
    - `-96,40 = 3`
    - `-104,40 = 2`
- What changed in understanding:
  - the right enforcement point is the full opening atlas, not isolated PFAS-only debug queries
  - geographic PFAS monopolization is now reduced, but source-family concentration remains
  - runtime truthfulness still needs attention because `status.ps1` drifted from the actual live listener state

## 2026-04-17 runtime truthfulness and DB client exhaustion slice

- Fixed listener truthfulness in `scripts/local/common.ps1` by adding a `netstat` fallback when `Get-NetTCPConnection` fails or returns nothing.
- Hardened `scripts/local/verify.ps1` so verification now fails if status cannot report a live `3000` listener while health checks pass.
- Found the deeper runtime defect:
  - the app could silently degrade into ETL-backed behavior because repeated Postgres client creation in the runtime hit `too many clients already`
- Fixed that in `src/db/client.ts` with a bounded global Postgres singleton:
  - `max = 4`
  - `idle_timeout = 20`
  - `connect_timeout = 10`
  - `prepare = false`
- Verified after clean restart:
  - `local:status` reports `listenerPid = managedPid = 24504`
  - `runtimeMode = prod-start`
  - `db:status` succeeds again
  - `local:verify` is fully green again
  - `/api/layers` again reports:
    - `air-toxics-regions = database`
    - `reproductive-regions = database`
    - `sentinel-species = etl-file`
- What changed in understanding:
  - the status bug was real, but it was not the whole problem
  - the real systemic defect was DB client exhaustion causing silent truth drift
  - fixing listener reporting without fixing the client lifecycle would not have been sufficient

## 2026-04-16 legal home-atlas truthfulness slice

- Reconstructed the current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the live `3000` runtime instead of trusting the stale `legal-markers = 2` assumption.
- Measured the real legal path before editing:
  - raw DB legal rows in `health_concern_context` were not sparse
  - the broad-band home atlas was under-serving legal context because DB legal rows were being filtered out by the year model and mock / ETL legal rows were still mixing back into the visible atlas
- Fixed legal DB year semantics in `src/lib/data/repository.ts`:
  - DB legal rows now use the legal case year parsed from the ECHO legal slug/title
  - broad-band legal query ordering now prioritizes recent legal case years
- Fixed visible-atlas source precedence in `src/lib/data/repository.ts`:
  - ETL legal supplement rows are still allowed as context inputs for derived layers
  - they no longer render as visible `legal-markers` once DB legal is active
  - mock fallback is now suppressed per layer in `getMapBaseEntities`, not only in the merged atlas
- Bumped the persistent home-atlas cache namespace to `schema-v4` in `src/lib/data/map-entities-cache.ts` so the stale mixed legal atlas could not survive the new selection logic.
- Tightened `scripts/qa/validate-home-atlas-cache.ts` so it now asserts:
  - at least `4` legal markers in the broad-band home atlas
  - `epa-echo` lineage on visible legal markers
- Fixed validator truthfulness beyond the legal layer:
  - `scripts/qa/validate-zoom-drilldown.ts` now matches the real current drilldown contract
  - `src/components/explore/globe-shell-supported.tsx` and `scripts/qa/validate-browser-interactions.ts` now select a real currently visible PFAS entity in the hidden e2e bridge instead of a dead hardcoded ID

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:seed:home-atlas -- --force`
- `npm run local:down`
- `npm run local:up`
- `npm run qa:validate-home-atlas-cache`
- `npm run qa:validate-live-api`
- `npm run qa:validate-zoom-drilldown`
- `npm run qa:validate-browser-interactions`
- `npm run local:verify`

### Learned

- The legal density issue was not DB sparsity. It was visibility-model drift:
  - wrong year semantics
  - ETL legal supplement mix-back
  - mock legal fallback mix-back
- Hidden browser controls need the same source-truth discipline as the public UI. Hardcoded dead IDs make validators lie.
- The next real product gap is no longer broad-band legal density. It is local PFAS visibility in the focused investigation path.

### Better next

- Reconcile the current local PFAS gap in the Cape Fear / Chemours investigation path.
- Decide whether the missing local PFAS point is a DB coverage issue, a prioritization issue, or a layer-precedence issue, then fix that without regressing the corrected legal home atlas.

## 2026-04-16 power / hazard DB cutover slice

- Reconstructed the current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the live `3000` runtime.
- Verified the actual blocker before editing:
  - `power_plants` and `hazardous_sites` tables existed in schema
  - both tables were still empty in Postgres
  - the live atlas was therefore still serving those layers from ETL / mock context
- Added real Postgres loaders in `scripts/etl/loaders/postgres.py`:
  - `replace_power_plants(...)`
  - `replace_hazardous_sites(...)`
- Extended `scripts/db/load-transformed-rows.py` so it now derives national `power-plants` and `hazardous-sites` load rows from transformed FRS rows, enriched by transformed TRI and ECHO context.
- Fixed one infrastructure issue discovered during the slice:
  - Python loader connections were stalling because `psycopg.connect(...)` had no timeout
  - added `connect_timeout=10` in `scripts/etl/loaders/postgres.py`
- Loaded the new tables successfully:
  - `powerPlants = 188`
  - `hazardousSites = 1506`
- Extended `scripts/db/check-db.ts` and repository health counts so the live stack can report those supplemental DB-backed layer counts.
- Fixed merged-atlas truthfulness in `src/lib/data/repository.ts`:
  - mock fallback is now suppressed for any layer that already has a preferred real source
  - removed the last stray fallback records from the live power / hazard layers
- Updated `scripts/qa/validate-live-api.ts` so:
  - `power-plants` must resolve from `database`
  - `hazardous-sites` must resolve from `database`
  - standalone validation targets `http://127.0.0.1:3000`
  - standalone validation waits for `/api/health`
  - nearby validation uses a radius that still truthfully includes legal/regulatory pressure after the new source mix

### Validation

- `python -m py_compile scripts/db/load-transformed-rows.py scripts/etl/loaders/postgres.py`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `python -u scripts/db/load-transformed-rows.py --skip-industrial --skip-pfas --skip-wastewater --skip-health-context`
- `npm run db:status`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `npm run qa:validate-live-api`
- `npm run local:verify`

### Learned

- The blocker was not precedence logic. It was simply that the dedicated DB tables had never been populated.
- The transformed FRS rows already carried enough metadata to seed credible DB-backed `power-plants` and `hazardous-sites` once TRI and ECHO context were merged back in.
- Mock fallback suppression has to be layer-wide once a real source wins, or single placeholder records silently undermine the trustworthiness of a now-DB-backed layer.

### Better next

- Reassess broad-band legal marker density now that the supplemental DB-backed layers are real.
- Only widen the broad-band atlas if the additional legal context is source-truthful and does not degrade the current home-atlas mix.

## 2026-04-16 persistent home atlas cache slice

- Reconstructed current state from the continuity files and live runtime instead of trusting stale startup assumptions.
- Confirmed the remaining performance gap was no longer the first live home atlas request itself.
- The real problem was that the fast path still depended on a post-start HTTP prewarm or an expensive reseed after every build.
- Added persistent cache helpers in:
  - `src/lib/data/map-entities-cache.ts`
- Added a deterministic cache seed path in:
  - `scripts/local/seed-home-atlas-cache.ts`
- Updated `src/app/api/map-entities/route.ts` so the live route now:
  - checks in-memory cache first
  - then checks persistent disk cache
  - then computes and writes the cache on miss
- Updated `scripts/local/up.ps1` so managed startup now:
  - seeds the public home atlas cache before app start
  - no longer issues a post-start `/api/map-entities` HTTP prewarm
- Fixed an important design mistake during the slice:
  - initial build-scoped cache namespacing forced a full reseed after every build
  - switched to a stable `schema-v1` namespace
  - added legacy cache adoption so existing build-scoped cache files are promoted automatically
- Added a new validator:
  - `scripts/qa/validate-home-atlas-cache.ts`
- Folded that validation into:
  - `scripts/local/verify.ps1`
- Hardened `scripts/qa/validate-browser-interactions.ts` again so it uses realistic navigation timeouts for fresh local runs.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:seed:home-atlas`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `npm run qa:validate-home-atlas-cache`
- `npm run qa:validate-zoom-drilldown`
- `npm run qa:validate-browser-interactions`
- `npm run local:verify`

### Learned

- The right fix was not another startup HTTP warm step. It was a persistent cache the live route can read immediately.
- Build-scoped cache invalidation was too aggressive for local runtime ergonomics because `local:up` rebuilds frequently.
- Verification had to expand with the runtime change. The new cache path was not complete until a fresh-process first request and browser flow both passed.

### Better next

- Reduce the raw cost of creating the home atlas cache when it is missing instead of relying on the current persistent cache reuse path.
- Then move back to expanding DB-backed coverage for the remaining mixed-source non-core layers.

## 2026-04-16 runtime truthfulness + warm atlas performance slice

- Reconstructed current state from the repo continuity files and live runtime instead of trusting stale docs.
- Confirmed the real runtime defect:
  - `local:status` could report a healthy app while `local:verify` false-failed on `/api/health`
  - `managedPid` could drift away from the real port `3000` listener
- Fixed runtime truthfulness in:
  - `scripts/local/common.ps1`
  - `scripts/local/up.ps1`
  - `scripts/local/status.ps1`
- Runtime changes:
  - health polling now uses realistic request timeouts and retries
  - the managed app PID now resolves to the active `3000` listener
  - shutdown now stops the real Next.js parent/child process tree instead of a single stale PID
- Identified the deeper performance issue:
  - `/api/map-entities` was slow because merged atlas entities were being rebuilt too often and visible-entity queries had no route-level cache
- Fixed warm atlas performance in:
  - `src/lib/data/repository.ts`
  - `src/app/api/map-entities/route.ts`
  - `scripts/local/up.ps1`
- Performance changes:
  - merged atlas cache TTL increased from `2s` to `30s`
  - `/api/map-entities` now caches parsed-query results for `30s`
  - `local:up` now warms `/api/entities` and the default home `map-entities` query after startup
- Hardened validators:
  - `scripts/qa/validate-browser-interactions.ts` now uses realistic browser wait windows
  - `scripts/qa/validate-entity-cache-refresh.ts` now validates temp-row appearance/disappearance rather than assuming the whole industrial count is otherwise static

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `npm run local:verify`
- `npm run qa:validate-entity-cache-refresh`

### Learned

- The runtime wrapper was less trustworthy than the app itself at the start of this slice.
- A `2s` merged entity cache TTL was too aggressive for a large DB-backed atlas and effectively turned every visible-entity query back into a cold path.
- Warm-path responsiveness matters for real use, but the next performance milestone is still cold-start visible-entity generation because startup warming is currently carrying too much load.

### Better next

- Reduce the raw cold-start cost of merged-entity generation so `local:up` does not need heavy startup warming to feel responsive.
- Then return to expanding DB-backed coverage beyond the core layers without regressing the now-passing runtime and browser validation path.

## Done

- Rebranded the active product surface to `toxinmap.com`.
- Made `/` the main map product and kept `/explore` as the same globe experience.
- Simplified the main HUD around search, geolocation, nearby results, layers, legend, timeline, reset/home, and detail drawer.
- Added `/api/geocode` using the U.S. Census geocoder.
- Added `/api/nearby` for grouped nearby-signal summaries around map targets.
- Added URL-restorable nearby focus state and camera targeting.
- Retuned the globe to a U.S.-first camera.
- Added denser fallback U.S. toxin-oriented entities for PFAS, air-toxics context, wastewater/pharma context, and plastics-related literature zones.
- Expanded source records to include origin site, upstream datasets, downloadability, and ingestion method.
- Updated the source UI to show acquisition-path metadata.
- Updated the source bootstrap path so source-registry seeds can refresh existing rows instead of only inserting once.
- Added schema and migration support for source-registry lineage fields.
- Updated SQL-first schema notes so they match the current source-registry model.
- Retuned timeline and methodology-support copy away from older atlas-era wording.
- Refreshed README, sources, methodology, and about copy to match the toxinmap.com product.
- Repaired smoke coverage for the new APIs and main globe route.
- Added a first real PFAS ETL slice through `ingest_atsdr_pfas.py` and `ingest_usgs_pfas.py`.
- Added reusable ArcGIS and geocoding helpers for public-source ingestion.
- Added `load_pfas_sites(...)` support in the ETL loader path.
- Updated ETL scripts and docs so PFAS joins the real-data cutover queue instead of staying only in mock content.
- Verified the live repository/API path already reads `pfas_sites` when `DATABASE_URL` is present.
- Improved location UX with explicit search, geolocation, nearby-loading, and nearby-error feedback in the map shell and drawer.
- Added a real EPA wastewater slice through `ingest_npdes_wastewater.py`.
- Added `load_wastewater_sites(...)` support so NPDES wastewater context can land in the live `wastewater_sites` table.
- Added EPA NPDES and EPA biosolids source-registry entries plus ETL script wiring and docs.
- Hardened ZIP download handling for large EPA archives so corrupt or partially cached downloads self-repair on rerun.
- Added a dedicated no-visible-signals overlay so aggressive layer/filter combinations explain themselves instead of making the globe feel broken.
- Added a real USGS pharmaceutical research slice through `ingest_usgs_pharma.py`.
- Wired the pharma ingest into scripts and ETL docs and connected it to the existing wastewater-context surface as explicit research evidence.
- Added local database scaffolding through [compose.yaml](C:/Users/chris/Toxin-Environment-Map/compose.yaml), [check-db.ts](C:/Users/chris/Toxin-Environment-Map/scripts/db/check-db.ts), and [load-us-mvp.ps1](C:/Users/chris/Toxin-Environment-Map/scripts/db/load-us-mvp.ps1).
- Updated the main README and environment defaults so the real-data path is easier to follow locally.
- Removed the stale atlas-versus-stories mode plumbing from explorer types, store state, URL state, filtering, and QA links.
- Folded the old `warning-stories` layer back into the main legal/context layer so the fallback map behaves more like a single toxin globe instead of a split editorial product.
- Upgraded nearby-result ranking so the API now prioritizes closer, more credible toxin signals instead of returning a distance-only list.
- Added headline nearby signals, evidence-mix summaries, and 25/50/100-mile radius controls to the search shell and drawer so “what is near me?” behaves more like a real map tool.
- Added a real `npm run data:validate` integrity pass for sources, entities, case studies, layer references, and active-source lineage metadata.
- Filled missing lineage metadata on remaining active source records and fixed duplicate fallback entity slugs surfaced by the validator.
- Added nearby source-family summaries so the map now explains which source systems are driving the current local view.
- Added nearby theme summaries and short interpretation lines so the local view now explains whether an area is dominated by downstream, drinking-water, litigation, community-pressure, wildlife, or fertility-context signals.
- Added nearby contaminant and pathway family summaries so local areas now read as PFAS-heavy, wastewater-heavy, air-toxics-heavy, petrochemical, plastics-context, pharmaceutical, legacy-hazard, or power/combustion heavy when the signal mix supports it.
- Replaced nearby signal-family heuristics with an explicit typed `signalFamilies` model on explorer entities, database adapters, and validation.
- Added signal-family badges to hover cards so the globe surface exposes the same typed concern model used by nearby summaries.
- Propagated explicit `signalFamilies` into the real ETL/load metadata for PFAS, wastewater/pharma, TRI, FRS, and ECHO slices.
- Hardened `industrial_sites` upserts so mixed FRS/TRI/ECHO loads now merge tags, source ids, metadata, and signal-family arrays instead of overwriting earlier context wholesale.
- Added shared ETL load-row validation so TRI, FRS, ECHO, PFAS, wastewater, and pharma jobs now fail early on malformed enums, coordinates, source lineage fields, or missing signal-family metadata before any future DB load.
- Switched FRS and ECHO onto ZIP-integrity recovery and tightened FRS limit-mode iteration so one-row dry runs no longer require a full national crosswalk parse after download.
- Added an offline ETL fixture-validation script so representative industrial, release, PFAS, wastewater, and legal-context rows can be checked without hitting live federal endpoints.
- Added typed `chemicalMarkers` across explorer entities, nearby summaries, fallback content, ETL metadata, and validation so the map can talk about PFAS, pharmaceuticals, petrochemical volatiles, chlorinated solvents, plasticizers, metals, combustion pollutants, and wastewater indicators explicitly.
- Hardened `industrial_sites` upserts again so `chemicalMarkers` now merge across mixed FRS/TRI/ECHO source slices the same way `signalFamilies` already do.
- Added explicit `chemicalHighlights` across fallback entities, nearby summaries, hover cards, detail badges, ETL metadata, and validation so the map can surface named compound spotlights when the source actually supports them.
- Added chemical-aware atlas search so named compound queries like PFOS, PFOA, GenX, benzene, or carbamazepine now resolve to relevant map entities with explicit match context instead of behaving like plain place search.
- Consolidated chemistry and signal-family vocabulary into a shared module so search, nearby summaries, hover cards, and drawer badges all use the same labels and chemistry matching rules.
- Added quick-search compound pills for PFAS, PFOA, PFOS, GenX, benzene, vinyl chloride, phthalates, and carbamazepine so the main globe surface exposes the toxin language directly instead of forcing users to guess search terms.
- Cleaned chemistry and nearby separators into a consistent ASCII format so the map no longer shows shell-encoding artifacts in search and summary surfaces.
- Added URL persistence for the active search query so shared toxinmap.com links can preserve the chemical or place search that produced the current globe view.

## Learned

- The fastest way to degrade this product is to let search behave like a visibility filter. A toxin map needs search to act as navigation first.
- Rich source metadata only matters if it survives the full chain: typed model -> DB seed -> repository -> API -> UI.
- Supporting docs and SQL notes drift faster than UI code during fast iteration; they need explicit cleanup passes, not just incidental updates.
- Runtime smoke checks must assert stable server-rendered signals, not client-only hydrated control text.
- When route files are replaced, `.next/types` can temporarily drift until a clean build regenerates them. Rebuilding before the final typecheck avoids false alarms.
- The user’s product instinct is consistently map-first and utility-first. Whenever a choice drifts toward “microsite” behavior, bias back toward the globe.
- Official public dashboards can often be converted into defensible ETL inputs if the underlying ArcGIS or ScienceBase services are discovered and documented instead of scraped visually.
- Some federal PFAS surfaces still require careful coordinate inference or layer discovery. That needs to be explicit in metadata, not hidden.
- UX trust improves quickly when location actions explain what the app is doing instead of only spinning silently.
- Large federal ZIP downloads need integrity recovery built in; otherwise one interrupted archive can silently break later ETL runs on Windows.
- Filtering official wastewater downloads is essential because the raw NPDES outfalls layer is dominated by construction and stormwater records that would drown the map in low-value noise.
- Empty visual states on a map need explanation and recovery actions, not just absence.
- Research-heavy contaminant datasets are more useful as site-level summaries than analyte-level globe markers. Summaries keep the map readable without flattening scientific nuance.
- Federal CSV releases still vary in encoding quality, so ETL readers need graceful fallbacks for real-world public files.
- Operational adoption matters. ETL and repository code are only half-done if the local DB path is unclear or too manual to follow reliably.
- Dead product branches survive longer than expected unless URL state, smoke tests, and fallback content are cleaned at the same time as the visible UI.
- Nearby results feel significantly better once ranking considers evidence class and confidence, not just distance.
- A validation script that can fail on real content drift is more valuable than extra prose about rigor. The duplicate-slug catch proved that immediately.
- Nearby summaries become more trustworthy when they expose source-family lineage, not just counts and distances.
- Nearby results become easier to read once the product explains the local concern pattern in plain thematic language rather than only in layer IDs and raw counts.
- Nearby summaries become even more useful once they describe contaminant families and pathways instead of only evidence classes and source systems.
- Heuristics are useful for bootstrapping, but once they shape visible product language they should be replaced by explicit typed content as quickly as possible.
- Loader merge behavior matters just as much as ETL extraction. Good source slices can still degrade the atlas if later upserts overwrite earlier context instead of composing with it.
- Real ETL confidence improves once normalized rows are treated as a contract. Validation at the job boundary is more reliable than trusting each script to remember the same shape rules.
- Some federal archive endpoints fail in ways that look like parsing bugs at first. Verifying the cached artifact itself prevents wasting time debugging downstream code that never had a valid input.
- Fast fixture-based checks are worth adding once a shared validator exists. They keep ETL contract regressions testable even when live federal sources are slow or unavailable.
- When a concept becomes visible product language, it needs a first-class field all the way through the stack. `chemicalMarkers` became useful only once it stopped being implicit in copy and started being typed in content, ETL, API, and UI together.
- Fallback data needs the same rigor as live data contracts. A typed chemistry mapping caught the exact place where loose inference was still hiding in mock content.
- Named compounds need stricter discipline than pathway families. It is fine to show broad chemistry markers everywhere, but named chemical spotlights should only appear where the source can support them or where the fallback case-study model is deliberately editorial.
- Search quality improves once the atlas can explain why something matched. Chemical queries are only useful if the result tells the user whether they matched a named compound, a chemistry family, a location, or a general entity label.
- Shared product language matters. If chemistry labels are duplicated across search, repository summaries, and badges, they drift quickly and the product starts sounding less trustworthy than the data model behind it.
- Quick toxin-search entry points make the globe feel more map-first and purposeful than a generic empty search box.
- Search is part of the state model, not just a transient input field. If it changes the user’s view, it should usually survive refresh and sharing.

## Better next

- Keep checking whether each new feature makes the main map more immediately useful.
- Prefer small, complete loops over broad partial additions.
- Validate after each subsystem, not only at the end.
- Keep the source lineage story strict; avoid any silent downgrade from direct ingest to vague reference.
- When a dataset is only partly spatially explicit, ingest the spatially defensible slice now and preserve the rest as a documented next table instead of forcing it into the wrong schema.
- Prefer official filter logic that reduces noise before records ever reach the UI.
- Turn confusing map silence into explicit product feedback whenever possible.
- Summarize research datasets for the map surface first; keep raw analyte granularity in transform outputs and metadata.
- Make the live-data path as repeatable as the UI path.
- Treat cleanup as product work. Removing old branches can improve trust just as much as adding a new layer.
- When the live data path is blocked by environment, prioritize map behavior that still improves the fallback experience instead of stalling.
- Turn repeated manual audit steps into scripts as soon as they uncover one real issue.
- Prefer server-side interpretation for nearby summaries so search, drawer, and future clients stay consistent.
- Keep the nearby API compositional: source lineage, evidence class, concern themes, and contaminant families can each be layered in without pushing interpretation into the client.
- If a summary concept matters enough to show in the UI, it usually deserves a first-class field in the data model.
- When multiple source programs land in the same table, validate the upsert semantics before assuming the live data path is trustworthy.
- Put validation as close as possible to the load boundary. That catches bad normalized rows before database state and product behavior start to drift together.
- When shell encoding damage shows up in a small module, replacing that module cleanly is usually safer than patching around broken bytes.
- Deep-link QA should include state that looks cosmetic at first, such as search text, because those omissions only show up when people try to share a map view.

## Next candidate tasks

- Load the real PFAS, wastewater, and pharma rows into a live local PostGIS database and confirm the globe is reading those rows instead of fallback mock markers.
- Tighten the current mock fallback set so it more closely mirrors the live official layer mix now that PFAS, wastewater, and pharma ETL are real.
- Start the next official-source ingest slice after PFAS, wastewater, and pharma: additional discharge-related evidence and higher-quality regional risk context.
- Add browser-level verification of the nearby radius controls and ranked nearby cards once a stable local browser path is available.
- Surface more source-aware and chemistry-aware summaries from the nearby API once the live database path is available for broader U.S. coverage.
- When the local runtime supports it, complete the live PostGIS load and compare the real nearby summary output against the fallback path for the same places.
- Once live rows are available, tune the family-inference logic against real U.S. datasets so the signal stack is driven less by fallback heuristics and more by official attributes.
- Add a small load-row validator or fixture-based test for ETL metadata so signal families, tags, and related case-study ids are checked before a live load.
- Add a fixture-based regression test for representative ETL rows now that the shared validator exists.
- Once the local runtime can load PostGIS again, compare fixture-validated rows against the real loaded DB rows to confirm the adapter path preserves the same contract.
- Propagate typed `chemicalMarkers` into any future live power-plant, hazardous-site, and hydrography-aware source slices so the chemistry vocabulary stays consistent as the atlas expands.
- When the live database runtime is available again, compare fallback `chemicalHighlights` against loaded TRI/PFAS/pharma rows to make sure the named-chemical story stays grounded in the real sources.
- Once live DB-backed rows are loading again, extend chemical-aware search scoring so it can privilege real release-record chemical names over fallback editorial highlights when both exist.
- Promote the shared chemistry vocabulary into any remaining UI surfaces and live DB summary logic so there is only one canonical source of chemistry labels, aliases, and quick-search compounds.

## 2026-04-10 globe stability slice

- Simplified the active Cesium scene to a safer minimal mode for local browsers: no remote basemap, no terrain upgrade, no initial `CameraFlyTo`, lighter labels, and region ellipses only when selected or hovered.
- Verified the fresh production bundle no longer serves the old `Safe launch`, `Quick filters`, or `Timeline frame` strings on the active `/` route.
- Confirmed a fresh local server on port `3005` returns `200` with the simplified bundle.

### Learned

- Cesium stability matters more than decorative scene features. A plain dark ellipsoid with points is better than a richer scene that crashes the browser.
- Remote imagery, terrain upgrades, and extra scene effects should be added back only after the minimal globe is stable in the target browser.
- A fresh port is the fastest way to cut through local browser cache confusion while iterating on a WebGL-heavy app.

### Better next

- Once Brave can hold the minimal globe reliably, keep stripping the main route until the globe is visually dominant and the controls read like floating map tools instead of a product shell.
- After the minimal globe is stable, reintroduce visual richness one step at a time and verify browser stability after each change.

## 2026-04-10 map-first cleanup slice

- Removed the always-visible dashboard surfaces from the active globe route: no permanent right-side layer panel, no permanent legend block, and no always-open empty drawer.
- Changed the globe route so stale URL filters no longer leave the page looking blank; when the current filter mix resolves to zero visible signals, the globe now falls back to a broader live set instead of collapsing into an empty product shell.
- Clamped URL year state to the supported timeline range so out-of-range shared links do not silently blank the map.
- Tightened the search panel into a smaller floating map control instead of a status-heavy control surface.

### Learned

- A toxin globe can tolerate a compact search HUD, but it cannot tolerate large empty state boxes that visually overpower the map.
- Zero-result states should recover toward a visible globe, not toward more interface chrome.

### Better next

- Keep removing any UI that occupies space before the user has actually selected a place or signal.
- Once the globe is stable in the browser, make the top-left control block even smaller and move any advanced controls behind a single toggle instead of keeping them in the primary view.

## 2026-04-10 raw Cesium mount slice

- Replaced the active globe mount from the heavier Resium `Viewer` component path to a lower-level imperative Cesium viewer mount so the globe has less React wrapper overhead during initialization.
- Kept the scene in the strict minimal mode: no remote basemap, no terrain upgrade in the active path, suppressed sky/fog/sun/moon extras, and light point-only entity rendering by default.
- Preserved selection, hover, and camera fly-to behavior while moving that interaction wiring onto Cesium's native screen-space handlers.

### Learned

- When a browser is crashing the actual WebGL mount, reducing UI chrome is not enough. The globe bootstrap path itself has to get simpler.
- The right debugging sequence is: server health first, then browser crash isolation, then scene simplification, then wrapper simplification.

### Better next

- If Brave still crashes on the raw viewer mount, create a one-purpose debug route with only the globe canvas and zero HUD so the next isolation step is absolutely clean.

## 2026-04-10 browser support gate slice

- Added an explicit browser/runtime support gate ahead of the active Cesium mount so unsupported browsers do not attempt to load the live globe route.
- Locked the current support target to Chrome and Edge desktop, and moved Brave into a stable fallback path instead of letting it crash the tab.
- Added a dedicated unsupported-browser fallback surface with direct links to sources, methodology, and the internal `/globe-debug` renderer-isolation route.
- Kept `/globe-debug` available as the raw diagnostic globe route and updated its copy to make clear that it is an internal debug surface.

### Learned

- Once the renderer boundary is proven broken, the safest fix is to prevent unsupported browsers from ever crossing that boundary.
- A graceful fallback is materially better than another round of crash-prone retries, especially when the product can still expose sources and methodology.

### Better next

- Confirm the fallback is stable in Brave and the live globe is stable in Chrome/Edge before doing any more product-surface cleanup.
- If Brave support becomes a hard requirement later, isolate it as a separate renderer-compatibility project instead of mixing it with normal atlas work.

## 2026-04-10 machine-level GPU slice

- Confirmed the problem is not only Brave. On this machine, Chrome still crashes on the raw Cesium mount while the app server remains healthy.
- Removed the explicit Brave block and shifted support logic toward actual WebGL capability instead of browser name alone.
- Forced both the main Cesium globe and the bare debug globe onto the WebGL1 request path so the app does not depend on local WebGL2 stability.
- Added a safer `/globe-support` diagnostics surface that reports WebGL/WebGL2 availability and strict-mode behavior without mounting Cesium.

### Learned

- Browser-name gating was the wrong abstraction once Chrome reproduced the same renderer failure.
- The real boundary is the local GPU/WebGL path, so diagnostics must report capabilities directly instead of inferring too much from the browser label.

### Better next

- Compare the corrected diagnostics output with the WebGL1 globe behavior before making any more support assumptions.
- If WebGL1 still crashes on this machine, the next step is not more UI work; it is deciding whether to ship a non-Cesium map fallback for unstable machines.
- 2026-04-10 22:25 EDT
- Root-cause update: browser support probing was not enough. Chrome diagnostics passed, but the main route still crashed because the route-level shell still owned the heavier interactive globe path.
- Change made: split the route into a tiny support gate and a separate supported-only shell, then replaced the main route globe with a safer point-only Cesium mount.
- Evidence: npm run lint, npm run build, and npm run qa:smoke all passed after the split.
- Next verification target: fresh localhost server on a new port to confirm Back to map no longer kills the renderer.

## 2026-04-11 raw-globe recovery slice

- Replaced the active `/` and `/explore` supported branch with a true raw Cesium route: one viewer, no API queries, no search, no drawer, no nearby logic, no entity transforms, no Zustand-driven interaction shell.
- Collapsed `/globe-debug` onto the same raw globe component so the main route and debug route now exercise the same Cesium implementation.
- Added explicit Cesium lifecycle instrumentation around component mount, viewer construction, scene configuration, initial camera set, and render-ready milestones.
- Added a minimal in-app failure overlay that reports the last completed initialization stage and any caught initialization error.

### Learned

- The previous “supported” route was still carrying far too much app logic for a renderer stabilization pass.
- Diagnostics proving WebGL support is not enough; the live route has to be reduced until the same component can survive first paint.
- Duplicate Cesium implementations slow debugging down because they make browser failures harder to attribute.

### Better next

- Verify whether the raw route actually loads in Chrome and Brave before reintroducing any product behavior.
- If this raw-globe route still crashes, treat Cesium on this machine as the failing dependency and decide on fallback renderer strategy instead of adding more atlas features.

## 2026-04-11 production recovery and source-plan clarity slice

- Fixed the production build regression on `/` and `/explore` by moving the active Cesium renderer behind a strict client-only dynamic boundary in the supported globe shell.
- Restored the main route from raw-globe recovery mode into a usable U.S. toxin map MVP shell with renderer, search, layer toggles, nearby summaries, and detail drawer.
- Revalidated the production path end to end: `npm run lint`, `npm run build`, `npm run qa:smoke`, and `npm run typecheck` all pass again.
- Confirmed the live local API is serving a populated MVP payload rather than an empty debug shell:
  - 19 mapped entities
  - 9 layer summaries
  - 27 source registry records
- Made the linked-project integration explicit in the source model and sources page:
  - direct-ingest vs derived-from-methodology vs reference-only was already typed
  - added explicit implementation-role and mimic-contribution metadata for the key user-linked sources and reference products
  - updated README and `/sources` copy to document how toxinmap combines EPA, ATSDR, USGS, ProPublica, EDF CEAM, Clear Collaborative, EWG, IPEN, Plastic Health Map, and ArcGIS PFAS references into one system

### Learned

- The biggest recent failure was not Cesium alone. The route graph was still importing the renderer too eagerly for production page-data collection.
- The repo already contained most of the right source architecture; the missing part was product truth. The app needed to say explicitly which linked projects are operational inputs and which ones are methodology or QA references.
- Keeping one map route, one active renderer path, and one explicit source registry makes future progress easier to verify.

### Better next

- Finish the live data cutover instead of adding more shell polish:
  - load FRS + TRI + ECHO + ATSDR PFAS + USGS PFAS + NPDES + USGS pharma into PostGIS
  - make DB-backed entities the default production path
- Expand the national entity set so the map stops feeling case-study anchored and starts feeling broadly U.S.-useful.
- Only after the live dataset is in place, tighten the HUD further and refine browser support classification.

## 2026-04-11 ETL file-tier slice

- Confirmed the current environment still cannot run the PostGIS path because Docker is not installed locally.
- Instead of stalling on that blocker, added a second real-data tier that reads normalized ETL CSV outputs directly from `scripts/etl/cleaned`.
- Added [etl-file-repository.ts](C:/Users/chris/Toxin-Environment-Map/src/lib/data/etl-file-repository.ts) to convert local EPA TRI, USGS PFAS, EPA NPDES wastewater, and USGS pharma outputs into real `ExplorerEntity` records.
- Wired the repository merge order to: database entities -> ETL file entities -> hand-authored fallback entities.
- Added ETL-backed industrial release records for TRI file entities in entity detail so the drawer can show source-backed chemical rows before database load.
- Extended entity detail backend labels so the product can distinguish `database`, `etl-file`, and `mock`.
- Fixed the flaky Windows typecheck path by changing the validation script to run `next typegen` before `tsc --noEmit`.

### Learned

- Waiting on Docker would have left the product blocked for the wrong reason. The normalized ETL outputs were already good enough to become a useful intermediate truth layer.
- The right fallback hierarchy is not just database versus mock. A source-backed file tier materially improves honesty and usefulness while the database path is unavailable.
- Validation reliability matters as much as code correctness. A flaky typecheck command burns time and obscures whether a slice is actually finished.

### Better next

- Inspect the live API counts again and confirm the ETL file tier has increased the map population beyond the earlier 19-entity fallback-heavy state.
- Expand the ETL-backed layer coverage further:
  - add ATSDR PFAS points once stable coordinates are available
  - derive more legal/compliance markers from ECHO once a coordinate join path is in place
- Then return to the full database cutover when a local PostGIS runtime is available again.

## 2026-04-11 legal-marker ETL join slice

- Added state filtering to `scripts/etl/ingest_echo.py` so ECHO reruns can target the same U.S. MVP state set as the other federal jobs instead of always producing an unbounded national compliance transform.
- Fixed a real FRS ingest defect in `scripts/etl/ingest_frs.py` by normalizing `registry_id` to a stable string key before related-table merges and filtered reads.
- Fixed additional FRS contract issues exposed by validation:
  - `program_acronyms` and `tri_ids` can come through as `NaN` and now normalize to arrays before metadata assembly
  - blank `fac_name` values now fall back to a stable facility label instead of failing the industrial-site schema
- Fixed a real ECHO contract issue in `scripts/etl/ingest_echo.py` by deduplicating repeated case rows on normalized case slug before writing health-context rows.
- Fixed the actual ECHO-to-FRS join bug by normalizing ECHO `registry_id` values so ECHO slugs no longer carry a trailing `.0` that prevented FRS coordinate joins.
- Rebuilt the state-scoped ETL outputs for `NC, LA, OH, PA, DE, MI, WI, NJ, NY, WV`.
- Verified the raw join surface:
  - `717,589` FRS facility rows
  - `33,144` ECHO facility updates
  - `15,685` direct slug matches with usable FRS coordinates before app-layer defaults
- Verified the live application route on `http://127.0.0.1:3021/api/entities` now exposes `15,688` `legal-markers` records, so the legal layer is no longer mostly curated fallback.
- Revalidated the repo after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run etl:validate-fixtures`
  - `npm run data:validate`
  - `python -m py_compile scripts/etl/ingest_frs.py scripts/etl/ingest_echo.py`

### Learned

- The legal-layer blocker was not missing source coverage. It was pure key hygiene: ECHO and FRS were using the same identifier with different string formats.
- ETL validation is doing the right job. Every rerun surfaced a specific contract issue that would have silently degraded the app if it had been ignored.
- The fallback data validator still reflects the curated baseline, not the richer ETL-backed API payload. The app can now be much more populated than `npm run data:validate` alone suggests.

### Better next

- Broaden validation so ETL-backed API payloads are checked directly, not only the fallback/mock integrity surface.
- Add the next source-backed layer expansion on top of the now-working legal join:
  - ATSDR PFAS points into the ETL file tier
  - more FRS/ECHO/Tri-derived industrial detail for the map and drawer
- Keep the current hierarchy intact:
  - PostGIS when available
  - ETL file outputs now that they are materially useful
  - curated fallback only where source-backed coverage still does not exist

## 2026-04-11 live API validation slice

- Added `scripts/qa/validate-live-api.ts` and wired it into `package.json` as `npm run qa:validate-live-api`.
- The new live validator checks the actual served API payload rather than only the curated fallback data model.
- It currently verifies:
  - `/api/entities` is non-empty
  - `legal-markers` count is materially populated after the ECHO/FRS ETL join
  - `industrial-sites`, `pfas-sites`, and `wastewater-sites` are present in the live payload
  - a sampled legal marker detail resolves with `backend: "etl-file"`
  - the sampled legal marker preserves `epa-echo` source lineage
- Fixed a TypeScript script-scope collision in `scripts/qa/smoke.ts` by making the smoke runner an explicit module.
- Revalidated after the change:
  - `npm run qa:validate-live-api`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run qa:smoke`

### Learned

- The older validator is still useful, but it only proves the curated fallback baseline. It is not enough anymore once the live API is materially richer than the fallback content.
- A map can look "more complete" while validation still lags behind. That gap has to be closed on purpose or regressions will land in the source-backed path first.
- Script files under `scripts/qa` need explicit module boundaries once typecheck starts compiling them together.

### Better next

- Expand live-API validation again as the next ETL-backed layers land:
  - ATSDR PFAS points
  - broader industrial detail
  - more source-aware entity detail checks
- Keep the current validation stack layered:
  - fallback data integrity
  - ETL fixture validation
  - live API payload validation
  - smoke routes against a running server

## 2026-04-11 ATSDR PFAS ETL-file slice

- Investigated the ATSDR PFAS source path instead of assuming the one-row local output was real.
- Confirmed the live ATSDR page still exposes a 59-row site table, so the source itself was fine.
- Found the real blocker in `scripts/etl/utils/geocode.py`: Census geocoder misses and `400` responses were aborting the entire ingest, and landmark-style PFAS site names were too weak for Census alone.
- Hardened the geocoder utility so Census failures now degrade cleanly and fall back to OpenStreetMap Nominatim.
- Re-ran `scripts/etl/ingest_atsdr_pfas.py --force-geocode` successfully:
  - `59` ATSDR PFAS rows normalized
  - `10` rows now have usable coordinates
- Wired ATSDR transform rows into the ETL file repository so geocoded ATSDR PFAS sites now appear in the live `pfas-sites` layer.
- Revalidated the live API after the change on `http://127.0.0.1:3022`:
  - total entities: `15,731`
  - `pfas-sites`: `18` (up from `8`)
  - `legal-markers`: `15,688`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`

### Learned

- The ATSDR source was not the problem. The local ingest was brittle because it treated geocoding misses as fatal and depended too heavily on Census for landmark-style site names.
- A second-pass geocoder is justified when the source is official but the site names are not street-address shaped.
- The ETL file tier is now doing real product work, not just acting as a temporary scaffold. It is materially broadening the live map before PostGIS is available.

### Better next

- Keep improving source-backed PFAS breadth:
  - raise ATSDR coordinate coverage above the current 10 geocoded rows
  - preserve which geocoder actually resolved each point in metadata
- Expand source-backed industrial detail next, especially where TRI and ECHO can enrich the currently small `industrial-sites` point count.
- Continue treating the hierarchy as:
  - PostGIS when available
  - ETL file outputs for real intermediate truth
  - curated fallback only for the remaining gaps

## 2026-04-11 industrial breadth slice

- Measured the real industrial coverage problem instead of guessing:
  - local TRI ETL output was still tiny
  - the FRS crosswalk had `717,589` rows and `21,700` facilities with non-empty `tri_ids`
- Used that measurement to add a controlled source-backed industrial subset rather than flooding the map with all registry facilities.
- Normalized FRS/TRI ids in the ETL file repository so facility ids now align on the canonical `frs-<registry_id>` form instead of keeping the older trailing `.0` mismatch.
- Added an FRS-backed industrial footprint builder in `src/lib/data/etl-file-repository.ts` that:
  - requires coordinates
  - requires at least one TRI-linked id
  - preserves tags, related case studies, and program acronyms
  - exposes FRS/TRI and optional ECHO lineage in `sourceIds`
- Added in-memory ETL entity deduplication so direct TRI entities still win where a richer TRI point and an FRS footprint would otherwise collide on the same canonical id.
- Strengthened the live API validator so `industrial-sites` must now stay above a meaningful threshold instead of merely being non-empty.
- Revalidated on `http://127.0.0.1:3023`:
  - total entities: `37,363`
  - `industrial-sites`: `21,638` (up from `3`)
  - `legal-markers`: `15,688`
  - `pfas-sites`: `18`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- The industrial-layer bottleneck was not missing source data. It was the absence of a sane intermediate subset between tiny TRI direct measurements and the full FRS registry universe.
- Canonical id normalization matters even inside the ETL file tier, not just across Python ETL jobs.
- A map can broaden dramatically without becoming noisier if the inclusion rule is explicit and source-grounded.

### Better next

- Expand source-backed industrial detail in the drawer and nearby summaries, especially where TRI and ECHO can explain why a facility is industrially relevant.
- Improve PFAS breadth again by raising ATSDR coordinate coverage above the current 10 resolved points.
- Continue to prefer:
  - source-backed subset rules
  - then validation
  - then UI exposure
  instead of adding new surface area before the underlying layer is credible.

## 2026-04-11 industrial detail-quality slice

- Enriched source-backed industrial footprint entities in `src/lib/data/etl-file-repository.ts` instead of adding another parallel industrial path.
- Added an internal ECHO facility context map so industrial footprints can inherit:
  - ECHO source lineage when present
  - enforcement-oriented official signals
  - legal/historical context
  - federal case counts where available
- Joined the industrial footprint builder to any available normalized TRI aggregate for the same canonical facility id so industrial detail can now expose:
  - normalized TRI release total
  - top-chemical count where that richer direct TRI aggregate exists
  - stronger official signal text
- Kept the current dedupe rule intact so direct TRI points still win when they exist, while the broader FRS industrial footprint set fills the national industrial coverage gap.
- Tightened `scripts/qa/validate-live-api.ts` again so it now confirms the live API contains at least one ETL-backed industrial footprint detail record with:
  - `epa-frs` and `epa-tri` lineage
  - a `Programs` source stat
  - TRI-linked official signal text
- Revalidated on `http://127.0.0.1:3024`:
  - total entities: `37,363`
  - `industrial-sites`: `21,638`
  - `legal-markers`: `15,688`
  - `pfas-sites`: `18`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- Industrial breadth alone is not enough. The source-backed industrial layer becomes meaningfully more useful once the drawer can explain program footprint, TRI linkage, and regulatory pressure in one place.
- Validation has to target the right subclass of live entities. A direct TRI point and an FRS industrial footprint are both valid industrial records, but they do not carry the same detail contract.
- The ETL file tier is now doing layered joins, not just reading flat CSVs. That makes its own validation and id discipline even more important.

### Better next

- Improve nearby summaries for the now-large industrial layer so industrial-heavy places read more specifically and less generically.
- Raise PFAS breadth again by increasing ATSDR coordinate resolution beyond the current 10 mapped rows.
- Start tightening wastewater breadth next, because `wastewater-sites` is still much smaller than the industrial and legal layers even though the ETL path exists.

## 2026-04-11 wastewater breadth slice

- Measured the wastewater layer before changing code and found the real issue was stale ETL output, not a broken repository path:
  - `scripts/etl/cleaned/epa-npdes/npdes_wastewater_context.csv` only had `10` rows
  - `scripts/etl/cleaned/usgs-pharma/great_lakes_pharma_sampling_sites.csv` was similarly tiny
- Re-ran the wastewater ETLs for the U.S. MVP state set instead of continuing to reason from stale files:
  - `python scripts/etl/ingest_npdes_wastewater.py --states NC,LA,OH,PA,DE,MI,WI,NJ,NY,WV`
    - `Wastewater rows: 14215`
  - `python scripts/etl/ingest_usgs_pharma.py`
    - `Sampling-site rows: 128`
- Tightened `scripts/qa/validate-live-api.ts` so the live API now has to prove the wastewater layer is materially present, not just non-empty:
  - `wastewater-sites` must stay above `1000`
  - at least one `npdes-*` wastewater entity must exist
  - at least one `usgs-pharma-*` wastewater entity must exist
- Revalidated against `http://127.0.0.1:3025` after the ETL reruns:
  - total entities: `43,279`
  - `industrial-sites`: `21,638`
  - `legal-markers`: `15,688`
  - `wastewater-sites`: `5,927`
    - NPDES-backed: `5,809`
    - USGS pharma-backed: `115`
  - `pfas-sites`: `18`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- Not every coverage problem is a code problem. In this case the ETL-backed repository path was already capable of much broader wastewater coverage; the local cleaned outputs were just stale and misleadingly small.
- Threshold-based live API validation is doing real product work now. Once a layer matters to the MVP, the validator should assert breadth and subtype presence explicitly.
- The real working hierarchy is now clearer:
  - PostGIS when available
  - fresh ETL file outputs for real intermediate truth
  - curated fallback only for the remaining holes

### Better next

- Improve wastewater detail quality the same way industrial detail was improved:
  - show stronger NPDES / pharma context in the drawer
  - expose pathway-specific official signals instead of generic wastewater text
- Raise PFAS breadth again by increasing ATSDR coordinate resolution beyond the current 10 mapped rows.
- After those two, start tightening nearby summaries so the larger industrial + legal + wastewater mix reads more like a real toxin map and less like a raw infrastructure registry.

## 2026-04-11 wastewater detail-quality slice

- Enriched wastewater detail in `src/lib/data/etl-file-repository.ts` instead of creating another wastewater path.
- Tightened NPDES wastewater entities so they now expose source-derived detail instead of generic permit text:
  - permit-status official signal
  - Clean Water Act status
  - major/minor facility scale
  - permit component
  - receiving water body
  - pollutant count
  - DMR pounds when present
  - last inspection / formal action in legal-historical context
- Tightened USGS pharma wastewater entities so they now expose study-derived detail instead of generic research text:
  - river name
  - detection-event count
  - classes present
  - stronger source stats for detections and class count
- Corrected source lineage on USGS pharma wastewater records so they now only claim `usgs-pharma` instead of also implying an `epa-npdes` source that was not actually joined on a per-record basis.
- Strengthened `scripts/qa/validate-live-api.ts` again so the live API now has to prove:
  - NPDES wastewater detail is ETL-backed
  - `epa-npdes` lineage is present
  - `Water body` and `Pollutants` stats are present
  - permit-status official signal is present
  - USGS pharma wastewater detail is ETL-backed
  - `usgs-pharma` lineage is present
  - `Detections` stat is present
  - class-level official signal text is present
- Revalidated on `http://127.0.0.1:3026`:
  - total entities: `43,279`
  - `wastewater-sites`: `5,927`
    - NPDES-backed: `5,809`
    - USGS pharma-backed: `115`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- Wastewater breadth by itself is not enough. A broad wastewater layer still feels thin if the detail panel cannot explain permit status, receiving water, scale, pollutant pressure, and research sampling context.
- Source lineage has to stay strict even in the ETL file tier. If a record is only from USGS pharma, the map should not imply EPA NPDES per-record lineage without a real join.
- The live API validator is now doing useful contract enforcement across industrial, legal, PFAS, and wastewater layers instead of only checking for non-empty arrays.

### Better next

- Raise PFAS breadth again by improving ATSDR coordinate resolution beyond the current 10 geocoded rows.
- Tighten nearby summaries next so the larger industrial + legal + wastewater mix reads more specifically and less like parallel registries.
- After those two, keep pushing the ETL-backed map away from curated fallback by filling the remaining thin national layers.

## 2026-04-11 PFAS breadth slice

- Re-measured the ATSDR PFAS ETL instead of assuming the previous `10` mapped rows were a hard ceiling:
  - `59` ATSDR PFAS rows total
  - only `10` had coordinates before this slice
- Improved `scripts/etl/ingest_atsdr_pfas.py` and `scripts/etl/utils/geocode.py` so ATSDR geocoding is no longer a single brittle query:
  - multi-query candidate generation for landmark and `near ...` site names
  - full state-name query expansion
  - recorded `geocoder` and `geocodeQuery` metadata
- Found and corrected a real regression during the slice:
  - aggressive full reruns hit Nominatim rate limits and temporarily collapsed ATSDR coverage to `0`
  - fixed that by adding a disciplined manual coordinate override set for the ATSDR site names that are both stable and repeatedly important to the MVP
  - left generic geocoding in place for the rows that can still resolve automatically
- Tightened `scripts/qa/validate-live-api.ts` so the PFAS layer now has to prove:
  - at least `20` total `pfas-sites`
  - at least `10` `atsdr-*` PFAS entities
  - at least one `usgs-pfas-*` entity
- Revalidated on `http://127.0.0.1:3027`:
  - total entities: `43,302`
  - `pfas-sites`: `41`
    - ATSDR-backed: `33`
    - USGS-backed: `5`
  - `industrial-sites`: `21,638`
  - `legal-markers`: `15,688`
  - `wastewater-sites`: `5,927`
- Revalidated after the slice:
  - `python -m py_compile scripts/etl/ingest_atsdr_pfas.py scripts/etl/utils/geocode.py`
  - `python scripts/etl/ingest_atsdr_pfas.py --force-geocode`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- ATSDR PFAS breadth was not fundamentally limited by the source table. It was limited by geocoding reliability and by treating every site name as if it were a street address.
- For a screening-signal layer like ATSDR, a small curated coordinate override tier is a better engineering choice than letting the layer stay artificially sparse or silently regress when a public geocoder rate-limits.
- The project is materially stronger when the validator enforces layer breadth by source family, not just total entity counts.

### Better next

- Tighten nearby summaries next so the larger industrial + legal + wastewater + PFAS mix reads more specifically and less like parallel registries.
- Improve the thin remaining national layers (`air-toxics-regions`, `power-plants`, `hazardous-sites`, `sentinel-species`) so the map feels less fallback-heavy outside the core industrial / legal / wastewater / PFAS system.
- Keep pushing the ETL-backed map away from curated fallback, but only after each new layer gets the same breadth and detail validation discipline.

## 2026-04-11 nearby system-summary slice

- Reworked the nearby API in `src/lib/data/repository.ts` so it now returns integrated toxin-system summaries instead of only layer/theme/source counts.
- Added typed nearby `systemCounts` in `src/types/explorer.ts` and mapped the current radius into explicit toxin systems:
  - industrial release footprint
  - regulatory and legal pressure
  - wastewater and downstream pathway
  - PFAS investigation and sampling
  - direct sampling evidence
  - legacy hazard and cleanup
- Tightened the summary-line logic so nearby interpretation now explains overlap between:
  - industrial footprints and regulatory pressure
  - wastewater pathways and PFAS investigation context
  - direct sampling versus proxy-heavy visibility
- Corrected one real modeling mistake during the slice:
  - the first pass was overcounting the wastewater system by treating any `downstream` tag as wastewater
  - fixed that by narrowing the wastewater system to actual wastewater-linked signal families and wastewater indicators
- Exposed the integrated toxin-system blocks in `src/components/explore/detail-drawer-shell.tsx` so the nearby drawer now reads more like one toxin map and less like multiple parallel registries.
- Strengthened `scripts/qa/validate-live-api.ts` so the live API now has to prove the nearby endpoint returns:
  - non-empty integrated `systemCounts`
  - at least the `industrial-pressure` and `regulatory-pressure` systems
  - non-empty integrated `summaryLines`
- Revalidated on `http://127.0.0.1:3029`:
  - total entities: `43,302`
  - nearby radius sample (`34.22,-78.75`, `100` miles) now returns:
    - industrial system count: `465`
    - wastewater system count: `325`
    - regulatory system count: `171`
    - PFAS system count: `2`
  - summary lines now describe system overlap instead of just top tags
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- Nearby interpretation needs one explicit system layer above raw layers, tags, and sources or it keeps reading like registry output instead of a toxin map.
- System definitions need to stay disciplined. Reusing broad tags like `downstream` can make the nearby summaries sound coherent while actually inflating the wrong pathway.
- The live API validator is now valuable not just for layer breadth, but also for interpretive contract quality.

### Better next

- Improve the thin remaining national layers (`air-toxics-regions`, `power-plants`, `hazardous-sites`, `sentinel-species`) so the map feels less fallback-heavy outside the core industrial / legal / wastewater / PFAS system.
- Tighten the top nearby results so they privilege stronger direct or source-specific records when mixed with broad facility footprints.
- Keep removing curated fallback dependence only after each remaining layer gets the same breadth, detail, and nearby-interpretation discipline.

## 2026-04-11 air-toxics hotspot slice

- Improved the thin `air-toxics-regions` layer by replacing the fallback-heavy surface with ETL-backed hotspot synthesis in `src/lib/data/etl-file-repository.ts`.
- Built hotspot regions from the existing ETL-backed industrial and legal geography already available in the MVP:
  - TRI facility points
  - FRS industrial footprints
  - ECHO / FRS legal markers
- Used a simple 1-degree grid aggregation with hotspot thresholds so the layer stays screening-level and honest instead of pretending to be a full modeled burden map.
- Each hotspot now carries:
  - centroid and regional radius
  - clustered-record count
  - legal-overlap count
  - signal-family count
  - ETL-backed source lineage through `epa-frs`, `epa-tri`, and optional `epa-echo`
- Caught and fixed one real issue during the slice:
  - the first hotspot wording always implied legal overlap even when the sampled hotspot had `Legal overlap: 0`
  - corrected the hotspot `summary` and `officialSignals` so they only mention legal-pressure overlap when the hotspot actually has it
- Tightened `scripts/qa/validate-live-api.ts` so the live API now has to prove:
  - at least `5` ETL-backed `air-toxics-regions`
  - air-toxics detail is `etl-file` backed
  - hotspot detail exposes `Clustered records`
  - hotspot detail includes industrial clustering context instead of stale fallback copy
- Revalidated on `http://127.0.0.1:3032`:
  - total entities: `43,314`
  - `air-toxics-regions`: `15`
  - `industrial-sites`: `21,638`
  - `legal-markers`: `15,688`
  - `wastewater-sites`: `5,927`
  - `pfas-sites`: `41`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- A screening hotspot layer can be a credible interim replacement for a thin fallback layer when the repo already has strong industrial/legal ETL geography but does not yet have a full modeled burden ETL.
- Validators should assert the real contract, not stale wording. The first live validator check was overly literal and had to be aligned with the corrected hotspot language.
- Thin national layers should be improved using existing source-backed geography first, before inventing new ingest scope.

### Better next

- Improve the remaining fallback-heavy national layers:
  - `hazardous-sites`
  - `power-plants`
  - `sentinel-species`
- Prefer whichever of those can be replaced honestly from already available federal/research inputs before adding new ingest scope.
- Keep the same discipline:
  - breadth improvement
  - detail quality
  - live API validation
  - journal entry only after the slice is fully closed

## 2026-04-11 power-plant layer slice

- Replaced the single fallback `power-plants` marker with an ETL-backed national layer synthesized from the existing EPA FRS crosswalk instead of inventing a new ingest system.
- Kept the layer honest by deriving it only from generation-class facilities that can already be justified from the current source stack:
  - `221112` fossil-fuel electric generation
  - `221117` biomass electric generation
  - selected `221118` / `221119` rows only when the facility name clearly indicates a generation plant context
- Added `buildPowerPlantEntities(...)` in `src/lib/data/etl-file-repository.ts` and enriched each point with:
  - `epa-frs` lineage by default
  - optional `epa-tri` lineage when a TRI id exists
  - optional `epa-echo` lineage when regulatory context exists
  - generation class
  - program count
  - optional TRI release total
  - optional federal case count
- Kept the evidence model disciplined:
  - `power-plants` are `Proxy` entities
  - they widen the toxin map’s industrial-energy infrastructure view
  - they do not pretend to be direct emission or exposure measurements on their own
- Tightened `scripts/qa/validate-live-api.ts` so the live API now has to prove:
  - at least `250` ETL-backed `power-plants`
  - power-plant detail is `etl-file` backed
  - power-plant detail includes `epa-frs`
  - power-plant detail exposes `Generation class`
  - power-plant detail includes generation-class official-signal context
- Revalidated on `http://127.0.0.1:3033`:
  - total entities: `44,724`
  - `power-plants`: `1,411`
  - `industrial-sites`: `21,638`
  - `legal-markers`: `15,688`
  - `wastewater-sites`: `5,927`
  - `pfas-sites`: `41`
  - `air-toxics-regions`: `15`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- `Power-plants` was the right next thin-layer target because it could be replaced honestly from the existing FRS crosswalk without pretending we already had full eGRID/EIA ingest loaded.
- Broad utility NAICS codes are too noisy on their own. The layer got materially better once it was narrowed to generation-class rows and stronger facility-name cues.
- The ETL file tier is now good enough to support national layer replacement when the repo already has source-backed identity geography, even if the fuller database path is still pending.

### Better next

- Improve `hazardous-sites` next if a credible federal cleanup / hazard subset can be derived from the current EPA-linked source stack.
- If that cannot be done honestly from existing ETL-backed inputs, leave `hazardous-sites` thin for now and move to `sentinel-species` only when the literature/research basis can be made explicit instead of decorative.
- Keep preferring source-backed replacement over widening fallback storytelling.

## 2026-04-11 hazardous-sites layer slice

- Replaced the single fallback `hazardous-sites` marker with an ETL-backed national hazard layer synthesized from the existing EPA FRS crosswalk.
- Kept the layer honest by narrowing it to cleanup / disposal / legacy-hazard footprints rather than relabeling the full `RCRAINFO` population:
  - explicit cleanup-program linkage via `SEMS`, `CERCL`, `CORRACTS`, or `UST`
  - disposal / landfill / salvage / remediation names with real federal program linkage
  - hazard-linked industrial sites only when they also carry stronger regulatory or TRI context
- Explicitly avoided letting wastewater treatment plants collapse into the hazard layer by excluding the broad `WASTEWATER` name path from the hazard-name matching logic.
- Added `buildHazardousSiteEntities(...)` in `src/lib/data/etl-file-repository.ts` and enriched each hazard point with:
  - `epa-frs` lineage by default
  - `epa-sems` lineage when cleanup-program linkage exists
  - optional `epa-tri` and `epa-echo` lineage when industrial release or legal pressure overlap is present
  - hazard class
  - program count
  - optional TRI release total
  - optional federal case count
- Tightened `scripts/qa/validate-live-api.ts` so the live API now has to prove:
  - at least `1,000` ETL-backed `hazardous-sites`
  - at least `100` `hazardous-sites` with explicit `epa-sems` cleanup lineage
  - hazardous-site detail is `etl-file` backed
  - hazardous-site detail includes `epa-frs`
  - hazardous-site detail exposes `Hazard class`
  - hazardous-site detail includes hazard-class official-signal context
- Revalidated on `http://127.0.0.1:3034`:
  - total entities: `57,590`
  - `hazardous-sites`: `12,867`
  - `hazardous-sites` with `epa-sems` lineage: `4,484`
  - `industrial-sites`: `21,638`
  - `power-plants`: `1,411`
  - `legal-markers`: `15,688`
  - `wastewater-sites`: `5,927`
  - `pfas-sites`: `41`
  - `air-toxics-regions`: `15`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- `RCRAINFO` by itself is far too broad to use as a public-facing hazard layer. The layer only became credible once it was narrowed to cleanup-program, disposal, salvage, and legacy-hazard semantics.
- Thin-layer replacement works best when the filter logic removes overlap with already-strong layers. Excluding `WASTEWATER`-driven name matches was necessary to keep `hazardous-sites` from becoming a second wastewater layer.
- The validator should enforce not just layer count, but also the presence of true cleanup lineage. Requiring `epa-sems` coverage makes the hazard layer meaningfully auditable.

### Better next

- Improve the last thin national source-backed gap that remains in the active map: `sentinel-species`.
- Only replace it if the wildlife literature / sentinel-research basis can be made explicit and source-backed rather than decorative.
- After that, the remaining highest-value work shifts from thin-layer replacement to detail quality, search quality, and eventual database-first cutover.

## 2026-04-11 nearby ranking quality slice

- Left `sentinel-species` intentionally thin for now instead of fabricating national wildlife coverage from weak source footing.
- Improved nearby prioritization in `src/lib/data/repository.ts` so the headline nearby cards now prefer source-specific records over broad proxy footprints.
- Added explicit specificity logic for:
  - `usgs-pfas`
  - `atsdr-pfas`
  - `epa-npdes`
  - `usgs-pharma`
  - `epa-sems`
  - `epa-tri`
  - `epa-echo`
- Added layer-specific ranking bonuses so nearby PFAS, wastewater, cleanup, legal, and TRI-linked industrial points can outrank generic FRS-only proxy rows when the evidence is materially stronger.
- Added proxy penalties for broad facility and region footprints so large generic industrial coverage does not drown out more actionable nearby records.
- Rewrote `whyRanked` explanations to describe the actual source context instead of generic evidence-only phrasing:
  - `USGS PFAS sampling`
  - `ATSDR PFAS site`
  - `NPDES wastewater record`
  - `USGS pharmaceutical sampling`
  - `EPA cleanup-linked hazard record`
  - `TRI-linked release record`
  - `ECHO regulatory record`
- Tightened `scripts/qa/validate-live-api.ts` so the live nearby endpoint now has to prove:
  - headline nearby results are present
  - at least one headline nearby result is source-specific
  - nearby ranking reasons contain real source-context language instead of only generic pathway wording
- Revalidated on `http://127.0.0.1:3035`:
  - total entities: `57,590`
  - nearby headline results now include:
    - `pfas-fayetteville-outfall` via `usgs-pfas`
    - cleanup-linked hazard records via `epa-sems`
  - nearby ranking reasons now explicitly mention sampling, cleanup, and release/regulatory context where supported
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run data:validate`

### Learned

- Nearby ranking quality needed its own specificity model above evidence class and distance. Without that, broad proxy footprints could still dominate the most visible nearby cards.
- The right improvement was not adding more layers. It was making stronger records beat weaker records when both already existed in the same radius.
- Live validation should check interpretive quality, not only that the nearby endpoint returns rows.

### Better next

- Improve the remaining thin map behaviors rather than inventing new thin layers.
- Best next slice:
  - tighten search and selection quality so national coverage feels usable at higher density
  - specifically reduce low-value generic industrial search hits by preferring TRI, cleanup, PFAS, wastewater, and legal records when a query matches multiple nearby candidates
- Keep `sentinel-species` thin until there is a real source-backed wildlife path worth shipping.

## 2026-04-11 search ranking quality slice

- Improved `src/lib/map/search.ts` so search no longer ranks broad generic footprints purely on text overlap.
- Added explicit search specificity boosts for:
  - `usgs-pfas`
  - `atsdr-pfas`
  - `epa-npdes`
  - `usgs-pharma`
  - `epa-sems`
  - `epa-tri`
  - `epa-echo`
- Added layer-specific boosts so search now prefers:
  - PFAS site records for PFAS-like queries
  - wastewater records for wastewater/discharge-like queries
  - cleanup-linked hazardous sites for cleanup / superfund / hazard queries
  - legal markers for enforcement / compliance-like queries
- Added query-intent boosts so broad chemistry queries do not get hijacked by whichever generic entity happens to mention the chemistry term in a highlight or marker field.
- Added generic-footprint penalties so FRS-only industrial identities are less likely to outrank stronger TRI, PFAS, wastewater, cleanup, or legal records.
- Improved search subtitles and match context so results now explain the stronger source framing instead of only showing raw place names.
- Added `scripts/qa/validate-search-ranking.ts` and `npm run qa:validate-search-ranking` so search ranking quality is now validated instead of being left to manual spot checks.
- Revalidated on `http://127.0.0.1:3035`:
  - `PFAS` now ranks a PFAS site first
  - `GenX` now ranks the Fayetteville PFAS outfall first
  - `cleanup` top results are cleanup-linked hazard records
  - `wastewater` top results are wastewater-heavy records rather than lower-value generic industrial matches
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:validate-search-ranking`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`

### Learned

- Search quality needed an explicit intent model, not just better text scoring.
- Broad chemistry strings like `PFAS` and `wastewater` are especially easy to mis-rank unless the search system knows which layers are actually authoritative for that query family.
- Search and nearby ranking are now using the same broader principle: stronger source-specific records should beat weaker proxy footprints when both match.

### Better next

- Improve selection/detail usefulness at high density instead of adding more thin layers.
- Best next slice:
  - make the selected-entity drawer and click flow prefer richer source-backed records when multiple entities stack tightly in the same area
  - reduce the chance that dense industrial clusters hide a stronger PFAS, cleanup, wastewater, or legal point directly underneath
- Keep `sentinel-species` thin until there is a real wildlife source path worth shipping.

## 2026-04-11 dense selection priority slice

- Improved dense-point selection quality so stacked map areas no longer depend only on raw draw order.
- Added a shared entity-priority model in `src/lib/map/entity-priority.ts` for:
  - selection priority
  - render ordering
  - point-size emphasis
- The priority model now explicitly favors richer source-backed records:
  - PFAS sampling / investigation
  - NPDES wastewater
  - cleanup-linked hazard records
  - TRI-linked industrial records
  - ECHO legal records
- Added source boosts, layer boosts, detail richness boosts, and aggregate penalties so broad proxy rows do not dominate stacked clicks.
- Updated `src/components/explore/cesium-safe-globe.tsx` so the active Cesium path now:
  - uses `scene.drillPick(...)` instead of a single top-level `pick(...)`
  - collects all candidate entities under the cursor
  - chooses the best candidate using the shared entity-priority model
  - renders lower-priority rows first and higher-priority rows last so stronger records sit on top visually
  - gives stronger non-aggregate records slightly larger point sizes to improve clickability
- Added `scripts/qa/validate-selection-priority.ts` and `npm run qa:validate-selection-priority` so dense selection quality is now validated instead of assumed.
- Revalidated on `http://127.0.0.1:3036`:
  - total entities: `57,590`
  - selection-priority validator confirms:
    - PFAS priority: `326`
    - wastewater priority: `230`
    - cleanup hazard priority: `218`
    - TRI industrial priority: `294`
    - broad proxy power-plant baseline: `154`
  - top Cape Fear selection candidate is now the PFAS outfall record, not a broad footprint row
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`

### Learned

- Search and nearby ranking improvements were not enough by themselves. Dense map selection needed the same explicit specificity model or the renderer could still surface the wrong record under the cursor.
- `drillPick(...)` plus one shared priority model is the right approach for stacked toxin-map interactions.
- The broad proxy baseline on the current map is no longer generic industrial FRS rows; it is now broader proxy layers such as simple power-plant footprint rows. The validator should track the real current baseline, not an outdated one.

### Better next

- Improve detail-panel usefulness and layer legibility at high density.
- Best next slice:
  - tighten selected-entity detail so the drawer surfaces the strongest chemistry and source lineage first when a selected record carries mixed TRI / ECHO / SEMS / PFAS / wastewater context
  - reduce secondary UI noise in the drawer so dense selections read faster
- Keep `sentinel-species` thin until there is a real wildlife source path worth shipping.

## 2026-04-11 detail summary and drawer-noise slice

- Improved selected-entity detail readability without changing the underlying evidence model.
- Added `src/lib/data/detail-summary.ts` as a shared prioritization helper for mixed-source entity detail.
- The helper now ranks:
  - source lineage
  - chemistry spotlights
  - official signals
  - source stats
- The ranking favors stronger lineage first:
  - `usgs-pfas`
  - `atsdr-pfas`
  - `epa-npdes`
  - `usgs-pharma`
  - `epa-sems`
  - `epa-tri`
  - `epa-echo`
  - `epa-frs`
- Updated `src/components/explore/detail-drawer-shell.tsx` so the drawer now leads with a `Read this first` summary block instead of making the user parse every context section equally.
- The drawer now surfaces:
  - primary chemistry
  - strongest lineage
  - strongest signals
  - top-ranked record stats first
  - secondary stats separately, only after the key facts
- Reduced drawer noise by only rendering non-empty context sections and by using the prioritized signal subset in the main signal section.
- Added `scripts/qa/validate-detail-summary.ts` and `npm run qa:validate-detail-summary` so the prioritized detail summary is now tested against real representative records instead of being left to visual inspection.
- Revalidated on `http://127.0.0.1:3037`:
  - PFAS detail now ranks `usgs-pfas` first and spotlights `GenX`, `PFOS`, and `PFOA`
  - cleanup hazard detail now ranks `epa-sems` first and prioritizes cleanup-program / hazard-class / federal-case signals
  - wastewater detail now ranks `epa-npdes` first and prioritizes `Permit`, `Status`, `Water body`, and `Pollutants`
  - TRI industrial detail now ranks `epa-tri` first and prioritizes `TRI-linked ids`
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`

### Learned

- The data quality was already strong enough; the main problem was presentation order.
- Mixed-source records need one explicit summarization layer or the drawer forces the user to mentally rank EPA, USGS, ATSDR, TRI, ECHO, SEMS, and chemistry cues on their own.
- The right discipline is the same one already used for nearby and search: stronger source-backed facts should appear first.

### Better next

- Improve the last major UX gap: map density legibility.
- Best next slice:
  - reduce visual overload at national and regional zoom without hiding high-priority records
  - specifically improve cluster / aggregate behavior so the map stays readable while preserving stronger PFAS, cleanup, wastewater, and legal signals
- Keep `sentinel-species` thin until there is a real wildlife source path worth shipping.

## 2026-04-11 density legibility slice

- Improved national and regional zoom readability without throwing away the strongest records.
- Updated `src/lib/map/entity-transforms.ts` so clustering now:
  - uses camera-height-aware cluster sizes instead of one static aggregation level
  - preserves high-priority standalone records at wider zooms
  - clusters by `layerId` instead of only `layerGroup`
  - promotes the strongest record in a cluster to be the representative entity
  - unions source lineage, signal families, chemistry markers, and chemistry highlights across clustered members
- Wide zoom now keeps stronger source-backed PFAS, wastewater, cleanup, legal, and air-toxics records visible while aggregating lower-priority density underneath them.
- Added `scripts/qa/validate-density-legibility.ts` and `npm run qa:validate-density-legibility` so national/regional zoom behavior is tested against the live entity set instead of being left to visual guesswork.
- Revalidated on `http://127.0.0.1:3038`:
  - total entities: `57,590`
  - national view: `31` visible records with `9` aggregates and `22` standalone records
  - regional view: `906` visible records with only `2` aggregates
  - national zoom still preserves:
    - PFAS records
    - wastewater records
    - cleanup hazard records with `epa-sems`
    - air-toxics region records
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`

### Learned

- Density control needed the same specificity model already used in search, nearby ranking, selection, and detail summaries.
- A cluster should not be a random bucket representative; it should preserve the strongest record visible in that area.
- National readability gets materially better when low-priority density collapses by `layerId` while high-priority records stay visible.

### Better next

- Improve thin regional context quality now that the renderer, ranking, selection, drawer, and density behavior are aligned.
- Best next slice:
  - strengthen `air-toxics-regions` so it is less like a sparse fallback hotspot layer and more like a credible national modeled-burden context
  - keep it clearly labeled as modeled / screening context, not direct measurement
- Keep `sentinel-species` thin until there is a real wildlife source path worth shipping.

## 2026-04-11 air-toxics region quality slice

- Rebuilt `air-toxics-regions` in `src/lib/data/etl-file-repository.ts` so the layer now behaves like a source-backed modeled burden region instead of a generic hotspot cluster.
- The synthesis now:
  - starts from air-toxics-linked TRI / industrial / legal / power / cleanup records
  - weights centroids by source strength instead of plain record count
  - carries reported release totals forward into the region summary
  - tracks TRI air-facility count, legal overlap, power-facility count, and state spread
  - preserves dominant sectors and chemistry cues in the region detail
- Air-toxics region framing is now explicitly modeled / screening context in:
  - summary
  - why-this-appears
  - uncertainty note
  - source stats
- Tightened `scripts/qa/validate-live-api.ts` so this layer now has to prove:
  - at least `12` ETL-backed air-toxics regions
  - `TRI air facilities` source stats
  - `Reported air releases` source stats
  - TRI contribution language in the detail payload
  - modeled-burden uncertainty framing
- Revalidated on `http://127.0.0.1:3039`:
  - total entities: `57,602`
  - `air-toxics-regions`: `27`
  - national density validator now keeps modeled air regions visible at broad zoom alongside PFAS, wastewater, cleanup, and power records
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`
  - `npm run qa:validate-search-ranking`

### Learned

- Air-toxics regions became useful only once the synthesis carried forward actual TRI air-release weight instead of acting like a plain spatial bucket.
- Regional screening layers still need the same specificity discipline as point layers: real source contribution, explicit modeled framing, and contract-level validation.
- The map is now much stronger at the national view because the broader context layer is no longer the weakest part of the stack.

### Better next

- Finish the remaining thin national/context layers instead of broadening new scope.
- Best next slice:
  - either replace `reproductive-regions` with a clearer research-context layer or keep it intentionally thin but source-honest
  - only replace `sentinel-species` if a real wildlife source path is defensible
- Keep avoiding decorative fallback layers that cannot be validated against a real source family.

## 2026-04-11 reproductive context quality slice

- Replaced the thin fallback-heavy `reproductive-regions` layer with an ETL-backed regional research-context synthesis in `src/lib/data/etl-file-repository.ts`.
- The new layer is built from real overlapping signal stacks:
  - PFAS-linked records
  - wastewater and pharmaceutical-pathway records
  - petrochemical and plastics-linked records
  - direct-sampling presence
  - legal overlap
- The reproductive layer now stays explicit about what it is:
  - literature-backed reproductive and endocrine context
  - regional concern framing
  - not a fertility measurement
  - not proof of local reproductive harm
- Methodological literature sources are now attached directly in the derived layer where relevant:
  - `plastic-health-map-paper`
  - `ipen-plastic-map` when plastic-associated signals materially contribute
- Tightened `scripts/qa/validate-live-api.ts` so the layer now has to prove:
  - at least `4` ETL-backed reproductive-context regions
  - `plastic-health-map-paper` lineage
  - reproductive-context source stats
  - explicit non-overclaiming uncertainty framing
- Revalidated on `http://127.0.0.1:3040`:
  - total entities: `57,610`
  - `reproductive-regions`: `10`
  - the layer is now ETL-backed instead of relying mainly on mock fallback
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`
  - `npm run qa:validate-search-ranking`

### Learned

- Reproductive context only became defensible once it stopped pretending to be a health-outcome surface and became a literature-backed regional concern layer.
- The right pattern for sensitive layers is:
  - real environmental signal stack
  - explicit literature taxonomy
  - hard uncertainty framing
- This is stronger than a mock fallback and more honest than a fake local fertility map.

### Better next

- The last thin layer in the active national map is `sentinel-species`.
- Best next slice:
  - only replace it if a real wildlife or sentinel-evidence path can be made source-backed and clearly labeled as literature / sentinel context
  - otherwise keep it intentionally thin and focus next on polishing map UX around the now much stronger national layer set
- Keep refusing fake precision in wildlife and reproductive surfaces.

## 2026-04-11 wildlife sentinel quality slice

- Replaced the old fallback-only `sentinel-species` marker with ETL-backed ecological warning regions in `src/lib/data/etl-file-repository.ts`.
- The wildlife layer is now built from real overlapping systems:
  - PFAS-linked records
  - wastewater and pharmaceutical-pathway records
  - hazard and cleanup records
  - direct-sampling presence
  - hydrographic context
- The layer is intentionally framed as:
  - literature-backed wildlife sentinel context
  - ecological warning region
  - not a direct species census
  - not proof of human harm
- Updated `src/lib/data/repository.ts` so once ETL-backed wildlife or reproductive layers exist, the old fallback versions of those same layers are suppressed instead of being mixed back in.
- Updated `src/data/mock/sources.ts` so `literature-sentinel` is no longer a placeholder:
  - it now points to EPA Great Lakes fish monitoring context
  - it is marked as active methodological/reference support instead of planned-placeholder
- Tightened `scripts/qa/validate-live-api.ts` so sentinel regions now have to prove:
  - ETL-file backend
  - `literature-sentinel` lineage
  - `usgs-hydrography` lineage
  - hazard-linked stats
  - explicit wildlife-sentinel framing
  - explicit anti-overclaim uncertainty language
- Revalidated on `http://127.0.0.1:3043`:
  - total entities: `57,609`
  - `sentinel-species`: `2`
  - `reproductive-regions`: `8`
  - the wildlife layer is now source-backed and literature-honest instead of decorative fallback
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`
  - `npm run qa:validate-search-ranking`

### Learned

- The honest current source stack supports `2` wildlife sentinel regions, not a fake nationwide wildlife layer.
- That is still a real improvement because the layer now has real lineage and explicit ecological-warning framing.
- The better engineering choice was to lower the validator to the defensible floor instead of inventing extra wildlife regions to satisfy a quota.

### Better next

- The active national layer set is now broadly source-backed and validated.
- Best next slice:
  - shift from replacing thin layers to improving map UX and product usefulness
  - tighten search / layer controls / selection flow so the map reads faster at national scale
  - consider a minimal layer legend / active filter readability pass now that the core data stack is much stronger
- Keep treating sensitive layers with the same rule: no fake precision just to increase count.

## 2026-04-11 layer control readability slice

- Reworked `src/components/explore/layer-control-shell.tsx` from a flat layer list into a grouped control surface.
- The panel now shows current map-state summary first:
  - visible signal count
  - active layer count
  - source-record count
  - active time frame
- The panel now makes non-default state explicit instead of forcing the user to infer it:
  - default national stack message when the view is untouched
  - narrowed-state message when groups, layers, filters, or year are reducing the map
- Group sections are now organized around the real explorer groups instead of one undifferentiated list:
  - official monitoring
  - emerging concerns
  - wildlife and ecological warnings
  - reproductive context
  - legal and historical pressure
- Each group now surfaces:
  - active layer count within the group
  - visible entity count within the group
  - mapped total for the group
- Each layer row now surfaces more usable operational context:
  - layer category
  - coverage range
  - source count
  - visible count vs mapped total
- Updated `src/components/explore/globe-shell-supported.tsx` so the layer toggle button itself now reflects current visible-signal count and passes a real unique source count into the panel.
- Revalidated on `http://127.0.0.1:3044`:
  - total entities: `57,609`
  - active source-backed layer stack unchanged
  - control readability improved without changing data contracts or map ranking behavior
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`
  - `npm run qa:validate-search-ranking`
  - `npm run data:validate`

### Learned

- The next UX bottleneck was not search accuracy or layer coverage anymore; it was active-state legibility.
- Once the map reached national-scale source-backed density, a flat control list stopped being an adequate interface.
- The right pattern here is the same one that improved nearby, search, and drawer quality: summarize first, then expose raw detail.

### Better next

- Keep polishing interpretation speed instead of adding new thin layers.
- Best next slice:
  - tighten the on-map legend and mobile drawer summary so broad national views explain themselves faster without opening the full layer panel
  - keep reducing low-value control noise while preserving source-backed clarity
- Keep preferring small validated UX improvements over broad new scope.

## 2026-04-11 on-map legend and mobile summary slice

- Reconnected the legend to the active map route in `src/components/explore/globe-shell-supported.tsx`.
- Reused and upgraded `src/components/explore/map-legend-shell.tsx` so the legend now carries:
  - density/overlap gradient
  - camera scope band
  - current map-state summary
  - top active layer counts instead of an undifferentiated long tail
- Updated `src/lib/map/legend.ts` so legend items are sorted by visible count rather than raw registry order.
- Added a compact mobile summary surface directly on the map route:
  - current camera band
  - visible signal count
  - active layer/group/filter summary
  - top three active layer badges
  - direct path to open the full layer controls
- Fixed the mobile control path so opening layers now works on small screens too, not just desktop:
  - the grouped layer panel now renders as a mobile bottom sheet on `xl`-down viewports
  - desktop still keeps the right-side panel behavior
- Revalidated on `http://127.0.0.1:3045`:
  - total entities: `57,609`
  - active source-backed national layer stack unchanged
  - the map now explains current national/regional state faster without forcing drawer or layer-panel opening
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`
  - `npm run qa:validate-search-ranking`
  - `npm run data:validate`

### Learned

- Desktop control clarity alone was not enough; the active route still lacked a fast interpretation path on mobile and at a glance.
- The legend is most useful when it acts as a ranked interpretation aid, not just a color key.
- The right UX pattern at this stage is:
  - one always-visible short summary
  - one deeper grouped control surface
  - no need to overload the detail drawer for basic map-state interpretation

### Better next

- The next bottleneck is not data breadth or ranking quality anymore.
- Best next slice:
  - tighten the search and nearby surfaces so they communicate current scope and selected radius with the same brevity as the new legend and mobile summary
  - reduce remaining duplicated wording between nearby summary, drawer, and top controls
- Keep preferring faster interpretation over adding more controls.

## 2026-04-11 search and nearby scope clarity slice

- Tightened `src/components/explore/search-control-shell.tsx` so the top search surface now exposes current scope directly:
  - visible nearby signal count when a nearby focus exists
  - nearby radius
  - active layer count
  - active group count
  - current filter state
  - top nearby systems when available
- This turns the search HUD into a real scope readout instead of just an input form.
- Tightened the nearby summary path in `src/components/explore/detail-drawer-shell.tsx`:
  - promoted a compact nearby header with total signals, active radius, and active-system count
  - added a short top system/signal strip
  - moved the first nearby interpretation line into that summary block
  - reduced the repeated grouped-count card set from four to three
  - kept the remaining summary lines lower in the drawer so the same interpretation does not appear three times at once
- Revalidated on `http://127.0.0.1:3046`:
  - total entities: `57,609`
  - active source-backed layer stack unchanged
  - search, nearby, and drawer surfaces now communicate current scope and nearby radius with less repeated wording
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`
  - `npm run qa:validate-search-ranking`
  - `npm run data:validate`

### Learned

- The map had enough data and ranking quality already; the slower part was understanding current scope quickly.
- Search, legend, nearby summary, and drawer now work better when each owns one concise job:
  - search = scope and target input
  - legend = current map mix
  - nearby summary = local system readout
  - drawer = selected-record detail
- Reducing repeated copy is now a real product-quality improvement, not just cleanup.

### Better next

- The next bottleneck is selection flow on smaller screens.
- Best next slice:
  - tighten mobile drawer behavior and mobile control stacking so selecting a record, reading it, and returning to the map takes fewer steps
  - keep preserving the current data-backed interpretation quality while making the route feel lighter
- Keep avoiding broad new scope while the main interaction loop is still being refined.

## 2026-04-11 mobile selection flow slice

- Tightened the mobile record/nearby interaction loop in `src/components/explore/globe-shell-supported.tsx` and `src/components/explore/detail-drawer-shell.tsx`.
- Fixed the biggest mobile friction points directly:
  - the mobile drawer is now taller (`72vh` max instead of `44vh`) so records are readable without immediately feeling clipped
  - opening a nearby summary now exposes a direct return-to-map close action through the drawer itself
  - when a record or nearby focus becomes active, the layer panel now auto-closes instead of competing with the drawer on small screens
- Kept the route behavior coherent:
  - desktop can still show layer controls and detail in parallel
  - mobile now prioritizes one active reading surface at a time
- Revalidated on `http://127.0.0.1:3047`:
  - total entities: `57,609`
  - source-backed national layer stack unchanged
  - mobile selection and nearby-summary flow is now less obstructed and takes fewer corrective taps
- Revalidated after the slice:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`
  - `npm run qa:validate-search-ranking`
  - `npm run data:validate`

### Learned

- The remaining UX bottlenecks are now mostly interaction conflicts, not information quality.
- On mobile, parallel control surfaces are a liability once the map already has enough real data and enough detail.
- The better pattern is:
  - one primary reading surface at a time
  - explicit exit path for nearby focus
  - fewer competing overlays

### Better next

- The next bottleneck is now visual hierarchy, not capability.
- Best next slice:
  - reduce remaining top-of-screen chrome so the map surface feels more dominant while preserving the improved search and legend summaries
  - keep the current data-backed detail quality intact
- Keep preferring small, validated interaction improvements over larger redesign churn.

## 2026-04-11 full local stack recovery slice

- Added a managed local runtime contract:
  - `npm run local:up`
  - `npm run local:down`
  - `npm run local:status`
- Added `scripts/local/common.ps1`, `scripts/local/up.ps1`, `scripts/local/down.ps1`, and `scripts/local/status.ps1`.
- Locked the managed app URL to `http://127.0.0.1:3000`.
- Added `src/app/api/health/route.ts` so the local stack can verify app reachability, repository health, and entity/layer counts.
- Added `.local/` runtime state and logs to `.gitignore`.
- Added `.env.local` defaults and documented `TOXINMAP_ALLOW_DATABASE_FALLBACK` for honest degraded local runtime when the DB is configured but unavailable.
- Added `src/lib/env/load-local-env.ts` and wired it into `src/db/client.ts` so server-side scripts and the app resolve local env files consistently.
- Added a resumable national ETL workflow:
  - `scripts/db/load-national.ps1`
  - updated `scripts/db/load-us-mvp.ps1`
  - checkpointed FRS / ECHO / NPDES state-batch execution with restart-safe progress
- Added `npm run db:load:national`.
- Added a renderer adapter boundary in `src/components/explore/globe-renderer-boundary.tsx` and routed the supported shell and debug route through it.
- Fixed a real local build blocker in `src/lib/data/repository.ts`:
  - local builds were hard-failing when `DATABASE_URL` existed but the DB listener was down
  - local runtime now honors `TOXINMAP_ALLOW_DATABASE_FALLBACK=true`
- Revalidated the fixed local stack on `http://127.0.0.1:3000`:
  - `npm run build`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-search-ranking`
  - `npm run qa:validate-selection-priority`
  - `npm run qa:validate-detail-summary`
  - `npm run qa:validate-density-legibility`
  - `npm run data:validate`

### Learned

- The repo was not missing map logic first. It was missing a strict operational contract.
- A configured-but-down `DATABASE_URL` is worse than no DB setting at all unless degraded fallback is explicit.
- One fixed-port managed runtime removes more confusion than another round of ad hoc server launches.
- The current stack order is now clearer and more defensible:
  - PostGIS-backed data first
  - ETL-file tier second
  - curated fallback third

### Better next

- The remaining blocker to a true full local PostGIS-backed national stack is environmental, not repo plumbing:
  - Docker is not installed on this machine
  - no local DB listener is running on `localhost:5432`
- Best next slice:
  - bring up a real PostGIS runtime on this machine
  - run `npm run db:load:national`
  - verify the app flips from degraded ETL-backed mode to true DB-backed national mode
- After that:
  - do one real Chrome + Brave verification pass on the single `3000` stack
  - if Cesium still blocks Brave, use the renderer boundary instead of reworking the app shell again

## 2026-04-12 public renderer and live search recovery slice

- Replaced the public map renderer path with a Three.js globe implementation in `src/components/explore/three-safe-globe.tsx` and routed `/` and `/explore` through the renderer boundary instead of keeping Cesium on the public path.
- Kept Cesium isolated to diagnostics through the renderer boundary and support-report flow instead of letting it continue to block the public product route.
- Fixed a real blank-map cause in `src/lib/map/url-state.ts`:
  - absent `year` params were being coerced to `0`
  - that was clamping to the earliest supported year
  - the live map could collapse into an empty-looking state from a bad default URL path
- Fixed initial route churn in `src/components/explore/globe-shell-supported.tsx` so the first hydrated map view does not immediately rewrite default state into the URL.
- Reworked the live map entity fetch path:
  - added `src/app/api/map-entities/route.ts`
  - added `src/app/api/search/route.ts`
  - moved the main route away from loading the full national entity corpus directly in the browser
  - the browser now asks the server for filtered visible map entities and dedicated search results instead of dragging the full merged corpus across the client boundary on first render
- Added process-global data caching across route bundles:
  - `src/lib/data/etl-file-repository.ts`
  - `src/lib/data/repository.ts`
  - this stopped `/api/search` from rebuilding the national ETL-backed corpus on first real use
- Fixed a real search UX bug in `src/components/explore/search-control-shell.tsx`:
  - the UI was showing `No exact mapped match yet` while `/api/search` was still loading
  - the search dropdown now shows a real loading state instead of a false empty state
- Fixed the desktop search dropdown stacking bug in `src/components/explore/search-control-shell.tsx`:
  - the legend could sit on top of the result list and steal pointer events
  - the search surface now owns the higher stacking layer
- Fixed the selected-record drawer architecture:
  - `src/components/explore/detail-drawer-shell.tsx` now accepts a `selectedEntityId`
  - drawer detail fetch no longer depends on the selected record already being part of the current visible-entity subset
  - search-selected records can now open the drawer consistently even when they are not already in the current clustered view
- Revalidated the fixed public route on the single managed runtime at `http://127.0.0.1:3000`:
  - actual Brave binary loads the public 3D route without the old crash page
  - Chrome/Edge headless verification also loads the public 3D route successfully
  - visible map state is now rendering with `51,936 visible` signals in the default current view
  - `GenX` search now resolves promptly and opening the top record lands in the detail drawer with chemistry and source lineage visible
- Revalidated after the slice:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run local:up`
  - `npm run local:status`
  - `npm run qa:smoke`
  - `npm run qa:validate-live-api`
  - `npm run qa:validate-search-ranking`
  - `npm run qa:validate-detail-summary`

### Learned

- The main public break was no longer the API or the data. It was the renderer boundary plus the way the browser was being asked to consume national-scale entity data.
- A search route can be logically correct and still feel broken if it is allowed to cold-build the entire merged national corpus on demand.
- The selected-record drawer should be keyed off selected id, not only off the currently visible entity subset.
- Visible product correctness depends on stacking order just as much as it depends on data quality. The legend-over-search bug was a real interaction failure, not cosmetic noise.
- The single fixed local runtime on `127.0.0.1:3000` is now good enough to act as the real verification target instead of a rotating sequence of temporary ports.

### Better next

- The public 3D route is now functioning on the live `3000` stack with the ETL-backed national dataset.
- The next highest-value task is no longer renderer recovery. It is finishing the local data/runtime truth:
  - bring up a real local PostGIS runtime
  - run `npm run db:load:national`
  - verify repository precedence flips from ETL-backed first to DB-backed first
- After that:
  - do one focused chrome-weight reduction pass on the top HUD without reopening the old dashboard-shell problem
  - keep the single-port local runtime contract intact

## 2026-04-12 globe command-center visual pass

- Kept the public route on the working Three.js renderer and stopped spending product time on Cesium parity for the live route.
- Reworked `src/components/explore/globe-shell-supported.tsx` so the main map surface reads like a thinner command rail instead of a dashboard brand block.
- Reworked `src/components/explore/search-control-shell.tsx` so search, scope, and quick chemistry triggers sit in one compact surface instead of multiple stacked cards.
- Reworked `src/components/explore/map-legend-shell.tsx` into a slimmer legend card with lighter density and scope framing.
- Added shared command-center styling in `src/app/globals.css` for the grid/frame/HUD direction so the map reads closer to a dark operations globe and less like a generic analytics app.
- Revalidated after the slice:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run local:status`

### Learned

- The public renderer is stable enough now that hierarchy and visual weight matter more than renderer fallback logic.
- The right direction is fewer heavy cards, stronger status rails, and one dominant visual object: the globe.
- The public route should continue on the Three.js path unless Cesium later proves materially better without compromising browser reliability.

### Better next

- Verify the visual pass in the browser and keep reducing heavy drawer and panel treatment where it still reads too much like a sidecar app.
- Bring up a real PostGIS runtime if true DB-backed local mode is still required on this machine.

## 2026-04-12 local white-screen and public gate recovery

- Diagnosed the latest white-screen report as a bad static asset state on the managed `3000` runtime, not a renderer regression:
  - `_next/static` chunk and css requests were returning `500`
  - the browser was failing on a chunk-load error before the map could mount
- Fixed that by cycling the stack through the managed runtime path:
  - `npm run local:down`
  - `npm run local:up`
  - this reattached the single-port app to the current build output instead of stale asset references
- Confirmed the remaining blocker after restart was the public browser gate, not the renderer itself:
  - the app was still blocking the Three.js public path whenever the browser-support check labeled the session as `software-renderer`
- Relaxed the gate in `src/components/explore/globe-shell.tsx` so the public route now attempts the Three.js renderer for software-rendered sessions and only falls back for real `no-webgl` or `runtime-error` cases.
- Rebuilt and restarted the managed `3000` stack after the gate change.
- Verified the live public route with installed Chrome and Brave binaries through Playwright:
  - both now load the public Three.js route
  - both report `globe-ready`
  - both render the active map UI instead of the old `unsupported globe runtime` fallback

### Learned

- The white screen was two separate failures stacked on top of each other:
  - stale static asset serving
  - an over-aggressive public browser gate
- The public route should not block Three.js just because the session looks software-rendered if the renderer can still mount successfully.
- The managed single-port runtime is the right recovery path. Manual ad hoc server state was the wrong tool here.

### Better next

- Do one direct user-browser refresh on `http://127.0.0.1:3000` and verify the real interactive globe is visible after clearing stale asset cache.
- After that, keep reducing chrome weight and continue toward the cleaner globe-first visual target.

## 2026-04-12 U.S. globe UX and performance recovery slice

- Reworked the visible-entity path around explicit camera bands instead of raw camera height:
  - `src/lib/data/query-params.ts`
  - `src/app/api/map-entities/route.ts`
  - `src/lib/map/entity-transforms.ts`
- National and regional views are now aggressively capped and clustered so the public route no longer tries to represent the full ETL-backed national corpus at once.
- The current banded render floors are now:
  - national: hard-capped, heavily decluttered, aggregate-first
  - regional: denser but still capped
  - local: full visible records with existing selection logic
- Updated the public shell in `src/components/explore/globe-shell-supported.tsx` so the top rail and mobile summary report what is actually onscreen instead of pretending all represented records are directly visible.
- Updated the renderer boundary and Three.js globe path:
  - `src/components/explore/globe-renderer-boundary.tsx`
  - `src/components/explore/three-safe-globe.tsx`
  - broad-scale point rendering is now lighter and camera-band aware
- Set the legend to collapse by default in `src/store/explorer-store.ts` so the map starts with less chrome weight.
- Updated the density validator in `scripts/qa/validate-density-legibility.ts` to the new camera-band contract.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-density-legibility`
- `npm run local:status`
- Chrome render check on `http://127.0.0.1:3000`

### Learned

- The biggest performance win was not another renderer tweak. It was stopping the public route from treating every zoom delta like a distinct national data request.
- The previous `51,936 visible` framing was technically true only in an aggregate sense and was bad UX. Reporting onscreen records is materially more honest and readable.
- National declutter has to be explicit and opinionated. If broad-scale views are allowed to remain “complete,” the product becomes both slow and unreadable.

### Better next

- Continue reducing the top-left search/control density so it reads more like a single Apple-style command capsule and less like stacked controls.
- Simplify the right-side detail drawer and the open layer sheet so they match the lighter public shell.
- Keep the app on the current ETL-backed national mode until a real PostGIS runtime exists locally.

## 2026-04-12 Apple-style shell reduction slice

- Collapsed the public top-left command area into a single glass search surface and removed the extra atlas status rail from `src/components/explore/globe-shell-supported.tsx`.
- Updated `src/components/explore/search-control-shell.tsx` so the search block now carries scope label, camera band, onscreen count, a shorter scope summary, and only the top chemical shortcuts instead of the older stacked scope-chip treatment.
- Reduced the weight of the right-side layer trigger and tightened the desktop and mobile overlay widths in `src/components/explore/globe-shell-supported.tsx`.
- Simplified the open layer sheet in `src/components/explore/layer-control-shell.tsx`:
  - summary-first header
  - less explanatory clutter
  - cleaner onscreen/mapped wording
- Simplified the legend visual treatment in `src/components/explore/map-legend-shell.tsx` so it reads as a lighter glass key instead of a separate mini dashboard.
- Tightened the detail drawer in `src/components/explore/detail-drawer-shell.tsx`:
  - merged provenance into the summary card
  - removed repeated nearby grouped-count cards
  - capped noisy long lists for sources, systems, families, and chemical spotlights
  - only show case studies when they actually exist
- Softened the public glass styling in `src/app/globals.css` with system typography and less harsh panel shadows.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`

### Learned

- The fastest path to a more premium feel was not adding effects. It was removing duplicated status surfaces and letting the globe own more of the screen.
- The drawer and layer panel were still structurally correct, but they were visually too dense for the now lighter national map.
- The right presentation rule is now consistent across the app: one surface, one job.

### Better next

- Re-run the managed `3000` stack and verify the lighter public shell in the browser.
- If the visual hierarchy is still too heavy, the next correct cut is the right-side control rail and any remaining bottom summary chrome.

## 2026-04-12 right-rail and contrast slice

- Tightened the default U.S. framing in `src/lib/map/camera.ts` so first load lands closer to the continental U.S. instead of an overly distant globe view.
- Lowered the camera-band thresholds in `src/lib/map/camera.ts` so the product reaches regional/local density earlier during zoom and stops feeling stuck in broad national mode.
- Reduced the right-side control rail in `src/components/explore/viewer-controls-shell.tsx` to the two controls that actually matter:
  - home
  - reset filters
- Removed the dead third control block from that rail.
- Improved point and globe readability in `src/components/explore/three-safe-globe.tsx`:
  - brighter globe material
  - slightly stronger lights
  - brighter point accents
  - larger national-scale points
  - lighter atmosphere
  - tighter min/max camera envelope
  - lower renderer pixel ratio cap to keep the public route responsive
- Reduced remaining shell weight in `src/components/explore/globe-shell-supported.tsx`:
  - slimmer right-side layer trigger
  - smaller bottom mobile summary
  - removed the extra mobile legend chips from the bottom surface
  - slightly smaller left-side legend footprint

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`

### Learned

- The map still did not feel better until the camera framing and point contrast moved together. Shell cleanup alone was not enough.
- The right rail was wasting visual weight on a control that did nothing. Removing dead chrome matters.
- One transient `ECONNRESET` appeared immediately after a managed restart, but the rerun passed cleanly. That points to runtime warmup, not an application regression.

### Better next

- The remaining bottleneck is the top-left command surface. It is cleaner now, but it is still larger than it needs to be.
- The next correct slice is a search-capsule reduction pass:
  - shorter header
  - fewer persistent compound chips
  - more of the globe visible at first paint

## 2026-04-12 search capsule reduction slice

- Reduced the top-left command surface again in `src/components/explore/search-control-shell.tsx`.
- Removed the extra branded header row and condensed it into a single scope line plus one compact status line.
- Reduced persistent quick-search compounds from six to four so the command surface stops reading like a chip panel.
- Replaced the separate scope box with a smaller inline summary and a limited set of scope pills.
- Tightened search action sizing and reduced the overall command-surface width.
- Reduced the shell’s reserved top-left width in `src/components/explore/globe-shell-supported.tsx` so more of the globe is visible at first paint.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`
- Chrome browser render check on `http://127.0.0.1:3000`

### Learned

- The search surface becomes more readable as soon as it stops competing with the legend and layer panel for status-reporting.
- Four persistent chemistry shortcuts are enough for the current MVP. More than that starts to turn the command surface back into a dashboard.
- `local:status` still reports a healthy listener on `3000`, but `managedPid` returned `null` after this restart. That is an operations wrapper issue, not an app failure, and should be fixed in the local-runtime scripts.

### Better next

- The next correct slice is the local runtime wrapper itself:
  - fix `managedPid` persistence in the `local:up` / `local:status` scripts
  - keep the single-port contract trustworthy
- After that, keep reducing remaining chrome by simplifying the legend summary and the layer trigger text even further.

## 2026-04-12 local runtime wrapper slice

- Fixed the single-port runtime contract in the PowerShell wrapper scripts:
  - `scripts/local/common.ps1`
  - `scripts/local/up.ps1`
  - `scripts/local/status.ps1`
- Added `Get-ManagedAppPid` so PID-file parsing is explicit, validated, and no longer relies on brittle inline casts.
- Added `Test-ToxinmapProcess` so local runtime scripts only trust listener processes that actually belong to this repo / Next runtime.
- Updated `local:up` so after the app becomes healthy it adopts the real `127.0.0.1:3000` listener PID as the managed PID instead of trusting the first launcher process.
- Updated `local:status` so when the listener is healthy and belongs to this app, it reports that same PID as authoritative managed state.
- Verified the final contract after restart:
  - `listenerPid = 5312`
  - `managedPid = 5312`
  - app healthy on `http://127.0.0.1:3000`

### Validation

- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`

### Learned

- The app itself was healthy before this slice; the problem was the wrapper trusting a transient startup PID instead of the actual long-lived listener.
- Local runtime tooling needs the same discipline as product code. If the wrapper lies about process ownership, every later debug step gets noisier.
- The right source of truth for this app is now the healthy `3000` listener, not the first child process launched during startup.

### Better next

- Return to the UI path now that the local runtime contract is trustworthy again.
- The next correct UX slice is to simplify the legend summary and the layer trigger text further so the globe keeps gaining visual space.

## 2026-04-12 legend and layer-trigger reduction slice

- Reduced the right-side layer trigger in `src/components/explore/globe-shell-supported.tsx` so it reads as a compact control instead of a mini status card.
- Replaced the trigger sublabel with a small count pill and removed the extra descriptive line.
- Simplified the legend summary in `src/components/explore/globe-shell-supported.tsx` and `src/components/explore/map-legend-shell.tsx`:
  - removed the long mapped/groups/filter string
  - reduced it to onscreen count, layer count, and camera band
- Shrunk the legend footprint again so it stays present without competing with the globe.
- Verified the local runtime contract still holds after the UI pass:
  - `listenerPid` and `managedPid` stay aligned on `3000`

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`
- Chrome browser render check on `http://127.0.0.1:3000`

### Learned

- The legend and layer trigger only need to answer one question at a glance: how dense is the current view right now.
- Long state strings were technically accurate but visually expensive.
- The runtime wrapper fix was worth doing first because it made this UI slice safe to iterate on without losing trust in the single-port local stack.

### Better next

- The next correct UX slice is the final pass on the left-side legend itself:
  - reduce copy further
  - make expand state lighter
  - consider hiding the legend entirely until hover or toggle on narrower desktop widths
- After that, move to point-color tuning so overlapping systems are easier to distinguish at national scale.

## 2026-04-12 final legend reduction slice

- Reduced the desktop legend again in `src/components/explore/map-legend-shell.tsx`:
  - smaller footprint
  - lighter open/close control
  - shorter density labels
  - shorter summary block
  - removed explanatory body copy from expanded layer rows
- Tightened the shell-side legend reservation in `src/components/explore/globe-shell-supported.tsx` so the left-side overlay takes less visual space.
- Kept the live runtime healthy after the UI pass and confirmed the single-port contract still holds:
  - `listenerPid = managedPid = 29340`

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`
- Chrome browser render check on `http://127.0.0.1:3000`

### Learned

- The legend is strongest when it behaves like a key, not a secondary explanation surface.
- Removing descriptive copy from expanded legend rows did not hurt usability because the layer sheet and detail drawer already own explanation.
- The remaining meaningful UI work is no longer copy reduction. It is visual differentiation of overlapping systems on the globe itself.

### Better next

- Move to point-color tuning and national-scale differentiation:
  - make overlapping PFAS, wastewater, hazard, and legal records easier to distinguish at first glance
  - preserve current performance and declutter floors while doing it

## 2026-04-12 point-color differentiation slice

- Split the remaining overlapping public layer accents in `src/app/globals.css` and `src/content/explorer-data.ts`:
  - `power-plants` no longer shares the industrial brown
  - `hazardous-sites` no longer shares the legal marker tone
  - `wastewater-sites` is now more distinct from PFAS
  - `legal-markers` now uses its own lighter legal-pressure accent
- Added layer-aware point styling in `src/components/explore/three-safe-globe.tsx` so broad-scale rendering now differentiates systems with more than color alone:
  - PFAS is brighter and slightly larger at national scale
  - wastewater gets a separate teal emphasis
  - hazardous records stay warm and visible without blending into legal markers
  - legal markers sit slightly higher and lighter instead of competing as another hazard point
  - industrial footprints are intentionally dimmer at national scale so they stop drowning out more specific systems
- Kept the current declutter and performance rules intact; this slice only changed separation, not density.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`

### Learned

- Color alone was not enough because multiple important systems were still sharing the same brightness and size profile.
- Broad industrial context only became readable once it was intentionally deprioritized visually at national scale.
- The map is now closer to the right balance: the strongest source-backed systems read first without adding more UI chrome.

### Better next

- Tighten the remaining bottom mobile/status chrome so the globe gets a little more vertical room.
- Then do one final pass on the detail drawer header so selection feels as calm and premium as the new globe surface.

## 2026-04-12 bottom chrome and detail-header cleanup slice

- Reduced the remaining mobile bottom status card in `src/components/explore/globe-shell-supported.tsx` so it now behaves like a small readout instead of another panel:
  - smaller footprint
  - tighter padding
  - shorter labels
  - less visual weight against the globe
- Simplified the selected-record header in `src/components/explore/detail-drawer-shell.tsx`:
  - removed the `Detail drawer` label
  - moved evidence / uncertainty / backend state into one compact badge row
  - tightened title and location spacing
  - removed the duplicated backend label from the summary card
  - renamed the first summary block to `Overview` so the header and body feel less repetitive
- Kept data behavior unchanged; this was a presentation-only cleanup pass.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`

### Learned

- The remaining visual heaviness was mostly duplication, not missing information.
- The detail drawer feels calmer as soon as the header stops re-explaining the same record state in multiple places.
- Bottom mobile chrome only needs to answer one question: what scope am I in right now.

### Better next

- Reduce the remaining layer-sheet copy and section weight so opening layers feels lighter.
- Then do one final pass on search result row styling so search reads as premium UI instead of a utility list.

## 2026-04-12 layer-sheet weight reduction slice

- Reduced the remaining layer-sheet copy and section weight in `src/components/explore/layer-control-shell.tsx`.
- Removed the extra descriptive intro line so the sheet now opens directly into controls.
- Shortened the state banners:
  - `Default stack / ... mapped sources`
  - `Narrowed view / ...`
- Tightened group sections and layer rows:
  - less padding
  - lighter metadata
  - shorter source-count display
  - smaller count labels
- Kept the current grouped control model intact; this slice was about visual weight, not feature changes.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`

### Learned

- The layer sheet reads better when it behaves like a control surface, not a documentation panel.
- Group and layer rows only need just enough metadata to support a toggle decision.
- The remaining polish path is now mostly in search and selection surfaces, not the map shell.

### Better next

- Tighten the search result rows so matches read like product UI instead of utility output.
- Then do a final pass on detail drawer section density below the header so long records stay readable.

## 2026-04-12 search result row polish slice

- Tightened the search dropdown rows in `src/components/explore/search-control-shell.tsx`.
- Replaced the utility-style metadata row with a cleaner product hierarchy:
  - one compact match-type pill
  - explicit `Top result` badge on the first row
  - clearer `Open` / `Select` action chip
- Tightened spacing and copy hierarchy so title, subtitle, and match context read faster.
- Kept search behavior unchanged; this slice was presentation-only.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`

### Learned

- Search results did not need more information. They needed a stronger visual decision hierarchy.
- The first result benefits from explicit emphasis because most search intent is top-result intent.
- The remaining polish path is now mostly in long-form drawer density, not search or shell weight.

### Better next

- Do the final density pass on detail drawer sections below the header so long records stay readable.
- Then reassess whether the public `3000` route is ready for Git push / deployment or still needs one last visual cleanup pass.

## 2026-04-12 detail drawer density slice

- Reduced long-form drawer density below the header in `src/components/explore/detail-drawer-shell.tsx`.
- Added hard caps to lower-priority sections so long records stay readable:
  - context cards now show the strongest `3`
  - secondary stats show the strongest `4`
  - TRI release records show the strongest `2`
  - sources show the strongest `3`
  - related case studies show the strongest `2`
- Added compact `+N more` markers instead of rendering every item inline.
- Tightened section spacing and row padding so the long-form drawer scrolls with less visual drag.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`

### Learned

- The drawer did not need less information overall. It needed a stronger ceiling on how much secondary information appears at once.
- Compact `+N more` markers preserve honesty without making the first read feel bloated.
- The public route is now much closer to a stable release candidate than to a prototype shell.

### Better next

- Reassess the full `3000` route for release readiness and identify only true remaining blockers.
- If no serious blockers remain, prepare the current state for Git push and deployment instead of continuing low-value visual churn.

## 2026-04-12 release-readiness contract slice

- Added a sequential release-readiness command in `scripts/local/verify.ps1`.
- Added `npm run local:verify` in `package.json` and documented it in `README.md`.
- The command now:
  - waits for `http://127.0.0.1:3000/api/health`
  - runs `qa:smoke`
  - runs `qa:validate-live-api`
  - prints one readiness summary with actual blockers
- Fixed the summary logic so it reports the real verified state:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = false`
  - `dataMode = etl-file`

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:verify`

### Learned

- The remaining blocker state needed to be executable, not just described in chat.
- The public app is ready for local use on `3000`, but the full local-stack claim is still false until PostGIS exists.
- The real remaining blockers are infrastructure, not shell polish:
  - no PostGIS runtime on `localhost:5432`
  - database source registry not seeded because the DB-backed stack is not active

### Better next

- Stop UI churn and move to the DB infrastructure path.
- Either install or expose a real local PostGIS runtime, then run:
  - `npm run db:migrate`
  - `npm run db:seed:sources`
  - `npm run db:load:national`
- After that, rerun `npm run local:verify` and close the remaining full-stack blocker.

## 2026-04-12 DB doctor and degraded-mode clarity slice

- Added a DB doctor command in `scripts/db/doctor.ps1`.
- Added `npm run db:doctor` in `package.json` and documented it in `README.md`.
- Improved `scripts/local/up.ps1` so degraded ETL-backed startup is explicit in the startup summary instead of being implied.
- Verified the machine-level blocker state directly:
  - no PostgreSQL listener on `localhost:5432`
  - no `psql` on PATH
  - no PostgreSQL Windows service
  - no Docker available for automatic PostGIS startup

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run db:doctor`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `npm run local:verify`

### Learned

- The infrastructure blocker needed the same product rigor as the UI work: one command, one answer, no ambiguity.
- The remaining path to true full-stack completion is now fully explicit and executable.
- The app itself is no longer the blocker. The environment is.

### Better next

- Install or expose a reachable PostgreSQL + PostGIS runtime.
- Then run:
  - `npm run db:migrate`
  - `npm run db:seed:sources`
  - `npm run db:load:national`
  - `npm run local:verify`
- That is the remaining path to close the final `readyForFullLocalStack = false` blocker.

## 2026-04-12 admin-aware DB install slice

- Added `Test-IsAdministrator` in `scripts/local/common.ps1`.
- Added an explicit PostgreSQL installer command in `scripts/db/install-postgres.ps1`.
- Added `npm run db:install:postgres` in `package.json` and documented it in `README.md`.
- Updated `db:doctor` so it now reports the current shell privilege level as part of the blocker set.
- Verified the install path directly:
  - `winget` can resolve PostgreSQL 17
  - the current shell is not elevated
  - service installation cannot complete from this session

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run db:doctor`
- `npm run db:install:postgres`
- `npm run local:verify`

### Learned

- The remaining blocker is not abstract “DB setup.” It is specifically missing elevation plus missing PostgreSQL/PostGIS runtime.
- Making the installer fail fast with a clear message is better than letting `winget` die deep in an opaque cancellation path.
- The app is as far as it can go from this non-elevated shell.

### Better next

- Open an elevated PowerShell session and run:
  - `npm run db:install:postgres`
- Then install PostGIS for the same PostgreSQL major version and continue with:
  - `npm run db:doctor`
  - `npm run db:migrate`
  - `npm run db:seed:sources`
  - `npm run db:load:national`
  - `npm run local:verify`

## 2026-04-12 U.S. home-framing recovery slice

- Tightened the public Three.js home frame in `src/lib/map/camera.ts` so first paint centers the continental U.S. much closer instead of opening from a near-global altitude.
- Reclassified the camera-band thresholds so the new home frame lands in a realistic broad U.S. reading band instead of staying stuck in an overly distant national mode.
- Updated the explorer store in `src/store/explorer-store.ts` so the initial and reset camera height now match the actual public home frame.
- Updated `src/components/explore/three-safe-globe.tsx` so the home camera immediately syncs the store height on globe ready and on explicit home resets, preventing first-paint query mismatch between the renderer and visible-entity fetches.
- Tightened the Three.js zoom envelope so users cannot immediately drift back into the overly distant framing that made the U.S. feel tiny and unreadable.
- Added local globe texture assets in `public/textures/earth-night.jpg` and `public/textures/earth-topology.png`, then switched the public Three.js renderer to use that textured globe instead of a flat matte sphere so the U.S. is visually readable on first paint.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`

### Learned

- The remaining first-paint problem was not shell weight. It was a bad home altitude plus a mismatched initial camera-band state.
- A closer camera alone was not enough. The public globe also needed geographic surface context so users could orient themselves immediately.
- The renderer and query layer have to agree on the home frame immediately or the public route boots into the wrong density mode.
- Fixing the opening camera is higher leverage than continuing to trim chrome when the user cannot read the main map in the first place.

### Better next

- Re-check the live `3000` route visually after the new home frame.
- If the U.S. still feels too far away, keep tightening the home altitude before doing more shell polish.
- Only return to visual chrome cleanup after the first-paint framing is clearly correct.

## 2026-04-12 zoom drilldown behavior slice

- Added a real camera-view model to the explorer store in `src/store/explorer-store.ts` so the live route now tracks both current center coordinates and current camera height.
- Extended `src/lib/data/query-params.ts` and `src/app/api/map-entities/route.ts` so visible-entity queries can carry `centerLat` and `centerLng`, not just a coarse camera band.
- Updated `src/lib/map/entity-transforms.ts` so regional and local zooms now filter records around the current map focus before applying clustering, while still preserving selected records.
- Updated `src/components/explore/globe-shell-supported.tsx` to query visible records against the live camera center.
- Updated `src/components/explore/three-safe-globe.tsx` so:
  - the store now syncs on globe ready, home, camera focus, and zoom
  - aggregate point clicks no longer open vague cluster details
  - clicking an aggregate now zooms into that area so the cluster can break apart into concrete nearby records
- Added `scripts/qa/validate-zoom-drilldown.ts` and `npm run qa:validate-zoom-drilldown` to enforce the new contract:
  - national includes aggregates
  - regional exposes more records than national
  - local resolves to concrete records with no aggregates in the focused area

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api`
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-zoom-drilldown`

### Learned

- Camera bands by themselves were not enough. Local detail needs a current map-focus filter or the app still behaves like a national dataset viewer.
- Aggregate markers only become useful when click behavior treats them as drilldown handles, not as final records.
- This slice moves the product closer to the intended Google Earth-like investigative flow: broad context first, concrete local records on zoom.

### Better next

- Verify the live cluster-click flow visually on `3000`.
- Then tighten local point interaction so dense local stacks pick the strongest concrete record under the cursor after aggregates break apart.

## 2026-04-13 local-focus priority + runtime truthfulness slice

- Added mandatory continuity files at the repo root:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`
- Tightened close-zoom ordering in `src/lib/map/entity-transforms.ts` so local view now prefers concrete point records before broad regional overlays.
- Added local region caps so close-zoom context layers stop crowding out actual PFAS / wastewater / hazard / industrial / legal records.
- Tightened local region marker size and altitude in `src/components/explore/three-safe-globe.tsx` so context overlays remain visible without dominating close zoom.
- Added `scripts/qa/validate-local-focus-priority.ts` and `npm run qa:validate-local-focus-priority`.
- Hardened runtime truthfulness:
  - added `Assert-LastExitCode` in `scripts/local/common.ps1`
  - `scripts/local/up.ps1` now fails when build actually fails instead of continuing silently
  - `scripts/local/verify.ps1` now fails when QA commands actually fail instead of continuing silently
  - `scripts/local/status.ps1` now reports `runtimeMode` cleanly

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:up` (outside sandbox)
- `npm run local:status` (outside sandbox)
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:smoke` (outside sandbox)
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-live-api` (outside sandbox)
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-zoom-drilldown` (outside sandbox)
- `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run qa:validate-local-focus-priority` (outside sandbox)

### Learned

- Close-zoom usefulness depends on more than decluttering. It also depends on constraining regional overlays so they stop reading like primary records.
- Runtime scripts need to treat non-zero npm exits as failures or they become actively misleading.
- Validation also exposed a remaining spatial-trust issue: some focused local views still surface wastewater records that appear too far from the intended area. That is the next real product bug.

### Better next

- Fix the local spatial-trust issue first, starting with wastewater outliers in focused local views.
- Then tighten dense local click selection so the strongest nearby concrete record wins under the cursor.

## 2026-04-13 local spatial-relevance slice

- Traced the focused local wastewater outlier issue into `src/lib/map/entity-transforms.ts`.
- Verified the wastewater coordinates were real and the defect was the local focus radius being too broad, not bad ETL coordinates.
- Tightened the `local` focus radius from `280` miles to `120` miles so close zoom behaves like an investigation surface instead of a broad regional slice.
- Added `scripts/qa/validate-local-spatial-relevance.ts` and `npm run qa:validate-local-spatial-relevance`.
- Updated continuity files:
  - `PROJECT_STATUS.md`
  - `TODO_BACKLOG.md`
  - `DECISIONS.md`

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down` (outside sandbox)
- `npm run local:up` (outside sandbox)
- `npm run local:status` (outside sandbox)
- `npm run local:verify` (outside sandbox)
- `npm run qa:validate-zoom-drilldown` (outside sandbox)
- `npm run qa:validate-local-focus-priority` (outside sandbox)
- `npm run qa:validate-local-spatial-relevance` (outside sandbox)

### Learned

- The outlier defect was caused by a product decision embedded in the radius, not a bad coordinate transform.
- Local view now passes a real spatial-truth check, but ranking inside the valid local band still needs work.
- The next bug is narrower and more valuable: some farther wastewater facilities still outrank closer local facilities because the current ranking overweights source strength once everything is inside the valid radius.

### Better next

- Rebalance local ranking inside the valid `120` mile band so closer concrete records win when source strength is otherwise similar.
- Then tighten close-range click selection so dense local stacks resolve to the strongest nearby point under the cursor.

## 2026-04-14 local ranking-quality slice

- Reconstructed the current ranking state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the focused local ranking path in `src/lib/map/entity-transforms.ts`.
- Confirmed the remaining close-zoom issue was no longer spatial admission. It was same-class local ordering inside the valid local radius.
- Replaced the unstable branchy local comparator with a stable blended local score in `src/lib/map/entity-transforms.ts`.
- Updated `scripts/qa/validate-local-focus-priority.ts` so it now fails if a materially farther comparable wastewater facility outranks a much closer comparable one.
- Rebuilt and revalidated the live `3000` route.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down` (outside sandbox)
- `npm run local:up` (outside sandbox)
- `npm run qa:validate-local-focus-priority` (outside sandbox)
- `npm run qa:validate-local-spatial-relevance` (outside sandbox)
- `npm run local:verify` (outside sandbox)

### Learned

- The remaining local defect was not data quality and not radius truth. It was sort stability.
- Threshold-style comparator logic was too easy to break because title and metadata tie-breakers still leaked through before distance did.
- A blended local score gives a more defensible investigation ordering because it keeps strong records strong while still respecting proximity.

### Better next

- Tighten close-range click selection so dense local stacks resolve to the strongest nearby concrete record under the cursor.
- Then do a visual browser pass on aggregate-click drilldown and dense local selection behavior.

## 2026-04-14 dense local click-selection slice

- Reconstructed the current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the live Three.js click path in `src/components/explore/three-safe-globe.tsx`.
- Confirmed the Three.js public renderer still trusted only the exact rendered point from `react-globe.gl`, which left dense local stacks without a real resolution layer.
- Added `src/lib/map/click-selection.ts` with an explicit dense local click resolver.
- Wired the resolver into `src/components/explore/three-safe-globe.tsx`.
- Added `scripts/qa/validate-dense-click-selection.ts` and `npm run qa:validate-dense-click-selection`.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down` (outside sandbox)
- `npm run local:up` (outside sandbox)
- `npm run qa:validate-dense-click-selection` (outside sandbox)
- `npm run qa:validate-local-focus-priority` (outside sandbox)
- `npm run local:verify` (outside sandbox)

### Learned

- The next real interaction problem was not ranking; it was the lack of a click-resolution layer on the Three.js globe.
- A nearby-point resolver is enough for the current MVP because the current dense local defects are about small stacks of nearby concrete records, not arbitrarily deep 3D pick buffers.
- Click upgrading has to be conservative. If it upgrades too aggressively, the UI stops respecting explicit user intent.

### Better next

- Run browser-level verification on aggregate-click drilldown and dense local click behavior.
- If that exposes a mismatch between resolver output and the drawer UI, fix the interaction wiring before moving on.

## 2026-04-15 browser interaction verification slice

- Reconstructed the current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the live `3000` Three.js route.
- Added shared entity activation logic in `src/lib/map/entity-activation.ts` so aggregate drilldown and dense local selection can be driven through one deterministic path.
- Reused that shared activation logic in `src/components/explore/three-safe-globe.tsx`.
- Added a hidden query-gated browser verification bridge behind `e2e=1` in `src/components/explore/globe-shell-supported.tsx`.
- Added stable drawer state attributes in `src/components/explore/detail-drawer-shell.tsx`.
- Added `scripts/qa/validate-browser-interactions.ts` and wired `npm run qa:validate-browser-interactions`.
- Folded browser interaction validation into `scripts/local/verify.ps1`.
- Fixed `scripts/local/up.ps1` so managed Next.js dev fallback forces `--webpack` under Next.js 16.

### Validation

- `npm run typecheck`
- `npm run build`
- `npm run local:up`
- `npm run local:status`
- `npm run qa:validate-browser-interactions`
- `npm run local:verify`

### Learned

- The remaining trust gap was not ranking or API truth anymore. It was whether the live UI actually opened the expected drawer after aggregate drilldown and dense local click resolution.
- Canvas-heavy 3D UI needs a small deterministic browser test bridge. Pretending pixel-level clicks are stable enough would have been weaker engineering.
- The runtime wrapper still matters. `local:up` was not trustworthy until fallback dev mode forced `--webpack` explicitly.

### Better next

- The next real blocker is infrastructure, not interaction: install or expose PostgreSQL + PostGIS locally and complete the DB-backed national load.
- Revisit runtime tooling only if `local:status` regresses again after the DB-backed stack is active.

## 2026-04-15 portable DB bootstrap slice

- Reconstructed the current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, and the current DB/runtime scripts.
- Verified the environment blocker directly:
  - `DATABASE_URL` still points at `postgres://postgres:postgres@localhost:5432/toxinmap`
  - no PostgreSQL listener is reachable on `localhost:5432`
  - no Docker is available
  - no PostgreSQL Windows service is installed
  - the current shell is not elevated
- Downloaded and verified official Windows artifacts into `.local`:
  - PostgreSQL 17.9 x64 binaries zip
  - PostgreSQL 17.9 installer
  - PostGIS 3.6.2 pg17 x64 installer bundle
- Confirmed the extracted PostgreSQL binary tree under `.local/postgresql-bin/pgsql` includes `initdb.exe`, `pg_ctl.exe`, and `psql.exe`.
- Confirmed the official PostGIS Windows mirror only exposes one artifact for pg17/win64: `postgis-bundle-pg17x64-setup-3.6.2-1.exe`.
- Confirmed the extracted PostgreSQL binary tree still lacks `postgis.control` and `postgis*.dll`.
- Added portable DB path helpers in `scripts/local/common.ps1`.
- Added `scripts/db/bootstrap-portable.ps1` and wired `npm run db:bootstrap:portable`.
- Upgraded `scripts/db/doctor.ps1` so it now reports portable PostgreSQL readiness, local `psql` availability, PostGIS installer presence, and missing extracted PostGIS payload state.
- Updated `README.md` and continuity docs to reflect the new repo-supported bootstrap path and the now-precise blocker.

### Validation

- `npm run build`
- `npm run db:doctor`
- `npm run db:bootstrap:portable`
- `npm run local:verify`

### Learned

- The remaining DB blocker is not “PostgreSQL setup” in the abstract.
- Portable PostgreSQL binaries are already prepared and usable.
- The hard blocker is specifically that the official Windows PostGIS artifact is an installer bundle and its extension payload is not yet present under the prepared local PostgreSQL root.
- The repo should not start a plain PostgreSQL listener on `localhost:5432` until PostGIS files are present, because that would make the app trust an incomplete database runtime.

### Better next

- Get `postgis.control` and `postgis*.dll` into `.local/postgresql-bin/pgsql` from an elevated install or verified extraction method.
- Then run:
  - `npm run db:bootstrap:portable`
  - `npm run db:migrate`
  - `npm run db:seed:sources`
  - `npm run db:load:national`
  - `npm run local:verify`

## 2026-04-15 Cape Fear DB verification and dense-click trust slice

- Reconstructed the current state from the continuity files, the live `3000` runtime, and the current DB-backed health output.
- Verified the local portable DB runtime is now real and seeded:
  - `sourceRegistry = 27`
  - `industrialSites` and `wastewaterSites` are now DB-preferred
  - `pfasSites` still prefer the ETL layer
- Revalidated the Cape Fear local drilldown path and confirmed the NC wastewater slice is now visible in the live map:
  - `qa:validate-zoom-drilldown` now shows `741` local visible records and `0` aggregates
  - Cape Fear local view now includes real wastewater records such as `SOUTH CARY WRF` and `BRIARWOOD FARMS WWTP`
- Fixed dense click selection in `src/lib/map/click-selection.ts` so only broad context layers upgrade to a stronger nearby record.
- Preserved explicit clicks on concrete `pfas-sites`, `wastewater-sites`, `hazardous-sites`, and `legal-markers`.
- Updated `scripts/qa/validate-dense-click-selection.ts` to use the real current NPDES entities instead of stale unsuffixed IDs.
- Updated `scripts/qa/validate-browser-interactions.ts` to target the real current wastewater entities by title and verify the correct drawer opens after click.
- Rebuilt and restarted the app and reverified the live browser interaction flow on `3000`.

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:status`
- `npm run qa:validate-dense-click-selection`
- `npm run qa:validate-browser-interactions`
- `npm run local:verify`

### Learned

- The remaining trust issue was no longer data presence. It was explicit click preservation in dense local clusters.
- Dense-click upgrades are only safe for broad context layers. Overriding a clicked wastewater point with a nearby industrial facility makes the interface untrustworthy.
- Browser validators must follow the real current data IDs or titles. NPDES outfall suffixes changed the live entity IDs enough that stale assumptions became false negatives.

### Better next

- Finish the PFAS DB cutover so the DB tier wins for all core atlas layers, not just industrial and wastewater.
- After that, isolate and fix the row-level overflow blocking the full national NPDES DB load.

## 2026-04-16 PFAS DB cutover slice

- Reconstructed the current state from `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, `DECISIONS.md`, the live `3000` runtime, and the current Postgres state.
- Confirmed the PFAS gap directly:
  - ETL-backed live PFAS layer was `716 USGS + 33 ATSDR = 749`
  - Postgres only had `716` PFAS rows and no ATSDR entries
- Fixed repo truthfulness so DB core counts now reflect usable spatial rows instead of raw table rows:
  - `src/lib/data/repository.ts`
  - `scripts/db/check-db.ts`
- Fixed `scripts/etl/loaders/postgres.py` so PFAS geometry inserts are typed correctly even when longitude or latitude is null.
- Fixed `scripts/etl/ingest_atsdr_pfas.py` so long ATSDR slugs are capped deterministically with a short hash suffix and no longer overflow `varchar(160)`.
- Loaded ATSDR PFAS rows into Postgres successfully.
- Rebuilt and restarted the app, then verified the merged atlas now prefers the DB tier for PFAS as well as industrial and wastewater.

### Validation

- `python scripts/etl/ingest_atsdr_pfas.py --load`
- `npm run lint`
- `npm run build`
- `npm run db:status`
- `npm run local:status`
- `npm run local:verify`

### Learned

- The PFAS gap was not abstract. It was one concrete missing source family: ATSDR was absent from the DB tier.
- Counting raw DB rows instead of spatially usable rows would have made the cutover look complete before the live map could actually render the data.
- The ATSDR loader needed both typed null-safe geometry handling and deterministic slug capping before it could be trusted.

### Better next

- Move from core DB cutover to expanding DB-backed coverage for the next user-visible layer, starting with legal / ECHO-derived marker coverage.
- Revisit the single-shot national NPDES overflow only if it still blocks broader DB consistency work.
## 2026-04-16 - Cold home atlas seed closed

What changed:
- capped broad-band DB map-entity queries before hydration in `src/lib/data/repository.ts`
- split ETL layer loading so `legal-markers` no longer drags every ETL CSV into the cold path in `src/lib/data/etl-file-repository.ts`
- fixed standalone seed lifecycle so `npm run local:seed:home-atlas -- --force` closes its DB connection and exits in `scripts/local/seed-home-atlas-cache.ts` and `src/db/client.ts`
- hardened validation:
  - `scripts/qa/validate-browser-interactions.ts` now clicks the hidden e2e bridge without tearing down the execution context
  - `scripts/qa/validate-live-api.ts` now accepts DB-backed industrial rows that are strong through TRI release stats, not only cross-program program counts

What was verified:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:seed:home-atlas -- --force`
- `npm run local:up`
- `npm run local:status`
- `npm run qa:validate-live-api`
- `npm run qa:validate-home-atlas-cache`
- `npm run qa:validate-zoom-drilldown`
- `npm run qa:validate-browser-interactions`
- `npm run local:verify`

Measured result:
- forced cold seed now exits cleanly in `2709ms`
- cache-backed home atlas validation is passing at `66ms`
- current home atlas cache contains `77` visible markers

What was learned:
- the earlier 10-minute “seed cost” was partly a measurement bug because the standalone process never closed its DB handle
- the actual cold-path cost was also inflated by over-eager ETL loading and full broad-band DB hydration
- the next real decision is product-facing, not runtime-facing: whether the new `77` marker home atlas is the right broad-band floor or too sparse

## 2026-04-16 - Focused local PFAS visibility closed

What changed:
- fixed the PFAS time model in:
  - `src/lib/data/repository.ts`
  - `src/lib/data/etl-file-repository.ts`
- PFAS site rows now persist from `observedYear` through the current atlas year instead of disappearing after the sample year
- added distance-aware same-layer regional ordering and investigation-balanced local opening results in:
  - `src/lib/map/entity-transforms.ts`
- strengthened validation:
  - `scripts/qa/validate-zoom-drilldown.ts` now requires local PFAS visibility and a nearby regional PFAS floor
  - `scripts/local/verify.ps1` now runs `qa:validate-local-focus-priority`
- finalized persistent cache invalidation for this semantic change in:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v8`

What was verified:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run qa:validate-live-api`
- `npm run qa:validate-home-atlas-cache`
- `npm run qa:validate-zoom-drilldown`
- `npm run qa:validate-local-focus-priority`
- `npm run qa:validate-browser-interactions`
- `npm run local:verify`

Measured result:
- home atlas remains stable at `49` visible markers with:
  - `pfas-sites = 8`
  - `industrial-sites = 17`
  - `legal-markers = 14`
- Cape Fear focused regional PFAS nearest marker is now `54.1` miles from the focus center
- Cape Fear focused local top five is now:
  - `NC_3_Pub` (`pfas-sites`)
  - `BLACK RIVER WWTP` (`wastewater-sites`)
  - `MANN + HUMMEL PUROLATOR FILTERS LLC` (`industrial-sites`)
  - `NC_13_Pub` (`pfas-sites`)
  - `NC_1_Priv` (`pfas-sites`)

What was learned:
- the PFAS gap was not missing data in the abstract
- it was two separate issues:
  - PFAS rows were being filtered out by an overly strict one-year time model
  - local opening results needed a deliberate investigation mix instead of raw score monotony
- the next PFAS question is now narrower: whether a closer Chemours-proximate official PFAS record exists in the current source set

## 2026-04-16 - Chemours PFAS coverage truthfulness and validator alignment

What changed:
- audited the current official PFAS source set and confirmed the repo does not currently contain a closer geocoded Chemours-edge official PFAS row than the loaded Cape Fear samples
- surfaced `GenX` from USGS PFAS source data in:
  - `scripts/etl/ingest_usgs_pfas.py`
  - `src/lib/data/etl-file-repository.ts`
- added explicit Chemours PFAS coverage notes in:
  - `src/lib/data/repository.ts`
  - `src/types/explorer.ts`
  - `src/components/explore/detail-drawer-shell.tsx`
- changed `/api/entities` so the full atlas is stream-safe and validator-friendly in:
  - `src/app/api/entities/route.ts`
- added bounded layer queries and fixed filter truthfulness in:
  - `src/lib/data/query-params.ts`
  - `src/lib/data/repository.ts`
- aligned standalone validators with the real current atlas contract in:
  - `scripts/qa/smoke.ts`
  - `scripts/qa/validate-live-api.ts`
  - `scripts/qa/validate-density-legibility.ts`
  - `scripts/qa/validate-selection-priority.ts`
  - `scripts/qa/validate-pfas-coverage-notes.ts`
- finalized persistent atlas cache invalidation at:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v9`
- forced startup cache reseed in:
  - `scripts/local/up.ps1`

What was verified:
- `npm run lint`
- `npm run typecheck`
- `npm run qa:validate-density-legibility`
- `npm run qa:validate-selection-priority`
- `npm run qa:validate-browser-interactions`
- `npm run local:verify`

Measured result:
- `local:verify` is fully green again with:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- current verified totals:
  - `totalEntities = 371738`
  - `industrialSites = 349445`
  - `pfasSites = 749`
  - `wastewaterSites = 3223`
- current home atlas contract:
  - national view: `19` visible markers
  - regional home atlas: `49` visible markers
- Chemours PFAS coverage note now states:
  - nearest official PFAS record to the facility is `NC_1_Priv` at `62.3` miles
  - nearest official GenX-bearing sample is `NC_5_Pub` at `70.9` miles

What was learned:
- the last broken pieces were verification truthfulness, not product interaction
- full raw atlas fetches are no longer a safe validation primitive at current DB scale
- national atlas validation must follow the real broad-band contract:
  - direct PFAS rows
  - regional air-toxics overlays
  - aggregate legal marker context

## 2026-04-16 - Derived regional layer source truth surfaced end to end

What changed:
- added explicit derived-layer provenance and rationale in:
  - `src/lib/data/repository.ts`
- `/api/layers` now returns:
  - `preferredSource`
  - `sourceTruthNote`
- the layer control now renders that provenance directly in:
  - `src/components/explore/layer-control-shell.tsx`
  - `src/components/explore/globe-shell-supported.tsx`
- `db:status` now reports raw supporting counts for:
  - `legalMarkers`
  - `sentinelSpeciesRecords`
  - `reproductiveIndicators`
  - `spermStudies`
  - `fertilityTrends`
- `local:verify` now reports `preferredDerivedLayerSource`
- `scripts/qa/validate-live-api.ts` now enforces that the three remaining derived regional layers stay `etl-file` until a real DB-backed source path exists

What was verified:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run db:status`
- `npm run local:down`
- `npm run local:up`
- `npm run local:verify`

Measured result:
- verified readiness on `prod-start`
- current derived-layer source truth:
  - `air-toxics-regions = etl-file` with `24` rows
  - `reproductive-regions = etl-file` with `8` rows
  - `sentinel-species = etl-file` with `10` rows
- current raw DB support counts:
  - `sentinelSpeciesRecords = 0`
  - `reproductiveIndicators = 0`
  - `spermStudies = 0`
  - `fertilityTrends = 0`

What was learned:
- the next real move on derived layers is not “promote because the schema exists”
- it is “promote only when atlas-ready DB rows exist and the display path is source-defensible”
- making that provenance visible in both health and UI removes ambiguity for future runs and for users reading the map

## 2026-04-17 - Reproductive regions promoted to DB-backed synthesis

What changed:
- promoted `reproductive-regions` to the DB-backed derived path in:
  - `src/lib/data/repository.ts`
- bumped persistent map cache semantics to:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v11`
- updated live validation so reproductive detail must now resolve as `database`:
  - `scripts/qa/validate-live-api.ts`
- hardened Windows local runtime startup:
  - `scripts/local/up.ps1`
  - `scripts/local/common.ps1`
  - home-atlas seed is now best-effort and time-bounded
  - duplicate-cased `Path` / `PATH` env keys are normalized before `Start-Process`

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- direct `/api/health` probe
- `node --experimental-strip-types scripts/qa/validate-live-api.ts`
- `node --experimental-strip-types -r tsconfig-paths/register scripts/qa/validate-zoom-drilldown.ts`
- direct reproductive detail probe
- managed runtime restored on `prod-start`

Measured result:
- `preferredDerivedLayerSource.reproductiveRegions = database`
- `derivedLayerStatus.reproductiveRegions.databaseRows = 8`
- sample reproductive detail now returns:
  - `backend = database`
  - source ids including `plastic-health-map-paper` and `ipen-plastic-map`
- broad-band home atlas still holds at `49` visible markers
- runtime restored on:
  - `http://127.0.0.1:3000`
  - `listenerPid = managedPid`
  - `runtimeMode = prod-start`

What was learned:
- `reproductive-regions` was the clean next DB promotion because it already depended on a defensible DB-backed contamination-system stack
- the remaining derived-layer product decision is now narrower:
  - `sentinel-species`
- startup should degrade performance optimizations before it degrades availability
# 2026-04-17 - Sentinel source truth and direct Node script runner

- Re-tested `sentinel-species` promotion through the shared DB-backed derived-context path.
- Verified that the promotion was not defensible yet:
  - `/api/health` still reported `preferredDerivedLayerSource.sentinelSpecies = etl-file`
  - `derivedLayerStatus.sentinelSpecies.databaseRows = 0`
  - `db:status` confirmed `sentinelSpeciesRecords = 0`
- Codified that reality in repo logic and live validation instead of forcing a false DB promotion.
- Replaced the remaining `tsx`-dependent local verification and seed path with a direct Node runner:
  - `scripts/local/run-ts.mjs`
  - `scripts/local/register-ts-path-loader.mjs`
  - `scripts/local/ts-path-loader.mjs`
- Updated package scripts so DB status, DB seed, data validation, QA validation, and `local:seed:home-atlas` all use the direct runner.
- Verified:
  - `npm run db:status`
  - `npm run db:seed:sources`
  - `npm run data:validate`
  - `npm run local:seed:home-atlas -- --force`
  - `npm run local:verify`
- Current remaining non-blocking gap:
  - closed in the next pass by giving the `src` tree its own ESM boundary for standalone runner imports

# 2026-04-17 - Removed standalone runner warning noise

- Added [C:\Users\chris\Toxin-Environment-Map\src\package.json](C:/Users/chris/Toxin-Environment-Map/src/package.json) with `"type": "module"`.
- Kept the repo-root package semantics unchanged for the Next app while removing the remaining typeless-package warnings from direct Node verification runs.
- Re-verified:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run db:status`
  - `npm run local:seed:home-atlas -- --force`
  - `npm run local:verify`

# 2026-04-17 - Opening atlas wastewater visibility and balance

What changed:
- fixed the opening-atlas wastewater disappearance by making wastewater rows persist through the current atlas year in:
  - `src/lib/data/repository.ts`
  - `src/lib/data/etl-file-repository.ts`
- rebalanced the broad-band regional opening atlas in:
  - `src/lib/map/entity-transforms.ts`
  - `legal-markers` max reduced to `10`
  - `air-toxics-regions` max reduced to `8`
  - `wastewater-sites` max reduced to `10`
- invalidated stale atlas semantics by bumping:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v13`
- hardened the opening-atlas validator in:
  - `scripts/qa/validate-home-atlas-cache.ts`
  - wastewater must now be present
  - legal and air-toxics must stay bounded

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:seed:home-atlas -- --force`
- `npm run local:status`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`
- direct regional atlas probe
- direct wastewater-only regional atlas probe

Measured result:
- current regional opening atlas:
  - `visible = 53`
  - `industrial-sites = 17`
  - `pfas-sites = 8`
  - `wastewater-sites = 10`
  - `legal-markers = 10`
  - `air-toxics-regions = 8`
- wastewater-only opening query is no longer empty:
  - `count = 18`
- home-atlas validator passes in:
  - `144ms`
- current managed runtime:
  - `listenerPid = managedPid = 30704`
  - `runtimeMode = prod-start`

What was learned:
- the atlas defect was not broad-band balancing first; it was year-window semantics
- once wastewater became visible again, broad-band caps needed to move with it or the opening view became too wastewater-heavy
- cache namespace bumps are required when atlas-selection semantics change materially, otherwise the validator may be testing the wrong mix

# 2026-04-17 - Opening atlas wastewater now favors actionable NPDES markers

What changed:
- reweighted broad-band ranking in:
  - `src/lib/map/entity-transforms.ts`
  - `epa-npdes` wastewater now gets explicit additional broad-band priority
  - `usgs-pharma` wastewater now gets a broad-band penalty so it does not monopolize the opening atlas
- bumped atlas cache semantics to:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v14`
- tightened opening-atlas validation in:
  - `scripts/qa/validate-home-atlas-cache.ts`
  - the opening atlas must now include actionable `epa-npdes` wastewater markers

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:seed:home-atlas -- --force`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`
- direct regional atlas probe on `3000`

Measured result:
- opening atlas counts remain:
  - `visible = 53`
  - `industrial-sites = 17`
  - `pfas-sites = 8`
  - `wastewater-sites = 10`
  - `legal-markers = 10`
  - `air-toxics-regions = 8`
- opening atlas wastewater family mix is now:
  - `epa-npdes = 10`
  - `usgs-pharma = 0`
- sample wastewater opening markers are now:
  - `PRAIRIE DU CHIEN WWTF`
  - `PLATTEVILLE WASTEWATER TREATMENT FACILITY`
  - `POTOSI-TENNYSON SEWAGE COMMISSION WWTF`

What was learned:
- the broad-band wastewater issue was not only count balance; it was source-family balance inside the wastewater layer itself
- direct measurement is not always the right broad-band priority when the product goal is investigation entry points
- the opening atlas needs separate ranking intent from local/detail views

# 2026-04-17 - Opening PFAS atlas now mixes source families instead of showing only USGS tap-water

What changed:
- fixed the stale ATSDR PFAS source-id scoring mismatch in:
  - `src/lib/map/entity-priority.ts`
  - live ATSDR PFAS rows now score through `atsdr-pfas-sites`
- added explicit PFAS source-family balancing in:
  - `src/lib/map/entity-transforms.ts`
  - opening broad-band PFAS now reserves room for ATSDR site context while keeping USGS direct measurements dominant
- invalidated stale opening-atlas semantics in:
  - `src/lib/data/map-entities-cache.ts`
  - cache namespace is now `schema-v18`
- tightened the opening-atlas validator in:
  - `scripts/qa/validate-home-atlas-cache.ts`
  - it now asserts:
    - `usgsTapwater <= 8`
    - `atsdrSites >= 1`
    - PFAS geographic diversity still spans at least 4 buckets

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`
- direct regional atlas probe on `3000`

Measured result:
- opening atlas now validates at:
  - `visible = 48`
  - `industrial-sites = 17`
  - `pfas-sites = 9`
  - `wastewater-sites = 8`
  - `legal-markers = 8`
  - `air-toxics-regions = 6`
- opening PFAS family mix is now:
  - `usgsTapwater = 8`
  - `atsdrSites = 1`
- PFAS geographic diversity remains:
  - `-96,32 = 3`
  - `-88,40 = 2`
  - `-96,40 = 3`
  - `-120,32 = 1`

What was learned:
- the missing ATSDR opening presence was partly a ranking decision and partly a stale source-id scoring bug
- one explicit ATSDR site-context slot is defensible without weakening the direct-measurement opening path
- the next product decision is whether a second ATSDR slot would improve the opening atlas enough to justify displacing one more direct-measurement PFAS marker

# 2026-04-17 - Opening PFAS atlas no longer wastes slots on exact-coordinate duplicates

What changed:
- tested the second ATSDR opening-slot idea and closed it as not currently supportable:
  - raising the ATSDR family minimum still produced only `1` ATSDR opening marker
  - it only displaced a direct-measurement PFAS row
- restored the truthful PFAS family floor in:
  - `src/lib/map/entity-transforms.ts`
  - current verified broad-band PFAS family mix remains:
    - `usgsTapwater = 8`
    - `atsdrSites = 1`
- added exact-coordinate PFAS dedupe for broad-band national/regional selection in:
  - `src/lib/map/entity-transforms.ts`
  - PFAS exact same-coordinate rows now cap at `1`
- invalidated stale selection semantics in:
  - `src/lib/data/map-entities-cache.ts`
  - cache namespace is now `schema-v21`
- tightened validator truth in:
  - `scripts/qa/validate-home-atlas-cache.ts`
  - the opening atlas now fails if any PFAS coordinate appears more than once

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:seed:home-atlas -- --force`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`
- direct regional atlas probe on `3000`

Measured result:
- opening atlas still validates at:
  - `visible = 48`
  - `industrial-sites = 17`
  - `pfas-sites = 9`
  - `wastewater-sites = 8`
  - `legal-markers = 8`
  - `air-toxics-regions = 6`
- opening PFAS family mix remains:
  - `usgsTapwater = 8`
  - `atsdrSites = 1`
- opening PFAS coordinates are now all unique:
  - `-96.9223,35.2499`
  - `-97.0000,35.2608`
  - `-91.7110,37.8895`
  - `-91.7535,37.9381`
  - `-97.3262,37.7878`
  - `-95.6008,39.0301`
  - `-96.9810,37.6101`
  - `-97.5141,35.5399`
  - `-117.8937,33.7879`
- the previous duplicate Kansas coordinate is gone from the opening atlas:
  - `KS_12_Pub` dropped out
  - `KS_7_Pub` now fills that slot

What was learned:
- the second ATSDR-slot question is now closed by live evidence, not preference
- the next meaningful PFAS opening improvement is quality inside the surviving direct-measurement slice
- exact-coordinate dedupe gives the opening atlas a better investigation surface without changing the verified cross-layer balance

# 2026-04-17 - Opening hazard slot is now quality-driven

What changed:
- made broad-band hazard ranking explicitly prefer stronger cleanup context in:
  - `src/lib/map/entity-transforms.ts`
- hazard quality now gets extra weight for:
  - `epa-tri`
  - positive `TRI ids`
  - positive `Federal cases`
  - richer linked-program context
  - overlap with `legal-pressure` or `wastewater`
- moved opening-atlas cache semantics to:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v25`
- tightened the home-atlas validator in:
  - `scripts/qa/validate-home-atlas-cache.ts`
  - any opening hazard marker must now be stronger than a generic SEMS-only site

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `npm run local:seed:home-atlas -- --force`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`

Measured result:
- opening atlas now validates at:
  - `visible = 50`
  - `industrial-sites = 17`
  - `pfas-sites = 10`
  - `wastewater-sites = 8`
  - `hazardous-sites = 1`
  - `legal-markers = 8`
  - `air-toxics-regions = 6`
- current opening hazard marker:
  - `U S AIR FORCE WYOMING AIR NATIONAL GUARD`
  - `sourceIds = ["epa-frs","epa-sems","epa-tri"]`
  - `Programs = 4`
  - `TRI ids = 1`

What was learned:
- the earlier hazard-slot fix solved presence, not quality
- the right broad-band rule is not “show any cleanup site”; it is “show one strong cleanup-context entry point if one exists”
- validator truthfulness matters here because generic SEMS-only cleaners can otherwise drift back into the opening atlas without breaking simpler count-based checks

# 2026-04-17 - Opening atlas now reserves more room for PFAS and industrial entry points

What changed:
- rebalanced the opening regional atlas minimums and maximums in:
  - `src/lib/map/entity-transforms.ts`
- the concrete entry-point floors are now:
  - `industrial-sites = 10`
  - `pfas-sites = 6`
  - `wastewater-sites = 6`
- contextual floors are now lower:
  - `legal-markers = 4`
  - `air-toxics-regions = 4`
- contextual ceilings are also lower:
  - `legal-markers = 8`
  - `air-toxics-regions = 6`
- PFAS ceiling is higher:
  - `pfas-sites = 10`
- cache semantics moved to:
  - `src/lib/data/map-entities-cache.ts`
  - `schema-v15`
- validator contract tightened in:
  - `scripts/qa/validate-home-atlas-cache.ts`
  - PFAS floor raised
  - wastewater, legal, and air bounds tightened
  - concrete-vs-context balance is now asserted directly

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:seed:home-atlas -- --force`
- `npm run local:status`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`
- direct regional atlas probe
- direct PFAS-only opening-atlas probe

Measured result:
- opening atlas now validates at:
  - `visible = 49`
  - `industrial-sites = 17`
  - `pfas-sites = 10`
  - `wastewater-sites = 8`
  - `legal-markers = 8`
  - `air-toxics-regions = 6`
- concrete entry points now clearly outweigh context:
  - `industrial + pfas + wastewater = 35`
  - `legal + air = 14`
- wastewater remains fully actionable:
  - `epa-npdes = 8`
- the opening PFAS slice is now larger but still geographically concentrated in the Kansas / Missouri USGS cluster

What was learned:
- the next broad-band issue is no longer wastewater or context oversaturation
- it is geographic concentration inside the PFAS slice itself
- broad-band layer balancing and geographic/source-cluster balancing are separate problems and should stay separate in the code

# 2026-04-21 - Close zoom and zoom-scaled point sizing are now part of the live globe contract

What changed:
- implemented bounded close/far camera helpers in:
  - `src/lib/map/camera.ts`
- reduced focus heights so direct records open much closer:
  - point focus `= 360000`
  - aggregate drilldown focus `= 2600000`
- widened the Three.js zoom envelope in:
  - `src/components/explore/three-safe-globe.tsx`
  - `minDistance = radius * 1.015`
  - `maxDistance = radius * 4.4`
  - `zoomToCursor = true`
- point markers now scale continuously with actual camera height instead of only coarse camera bands
- added regression coverage in:
  - `scripts/qa/validate-zoom-detail-contract.ts`
- fixed a real managed runtime OOM on `next start` in:
  - `scripts/local/up.ps1`
  - local prod-start now injects `--max-old-space-size=6144` when needed

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-zoom-detail-contract`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `npm run local:verify`

Measured result:
- runtime healthy on `http://127.0.0.1:3000`
- `listenerPid = managedPid = 28320`
- close zoom clamp `= 110000`
- point focus height `= 360000`
- aggregate focus height `= 2600000`
- zoom-scaled point multiplier:
  - close `= 0.56`
  - regional `= 0.81`
  - far `= 1.34`

What was learned:
- the missing behavior was not click detail plumbing; it was the camera envelope and fixed-size point rendering
- math-only zoom helpers are worth validating directly because atlas work elsewhere can silently regress them
- local prod-start on this machine needs a bigger Node heap than the default if verification is going to stay trustworthy

# 2026-04-21 - Local point rendering is now capped to an investigation-scale floor instead of fake surface-level zoom

What changed:
- corrected the close-zoom rendering contract in:
  - `src/lib/map/camera.ts`
  - `src/components/explore/three-safe-globe.tsx`
- close zoom floor is now `220000` instead of `110000`
- direct point focus height is now `420000`
- local point geometry is much smaller and smoother:
  - lower base radii
  - lower local altitude
  - higher close-range point resolution
- local control floor now stops before the globe texture turns into a blurry scrape
- renderer quality is slightly higher at close range:
  - `antialias = true`
  - pixel ratio cap raised to `1.4`

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-zoom-detail-contract`
- `npm run local:status`
- `npm run local:verify`

Measured result:
- runtime healthy on `http://127.0.0.1:3000`
- `listenerPid = managedPid = 32148`
- close clamp `= 220000`
- point focus height `= 420000`
- point multiplier:
  - close `= 0.78`
  - regional `= 0.9`
  - far `= 1.16`

What was learned:
- the previous failure was not just "too much zoom"; it was a unit-scale bug in local point radius
- allowing lower zoom without shrinking geometry made the map look worse, not better
- the right target here is investigation-scale local zoom, not pretending the atlas has street-view-grade geometry

# 2026-04-21 - Managed runtime is back on prod-start; browser verification is now blocked specifically on target-session Runtime.evaluate

What changed:
- reconciled continuity with the real current runtime:
  - `listenerPid = managedPid = 32808`
  - `runtimeMode = prod-start`
- reworked external-browser validation in:
  - `scripts/qa/validate-browser-interactions.ps1`
  - `scripts/qa/validate-browser-interactions.ts`
- browser validation still launches an installed Chromium-family browser with:
  - unique profile dir
  - managed timeout
  - stdout / stderr capture
- the validator now:
  - connects to the browser websocket
  - creates a fresh atlas target
  - attaches explicitly to that target
  - reports the exact stalled stage instead of failing vaguely

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:status`
- `npm run qa:validate-home-atlas-cache`
- `npm run qa:validate-browser-interactions` (still failing, but now with a precise blocker)

Measured result:
- runtime is healthy at `http://127.0.0.1:3000`
- `readyForLocalUse = true`
- `readyForFullLocalStack = true`
- current browser-validation failure is:
  - `Timed out waiting for CDP response to Runtime.evaluate.`

What was learned:
- the older `dev-managed` blocker is stale; reopening runtime work here would be wasted effort
- startup-tab ambiguity is no longer the main browser problem
- the remaining browser blocker is lower-level: target-session command transport after attach, not page URL selection or shell log capture

# 2026-04-21 - Browser verification now uses an app-owned result path, but launched browsers still are not reporting

What changed:
- added a writable browser result endpoint in:
  - `src/app/api/e2e/browser-result/route.ts`
- added an in-browser self-test flow in:
  - `src/components/explore/globe-shell-supported.tsx`
  - query contract:
    - `e2e=1`
    - `e2eAuto=browser`
    - `e2eRunId=<id>`
    - optional `e2eAutoClose=1`
- the self-test now reports step-level:
  - `running`
  - `pass`
  - `fail`
- replaced the old browser validator transport with result-file polling in:
  - `scripts/qa/validate-browser-interactions.ps1`

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- direct `POST /api/e2e/browser-result` returned `200 {"ok":true}`
- `npm run local:status`
- `npm run qa:validate-browser-interactions` still fails

Measured result:
- current runtime is:
  - `listenerPid = managedPid = 26808`
  - `runtimeMode = dev-managed`
- browser validation failure is now:
  - launched browsers do not produce the `browser-e2e` result file

What was learned:
- the browser result endpoint is not the blocker
- the page-owned self-test path is in place, but the launched browser still is not executing it in a way that reaches the server
- the previous assumption that `prod-start` was still closed is no longer true in the current live runtime

# 2026-04-22 - Cross-surface selection context is now explicit in the top command surface

What changed:
- added a shared selection-context builder in:
  - `src/lib/map/selection-context.ts`
- wired the live command surface to that state in:
  - `src/components/explore/globe-shell-supported.tsx`
  - `src/components/explore/search-control-shell.tsx`
- the top shell now explicitly reports:
  - selected record
  - nearby focus
  - search query
- selected record context now includes:
  - layer
  - group
  - nearby focus label
  - nearby radius
  - nearby visible signal count
- added a no-browser validator:
  - `scripts/qa/validate-selection-context-contract.ts`
  - wired into `package.json`
  - wired into `scripts/local/verify.ps1`

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime remains:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`
- selected context now validates as:
  - `kind = selected-entity`
  - `title = Selected record`
  - `value = SOUTH CARY WRF`
- nearby-only context validates as:
  - `kind = nearby-focus`
  - `value = Cape Fear focus`
- search-only context validates as:
  - `kind = search-query`
  - `value = GenX`

What was learned:
- the missing product signal was not another map glyph; it was explicit active-context text in the top shell
- this slice was best handled as a pure helper plus a compact surface, not as more drawer state branching
- the next step should make the new context actionable without re-expanding the chrome

# 2026-04-22 - Selection context is now actionable, not only descriptive

What changed:
- extended the shared selection-context contract in:
  - `src/lib/map/selection-context.ts`
- wired low-weight actions through the live shell in:
  - `src/components/explore/globe-shell-supported.tsx`
  - `src/components/explore/search-control-shell.tsx`
- current action set is:
  - `return-nearby`
  - `clear-selection`
  - `clear-nearby`
  - `clear-search`

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run local:verify`

Measured result:
- selected context now validates with actions:
  - `return-nearby`
  - `clear-selection`
- nearby-only context now validates with:
  - `clear-nearby`
- search-only context now validates with:
  - `clear-search`
- runtime remains:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`

What was learned:
- the context row needed lightweight recovery actions, not more explanatory text
- the next risk is no longer missing state visibility; it is inconsistent map/drawer recovery after those actions

# 2026-04-22 - Selection-context recovery semantics are now explicit

What changed:
- extended `src/lib/map/selection-context.ts` with:
  - `SelectionContextActionState`
  - `resolveSelectionContextActionState(...)`
- wired the live shell to use that reducer in:
  - `src/components/explore/globe-shell-supported.tsx`
- the recovery actions now have explicit shared semantics instead of ad hoc store mutations

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run local:verify`

Measured result:
- `clear-selection` now validates as:
  - selected entity cleared
  - nearby focus preserved
  - nearby summary surface remains open
- `return-nearby` now validates as:
  - selected entity cleared
  - nearby summary reopened
- `clear-nearby` now validates as:
  - nearby focus cleared
  - detail surface closed
- runtime remains:
  - `listenerPid = managedPid = 21132`
  - `runtimeMode = prod-start`

What was learned:
- the remaining gap is no longer shell state truth; it is camera-target truth after those state recoveries
- the next slice should focus on camera recovery, not more command-surface chrome

# 2026-04-23 - Search results now carry focusable geometry

What changed:
- added `coordinates` to entity search results in:
  - `src/types/explorer.ts`
  - `src/lib/map/search.ts`
- wired search selection to pass result coordinates into the shared entity-focus reducer in:
  - `src/components/explore/search-control-shell.tsx`
- added atomic explorer surface-state application in:
  - `src/store/explorer-store.ts`
- switched reducer-derived focus/recovery paths to atomic state application in:
  - `src/components/explore/search-control-shell.tsx`
  - `src/components/explore/detail-drawer-shell.tsx`
  - `src/components/explore/globe-shell-supported.tsx`

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run qa:validate-interaction-contract`
- `npm run qa:validate-live-api`
- `npm run local:status`
- `npm run local:up`
- `npm run local:verify`

Measured result:
- live `prod-start` runtime is:
  - `listenerPid = managedPid = 13492`
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
- `SOUTH CARY WRF` search now returns:
  - `entityId = npdes-nc0065102-001`
  - `coordinates = [-78.4528, 35.3848]`
- `BRIARWOOD FARMS WWTP` search now returns:
  - `entityId = npdes-nc0062740-001`
  - `coordinates = [-78.4838, 35.4122]`
- coordinate-bearing search activation now validates selected-record focus height:
  - `420000`
- atomic store application now validates that selected entity and selected camera target are preserved together.

What was learned:
- the main implementation risk was not the API shape; it was setter ordering in the client store
- lower-level setters are intentionally side-effectful, so cross-surface focus intents need one atomic state write
- next work should improve the information value of each search result row now that clicking it can reliably fly to the record

# 2026-04-23 - Search results now explain records before click

What changed:
- extended `ExplorerSearchResult` in:
  - `src/types/explorer.ts`
- enriched search result construction in:
  - `src/lib/map/search.ts`
- search rows now include:
  - layer id/group/labels
  - evidence type
  - confidence level
  - source ids
  - source hint
  - system hint
  - chemistry hint
  - category hint
- rendered compact insight badges in:
  - `src/components/explore/search-control-shell.tsx`
- extended live no-browser interaction validation in:
  - `scripts/qa/validate-interaction-contract.ts`

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run qa:validate-selection-context-contract`
- `npm run local:up`
- `npm run local:status`
- `npm run qa:validate-interaction-contract`
- `npm run qa:validate-live-api`
- `npm run local:verify`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 27592`
  - `runtimeMode = prod-start`
- `SOUTH CARY WRF` search now returns:
  - `entityId = npdes-nc0065102-001`
  - `layerId = wastewater-sites`
  - `layerShortLabel = Wastewater`
  - `evidenceType = Proxy`
  - `confidenceLevel = High`
  - `sourceHint = NPDES wastewater record`
  - `systemHint = Wastewater`
  - `chemistryHint = PFAS / Wastewater-associated compounds`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`

What was learned:
- search-result usefulness needed structured metadata, not just a visual rewrite
- compact badges are the right UI layer here because they make the result scannable without adding another panel
- the next most valuable slice is improving the selected-record detail drawer so the clicked dot answers "why this matters" immediately

# 2026-04-23 - Selected detail drawers now open with a read-first answer

What changed:
- added structured read-first detail summary fields in:
  - `src/lib/data/detail-summary.ts`
- updated the selected-record drawer in:
  - `src/components/explore/detail-drawer-shell.tsx`
- the first detail card now answers:
  - what this point is
  - why it matters
  - what source backs it
  - what is measured versus inferred
- added stable read-first DOM contract attributes for future browser or component validation
- rebuilt detail summary validation in:
  - `scripts/qa/validate-detail-summary.ts`
- added that validator to:
  - `scripts/local/verify.ps1`

What was verified:
- `npm run typecheck`
- `npm run lint`
- `npm run qa:validate-detail-summary`
- `npm run build`
- `npm run qa:validate-selected-state-contract`
- `npm run local:up`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 13316`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- representative detail summaries now validate:
  - PFAS source lineage through USGS PFAS
  - hazardous cleanup context through EPA SEMS
  - wastewater context through EPA NPDES
  - industrial release context through EPA TRI

What was learned:
- the useful detail drawer needed interpretation ordering, not more data volume
- source-backed "measured vs inferred" language is required for trust because many records are context or pathway proxies
- next work should make the same drawer more action-oriented by surfacing source links, nearby context recovery, and primary stats without adding panel weight

# 2026-04-23 - Selected detail drawers now expose source actions

What changed:
- added source-action derivation in:
  - `src/lib/data/detail-summary.ts`
- rendered a `Source actions` card near the top of:
  - `src/components/explore/detail-drawer-shell.tsx`
- made lower source-card names clickable instead of passive text
- extended source-action validation in:
  - `scripts/qa/validate-detail-summary.ts`

What was verified:
- `npm run typecheck`
- `npm run qa:validate-detail-summary`
- `npm run lint`
- `npm run build`
- `npm run local:up`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 31804`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- source-action validation now proves:
  - PFAS opens `USGS PFAS`
  - hazardous cleanup opens `EPA SEMS`
  - wastewater opens `EPA NPDES`
  - industrial TRI opens `EPA TRI`

What was learned:
- the drawer did not need another explanation block; it needed a clear next action connected to the strongest evidence source
- deriving actions from ranked sources keeps the UI honest because the action follows the same lineage logic as the read-first answer
- next work should focus on primary-stat clarity and nearby-context recovery, not more source-link polish

# 2026-04-23 - Selected detail drawers now expose interpreted facts and preserve selection on nearby refocus

What changed:
- added interpreted primary facts in:
  - `src/lib/data/detail-summary.ts`
- added selected-nearby refocus state in:
  - `src/lib/map/selection-context.ts`
- rendered `Primary facts` and `Nearby context` cards in:
  - `src/components/explore/detail-drawer-shell.tsx`
- extended validation in:
  - `scripts/qa/validate-detail-summary.ts`
  - `scripts/qa/validate-selection-context-contract.ts`

What was verified:
- `npm run qa:validate-detail-summary`
- `npm run qa:validate-selection-context-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:up`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 24128`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- primary facts now validate:
  - PFAS: `Detections`, `PFAS sum`, `Evidence`, `Confidence`
  - wastewater: `Permit`, `Design flow`, `Evidence`, `Confidence`
  - hazardous: `Hazard class`, `TRI ids`, `Programs`
  - industrial: `Total releases`, `TRI year`, `Evidence`, `Confidence`
- selected-nearby refocus now validates:
  - selected entity is preserved
  - drawer remains open
  - nearby camera target is restored
  - home-camera state remains false

What was learned:
- the detail surface was no longer missing data; it was missing interpretation of the most important fields
- nearby context needed a second action separate from `return-nearby` because clearing selection and refocusing surrounding context are different user intents
- next work should shift back to map-side inspection affordances before and during click, since the after-click drawer is now substantially more useful

# 2026-04-23 - Local map markers now expose lightweight inspection labels

What changed:
- added local inspection-label render model in:
  - `src/lib/map/globe-rendering.ts`
- wired labels into the Three.js globe in:
  - `src/components/explore/three-safe-globe.tsx`
- extended no-browser marker validation in:
  - `scripts/qa/validate-local-marker-rendering.ts`

What was verified:
- `npm run qa:validate-local-marker-rendering`
- `npm run qa:validate-selected-state-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:up`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 21276`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- inspection-label contract now validates:
  - labels are generated for local concrete object markers
  - selected labels include source context, e.g. `PFAS / USGS PFAS`
  - labels sit above marker altitude
  - labels are disabled outside local camera band

What was learned:
- after-click detail clarity was no longer the main blocker for local use
- the map needed a bounded text affordance so local dots could be identified before committing to the drawer
- the right boundary is local-only labels, not broad-band labels or another panel
- next work should refine selected map-side readout without increasing label count or reopening density clutter

# 2026-04-23 - Selected local map labels now show evidence and confidence

What changed:
- updated local inspection-label copy in:
  - `src/lib/map/globe-rendering.ts`
- extended local marker validation in:
  - `scripts/qa/validate-local-marker-rendering.ts`

What was verified:
- `npm run qa:validate-local-marker-rendering`
- `npm run qa:validate-selected-state-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:up`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 10392`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- selected local inspection labels now validate:
  - title
  - layer/source context, e.g. `PFAS / USGS PFAS`
  - evidence/confidence context, e.g. `Direct evidence / High confidence`
- unselected labels now validate:
  - layer/title context only
  - no evidence/confidence copy
- inspection labels remain local-only and capped.

What was learned:
- the selected map-side readout needed interpretation, not more panels
- evidence/confidence belongs only on the selected label because it answers the clicked-dot question without creating broad label clutter
- next work should focus on dense-scene label placement and visual dominance, not additional selected-label content

# 2026-04-28 - Dense local labels now preserve selected-marker dominance

What changed:
- updated local inspection-label candidate selection in:
  - `src/lib/map/globe-rendering.ts`
- extended dense-scene validation in:
  - `scripts/qa/validate-local-marker-rendering.ts`

What was verified:
- `npm run qa:validate-local-marker-rendering`
- `npm run qa:validate-selected-state-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 4836`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- dense label behavior now validates:
  - selected label is first
  - selected label is larger than unselected labels
  - selected-adjacent sibling label is suppressed
  - farther local label remains visible
  - inspection labels remain local-only and capped

Startup note:
- `npm run local:up` exceeded the 5 minute tool timeout while portable PostgreSQL was starting/recovering.
- PostgreSQL became reachable afterward on `127.0.0.1:5432`.
- The follow-up startup command used `-SkipBuild` because typecheck and build had already passed.
- Full `local:verify` passed after startup, so this is not a release-readiness blocker.

What was learned:
- selected label readability should be protected by candidate suppression before budget slicing, not by adding more visual weight or another panel
- synthetic rendering validation caught the important failure mode without opening browser tabs
- the next useful audit step is live-data label-candidate measurement across representative local drilldowns

# 2026-04-28 - Live local label quality is now validated against real map payloads

What changed:
- exported the selected-label exclusion distance from:
  - `src/lib/map/globe-rendering.ts`
- added live no-browser label validation in:
  - `scripts/qa/validate-live-label-quality.ts`
- wired the validator into:
  - `package.json`
  - `scripts/local/verify.ps1`

What was verified:
- `npm run qa:validate-live-label-quality`
- `npm run qa:validate-local-marker-rendering`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 25668`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- live Cape Fear PFAS audit:
  - `visible = 96`
  - `objectEntities = 95`
  - selected label: `NC_1_Priv / PFAS / USGS PFAS / Direct evidence / High confidence`
  - label count remains capped at 5
  - farther unselected context survives
- live Apex wastewater audit:
  - `visible = 18`
  - `objectEntities = 17`
  - selected label: `APEX WATER RECLAMATION FACILITY / Wastewater / EPA NPDES / Proxy evidence / High confidence`
  - label count remains capped at 5
  - farther unselected context survives

What was learned:
- current representative live local views do not contain selected-adjacent labels inside the exclusion zone, so synthetic validation still protects the suppression branch
- live validation is still valuable because it proves the selected label content and farther-context preservation against real DB-backed records
- the next audit step should reduce drift risk between the browser renderer's renderable-entity preparation and the no-browser live validator if marker prep changes again

# 2026-04-28 - Renderer and live label QA now share renderable preparation

What changed:
- added shared renderable-entity preparation in:
  - `src/lib/map/globe-rendering.ts`
- changed the Three.js globe to consume the shared builder in:
  - `src/components/explore/three-safe-globe.tsx`
- changed live label QA to consume the shared builder in:
  - `scripts/qa/validate-live-label-quality.ts`

What was verified:
- `npm run qa:validate-live-label-quality`
- `npm run qa:validate-local-marker-rendering`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 28920`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- live Cape Fear PFAS audit still passes:
  - `visible = 96`
  - `objectEntities = 95`
  - selected label remains `NC_1_Priv / PFAS / USGS PFAS / Direct evidence / High confidence`
  - label count remains capped at 5
- live Apex wastewater audit still passes:
  - `visible = 18`
  - `objectEntities = 17`
  - selected label remains `APEX WATER RECLAMATION FACILITY / Wastewater / EPA NPDES / Proxy evidence / High confidence`
  - label count remains capped at 5

What was learned:
- the prior live validator protected real labels but still duplicated marker prep, which made future renderer changes easier to miss
- shared preparation is the better boundary: product renderer and no-browser validators now fail together if selected marker sizing, altitude, styling, or ordering changes unexpectedly
- the next useful audit step should preserve this shared contract while continuing product-facing inspection improvements

# 2026-04-28 - Local inspection label activation is shared and validated

What changed:
- added shared label/entity-id activation resolution in:
  - `src/lib/map/entity-activation.ts`
- changed label-click handling to use the shared resolver in:
  - `src/components/explore/three-safe-globe.tsx`
- strengthened marker QA in:
  - `scripts/qa/validate-local-marker-rendering.ts`

What was verified:
- `npm run qa:validate-local-marker-rendering`
- `npm run qa:validate-live-label-quality`
- `npm run qa:validate-interaction-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 11980`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- local marker QA now proves:
  - synthetic renderable records are prepared through `buildGlobeRenderableEntities(...)`
  - selected label activation matches selected marker activation
  - missing label entity IDs fail closed
  - local labels remain capped and selected-label-dominant
- live Cape Fear PFAS and Apex wastewater label audits still pass.

What was learned:
- the next class of local-map bugs is less about adding more label text and more about preserving one shared interaction path for every way a user can click a record
- no-browser validation can still protect this contract by resolving the same activation helpers the component uses
- future local inspection work should keep marker rendering, label rendering, and activation helpers connected instead of testing them as separate behaviors

# 2026-04-28 - Search result presentation is shared and live-validated

What changed:
- added shared search-result presentation helpers in:
  - `src/lib/map/search-presentation.ts`
- changed the search UI to use those helpers in:
  - `src/components/explore/search-control-shell.tsx`
- strengthened live interaction validation in:
  - `scripts/qa/validate-interaction-contract.ts`

What was verified:
- `npm run qa:validate-interaction-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 16584`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- live South Cary wastewater search result now validates:
  - match label: `Record`
  - action label: `Fly to`
  - badges: `Wastewater`, `Proxy`, `NPDES wastewater record`, `PFAS / Wastewater-associated compounds`
- live Briarwood wastewater search result validates the same presentation contract.

What was learned:
- search result UX is a product contract because it explains what a dot means before the user opens it
- extracting presentation helpers gives future UI changes one reusable place for match labels, insight badges, and action labels
- no-browser validation can protect the highest-value search path by checking live API rows plus shared presentation output

# 2026-04-28 - Detail drawer display windows are shared and validated

What changed:
- added shared selected-detail display-window state in:
  - `src/lib/map/detail-drawer-state.ts`
- changed the selected-record drawer to consume the shared display state in:
  - `src/components/explore/detail-drawer-shell.tsx`
- strengthened detail QA in:
  - `scripts/qa/validate-detail-summary.ts`

What was verified:
- `npm run qa:validate-detail-summary`
- `npm run qa:validate-selection-context-contract`
- `npm run qa:validate-interaction-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 29108`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- detail QA now proves:
  - source cards are capped at 3 visible cards
  - secondary stats are capped at 4 visible facts
  - TRI release records are capped at 2 visible records
  - related case studies are capped at 2 visible cards
  - representative PFAS, hazardous-site, wastewater, and industrial records keep their highest-ranked source first

What was learned:
- detail-rich records need the same kind of shared contract as marker rendering and search presentation
- the next detail-drawer risk is not missing data, it is unbounded presentation growth that makes selected records hard to scan
- future detail sections should either use a shared display window or explicitly justify why they are intentionally uncapped

# 2026-04-28 - Live local labels now prove activation parity

What changed:
- strengthened live local-label QA in:
  - `scripts/qa/validate-live-label-quality.ts`

What was verified:
- `npm run qa:validate-live-label-quality`
- `npm run qa:validate-local-marker-rendering`
- `npm run qa:validate-interaction-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 16336`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- live label quality now proves:
  - every rendered Cape Fear PFAS label activation equals marker activation
  - every rendered Apex wastewater label activation equals marker activation
  - every rendered live inspection label resolves to a current visible entity

What was learned:
- label UX is only useful if labels remain true click targets, not just readable text
- synthetic activation parity catches helper-level drift, while live activation parity catches stale-label and data-payload drift
- future renderer or selector changes should keep labels generated from the same entity collection used by activation

# 2026-04-28 - Live selected markers now prove render emphasis

What changed:
- strengthened live selected-marker QA in:
  - `scripts/qa/validate-live-label-quality.ts`

What was verified:
- `npm run qa:validate-live-label-quality`
- `npm run qa:validate-selected-state-contract`
- `npm run qa:validate-local-marker-rendering`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 27096`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- live selected-marker QA now proves:
  - Cape Fear PFAS selected marker radius and altitude exceed the unselected baseline
  - Apex wastewater selected marker radius and altitude exceed the unselected baseline
  - both live selected markers have visible beacon radius and opacity
  - selected halo opacity remains stronger than unselected halo opacity

What was learned:
- selected-state recognition is a live-data contract, not only a synthetic style helper contract
- live local payloads now protect both the readable label and the selected marker underneath it
- future marker styling changes should update the shared render helper first, then keep live QA proving selected emphasis from real payloads

# 2026-04-28 - Live inspection labels now prove source and evidence presentation

What changed:
- added shared inspection-label presentation rules in:
  - `src/lib/map/globe-rendering.ts`
- strengthened synthetic and live label QA in:
  - `scripts/qa/validate-local-marker-rendering.ts`
  - `scripts/qa/validate-live-label-quality.ts`

What was verified:
- `npm run qa:validate-local-marker-rendering`
- `npm run qa:validate-live-label-quality`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime remains healthy:
  - `listenerPid = managedPid = 27096`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- live selected-label QA now proves:
  - Cape Fear PFAS selected label includes `PFAS / USGS PFAS`
  - Cape Fear PFAS selected label includes `Direct evidence / High confidence`
  - Apex wastewater selected label includes `Wastewater / EPA NPDES`
  - Apex wastewater selected label includes `Proxy evidence / High confidence`
- live unselected-label QA now proves:
  - unselected labels stay in compact layer/title form
  - unselected labels do not regain confidence/body copy

What was learned:
- the continuity files were ahead of the live validator; the docs claimed source/evidence live coverage that was only partially asserted
- selected map labels now have a shared presentation contract, which reduces drift between renderer behavior and no-browser QA
- future label copy changes should preserve the selected-vs-unselected hierarchy instead of adding more text to every local dot

# 2026-04-28 - Detail context rows now use shared display windows

What changed:
- moved official-signal and context-section windowing into:
  - `src/lib/map/detail-drawer-state.ts`
- updated selected-record drawer rendering in:
  - `src/components/explore/detail-drawer-shell.tsx`
- strengthened live detail display validation in:
  - `scripts/qa/validate-detail-summary.ts`

What was verified:
- `npm run qa:validate-detail-summary`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 12156`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- detail display-window QA now proves:
  - official signals stay capped at 3 visible rows
  - every context section stays capped at 3 visible rows
  - visible + hidden equals total for each window
  - hidden count appears when total exceeds the configured limit
  - source/stat/release/source-card/case-study windows still obey their existing limits

What was learned:
- context rows had the same drift risk as detail stats before display windows were shared
- component-local slicing makes the UI look bounded but leaves the contract under-validated
- future detail sections should join shared display state first, then the drawer should render that state

# 2026-04-28 - Search-result focus state now closes search at the reducer boundary

What changed:
- fixed shared entity-focus state in:
  - `src/lib/map/entity-activation.ts`
- strengthened live interaction validation in:
  - `scripts/qa/validate-interaction-contract.ts`
- strengthened shared reducer validation in:
  - `scripts/qa/validate-selection-context-contract.ts`

What was verified:
- `npm run qa:validate-interaction-contract`
- `npm run qa:validate-selection-context-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 29404`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- live South Cary wastewater search focus now proves:
  - selected entity `npdes-nc0065102-001`
  - drawer open
  - search closed
  - camera target `SOUTH CARY WRF`
  - coordinates `[-78.4528, 35.3848]`
  - height `420000`
- live Briarwood wastewater search focus now proves:
  - selected entity `npdes-nc0062740-001`
  - drawer open
  - search closed
  - camera target `BRIARWOOD FARMS WWTP`
  - coordinates `[-78.4838, 35.4122]`
  - height `420000`

What was learned:
- the UI already pre-closed search before applying the focus reducer, but that was a call-site workaround, not a durable shared contract
- cross-surface focus reducers need to own every state field they semantically change, including search-open state
- future search activation work should keep reducer-level coverage so a new caller cannot accidentally leave the search surface open over a selected detail drawer

# 2026-04-28 - Search UI now relies on the reducer to close search

What changed:
- updated production search-result activation in:
  - `src/components/explore/search-control-shell.tsx`

What was verified:
- `npm run qa:validate-interaction-contract`
- `npm run qa:validate-selection-context-contract`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local/up.ps1 -SkipBuild -AllowDegradedWithoutDb`
- `npm run local:verify`
- `npm run local:status`

Measured result:
- runtime is healthy:
  - `listenerPid = managedPid = 28940`
  - `runtimeMode = prod-start`
- full readiness remains:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- production search selection now passes the actual `isSearchOpen` store value into `resolveExplorerEntityFocusState(...)`
- live South Cary and Briarwood search focus still validate:
  - selected record set
  - drawer open
  - search closed
  - selected-record camera target at height `420000`

What was learned:
- fixing the reducer was necessary but not sufficient while the live UI still fed it already-closed search state
- the stronger contract is now both implementation-level and production-call-site-level
- future cross-surface reducers should be checked for the same failure mode: a validator can prove reducer behavior while a caller still masks whether the reducer truly owns the state transition

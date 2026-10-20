# 1337tools v4.93 — presentation preflight / technical QA

Baseline: v4.92; seven tools: FIELD, SLICE, ASCII, EDITOR, GLASS, ECHO, SCAN.

## Verified in this environment

- `npm run audit`: passes structural regression checks for all seven tools, tool labels, navigation, CONTINUE routes, transparent PNG actions, icons, color palette, SCAN scanner invariants, and EDITOR paint/export code paths.
- All 25 `.js` components, app and library source files parse as JavaScript/JSX without syntax errors (TypeScript parser).
- `app/globals.css` parses without CSS syntax errors (PostCSS).
- GLASS render comparison, before (v4.92) and after: sample image, 240x300, modes CLEAR/PRISM/LIQUID/SATIN; zero pixel-channel differences in all modes using the same Canvas backend.
- SCAN source rendering comparison, before and after, 240x300: no pixel-channel differences for B/W and COLOR modes. Full snapshot comparison with sampled motion, both scan directions, and PNG-alpha pixel data likewise had zero differences (150x190).
- ZIP structure and file CRC checks.

## Optimizations in v4.93

- SCAN no longer reruns costly B/W conversion when the source image and its view have not moved.
- The SCAN Canvas pass continues to advance at frame rate; the progress value presented to React is updated roughly 10 times per second.
- GLASS reuses temporary pixel sampling buffers rather than allocating multiple RGBA arrays per output pixel.
- GLASS incoming-file lifecycle is independent of transient pointer/guide UI state.

## Not verified / known limitations

- **Full `next build` and live React/browser E2E tests were NOT completed**: package dependencies could not be fetched due to the external npm registry DNS error (`EAI_AGAIN`). Source and independent Canvas checks are not substitutes for a full production build.
- Desktop/mobile Safari, large originals, end-to-end transfers to EDITOR, transparent export on live deployment, and user-specific browser/device performance need testing on the staging URL.
- Google Fonts are loaded from an external URL; font fallback may appear if the venue network is offline.
- Heavy 2x EDITOR PNG export and high-resolution SCAN export remain synchronous. Export could briefly make the UI unresponsive on slower laptops. Do not add Web Workers or refactor export hours before a presentation without testing.
- Historic CSS contains ~1065 top-level rules with many overrides. It is a maintainability risk; wholesale cleanup before a demo is not advised.

## Five-minute live show checklist (staging deployment)

1. Confirm **4.93**, cobalt #0047DE, seven cards. Hover ECHO/SCAN and check background word + 4px card shift; test scrolling from the card itself.
2. FIELD, SLICE, ASCII: load one file, randomize, export PNG. Check the PNG opens.
3. GLASS: load image, drag lens, toggle guides, export PNG; no lens outlines in file; test Send to Editor.
4. SCAN: load image, START SCAN, drag during scanning, test RANDOMIZE, export PNG and PNG α. Check no transparent 'ghost original' in scanned area.
5. EDITOR: make a text object and shape, turn fill/stroke to NONE independently, export PNG (check transparency). Test CONTINUE from one tool to another.
6. Test one mobile viewport and Safari if that is the presenter's browser. Keep **v4.92** as a rollback file until staging is verified.


# 1337tools v4.96 — pre-drop QA

## Checked in this release

- The 25 JavaScript/JSX modules under `app/`, `components/` and `lib/` parse successfully using the TypeScript 5.8 JSX parser/transpiler.
- Every local relative import points to an existing module.
- `app/globals.css` parses with `tinycss2`: 0 top-level syntax errors.
- `npm run audit`: all original integration/layout/navigation/export checks pass, plus new guards against stale SCAN frames and invisible RANDOMIZE launches.
- Chrome/Chromium Canvas tests: SCAN `TOP → BOTTOM` and `LEFT → RIGHT`, each in `B/W` and `COLOR`. Incremental scan results match the snapshot renderer in all four cases (same pixel hashes).
- Chromium test: real `ScanTool` callbacks were exercised with controlled React-hook stand-ins and an actual canvas/image. Starting RANDOMIZE and restarting it during an active pass both produced captured scan strips without JavaScript errors.
- Chromium test: GLASS EDIT versus CLEAN has different appearance, while CLEAN retains original alpha/transparency outside artwork.
- Chromium test: EDITOR `exportScene` for a shape with `fill:null` and `stroke:null` produces zero nontransparent pixels, with no accidentally restored black paint.
- Zip archive integrity, expected version strings, tool routes, catalogue order (05 GLASS / 06 ECHO / 07 SCAN), tool-to-tool CONTINUE destinations and original brand blue checked.

## Not verified here

- A full Next.js `npm run build` was not executed because npm registry access is unavailable in this runtime; project dependencies were not installed. Do not treat static parse checks as a production build.
- No full interactive, mounted React 19/Vercel/Safari end-to-end test was performed. The callback test uses a React hook stand-in and cannot guarantee that every actual client interaction behaves identically.
- Rendering/export tested with representative synthetic images, not all file formats, browsers or very large inputs.

## Required final checks on Vercel Preview (5 minutes)

1. Confirm index version **4.96**, correct #0038FF blue, translucent cards and animated card offset.
2. Open each of seven tools once; check for visible browser console errors.
3. SCAN: upload a photograph, click RANDOMIZE and confirm an immediate partial image and moving scanline. Click RANDOMIZE again while active; the pass should restart rather than freeze.
4. SCAN: change B/W / COLOR and scan direction; try manual drag, pause/resume and CLEAR PASS.
5. SCAN: PNG, PNG α, SEND TO EDITOR and CONTINUE; verify output content.
6. GLASS: import transparent text PNG, enable CLEAN, export PNG α (no white lens rings or loss of transparency).
7. EDITOR: create a shape and a text object; select NONE for fill and stroke separately, export PNG α; confirm styles and transparent regions.
8. Check mobile index scroll and tools in Safari if this is the show device.

Previous v4.95 is the rollback build. If preview build or steps above fail, do not promote v4.96 to production.

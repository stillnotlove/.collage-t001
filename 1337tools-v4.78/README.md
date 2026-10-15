# 1337tools v4.78 — catalog + SCAN overhaul

This release builds on v4.77.

## Catalog
- Six fully separate tool cards: FIELD / SLICE / ASCII / EDITOR / ECHO / SCAN.
- 3-column first row, full-width EDITOR, two-column ECHO / SCAN final row on desktop.
- Tablet and narrow layouts are explicitly defined; the catalog scrolls instead of clipping.
- Existing tool routes, analytics events and tool order are unchanged.

## SCAN
- The interactive scanner strip remains the main interaction: press START SCAN, then drag the sheet while the beam passes. The image is captured in bands at the sheet position at that moment.
- SCAN EFFECT is a real 0–100% blend between the clean source and processed scan. Deformation, film-like fine grain and contrast have independent, predictable controls.
- B/W operates in luminance; COLOR preserves RGB information.
- CLEAN / RAW / BROKEN style starting points, with advanced stretch/smear/banding/softness settings hidden by default.
- RANDOMIZE changes a bounded group of related parameters and automatically performs a scan with a seeded sheet-motion path. It preserves the chosen scan speed, direction and color mode.
- Progressive browser preview and high-resolution PNG output share the same per-line capture and fine-grain renderer. No large random black-dot overlays.
- PNG / PNG alpha / CONTINUE / EDITOR handoffs are retained.

## Other tools
Original FIELD, SLICE, ASCII, ECHO and EDITOR components are byte-for-byte identical to v4.77, including HQ export in FIELD / EDITOR. Vercel Analytics integration is unchanged.

## QA
- `node scripts/audit.mjs` — structural test of all 6 tools, routes, imports and exports.
- JSX parser checked all 23 JS/JSX files.
- Chromium engine tests cover 0%/100%, color/BW, transparency, seeded randomization and pixel-exact streamed-versus-exported output.
- Chromium layout tests cover 1440, 1200, 1024, 820, 600, 390 and 320px, without any card collision or horizontal scrolling.
- Full Next.js `next build` has **not** been run without installed npm dependencies. Verify the integrated SCAN UI on a Preview deployment before promoting to production.

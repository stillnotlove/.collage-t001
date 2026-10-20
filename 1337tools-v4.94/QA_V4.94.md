# 1337tools v4.94 — GLASS acceptance checklist

Baseline: v4.93. Seven tools unchanged in catalog: FIELD, SLICE, ASCII, EDITOR, GLASS (05), ECHO (06), SCAN (07).

## Changes

- CLEAR only: no PRISM, LIQUID, SATIN buttons. RANDOMIZE never changes character.
- EDIT = control circles, centers and decorative glass surface glow. CLEAN = no overlays, no white glass halos, still visibly refracts the source.
- CLEAN/EDIT state is shared by the live preview and PNG/PNG α/Send to Editor/Continue output. Actual control guides are **never** embedded in output.
- Transparent PNG preview shows checkerboard; it is UI only and does not appear in exports.

## Automated checks performed

- `node scripts/audit.mjs`: PASS (7 tools, version 4.94).
- TypeScript compiler JSX/JS parser, 25 files: PASS.
- Chromium Canvas render, transparent black-text test and opaque paper-background test: v4.94 EDIT matched v4.93 CLEAR PNG byte-for-byte.
- Chromium Canvas render, CLEAN: decorative reflections removed; source alpha coverage of transparent test preserved (240,387 fully transparent pixels out of 300,000).
- ZIP integrity/structure: separately validated.

## Manual browser checks before deployment

1. Open GLASS (05), load transparent logo PNG; verify checkerboard background and black letters.
2. Drag a lens in EDIT, then click `HIDE HUD → CLEAN`. The outlines, center handles AND white circular shine should disappear, but distortion remain.
3. Export PNG α, open on a dark/light background: no chessboard, no opaque paper background, transparency maintained.
4. Export regular PNG and SEND TO EDITOR while CLEAN. Confirm there are no circular shine/guide artifacts.
5. Click SHOW HUD → EDIT and move a lens. Confirm same editing controls as v4.93.
6. RANDOMIZE must not introduce other glass characters; select multiple lenses and export again.
7. Check FIELD, SLICE, ASCII, EDITOR, ECHO, SCAN and catalog hover for regression.

Limitation: Full Next.js build and end-to-end React testing not performed here. Verify in Vercel Preview (particularly Safari) before replacing production.

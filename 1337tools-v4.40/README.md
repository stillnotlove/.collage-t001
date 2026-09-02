# 1337tools v4.40

Motion + editor-canvas cleanup release. No new tools.

## Changes
- main entry returns to a clean motion sequence: CLEAN → animated SLICE → ASCII variant A → ASCII variant B → CLEAN
- ASCII variants are randomized between glyphs, blocks, braille and squares; the second variant always differs from the first
- heavy outline/tiles/blend states are excluded from the entry grammar
- ASCII frames are pre-rendered once per cycle; only SLICE geometry animates per frame, keeping the sequence lightweight
- every frame explicitly clears the main canvas, preventing previous ASCII states from sticking during the return to CLEAN
- Editor canvas background is now actually editable despite the glass workspace CSS
- Editor Canvas section includes PAPER / WHITE / BLUE / BLACK presets plus the color picker
- Editor preview and export share the same background state
- the long rule below `visual processing system` is replaced by a small dotted marker
- catalog, HUD, Credits and the five existing tools otherwise keep the established visual/functional system

## Stability
FIELD / SLICE / ASCII / ECHO / EDITOR behavior, ratios, PNG/PNG alpha export, CONTINUE flow, image-load guards, STAMP fill/stroke controls, hover-only card underlays, Credits copy and shared brand tracking remain intact.

# 1337tools v4.21

## Entry / live mark
- full-viewport canvas: the mark is recalculated from the actual browser window size and aspect ratio
- true visual centering using measured text ascent/descent rather than a fixed baseline
- slower REBUILD and a longer clean hold before the next process starts
- route generation now uses multiple curated transformation chains instead of one recurring slice/ascii pattern
- added PIXEL, COLUMNS and RIPPLE transformations to the live pipeline
- routes, seeds, strengths and timings remain randomized

## HUD
FIELD, SLICE and ASCII now use collapsible HUD groups matching the editor accordion behavior. Open/closed state is saved locally.

## Index naming experiment
The functional tool names are unchanged, but hovering a tool morphs its label to a process alias:
- FIELD → DISTRIBUTE
- SLICE → REORDER
- ASCII → GLYPH
- EDITOR → COMPOSE

This keeps routing stable while testing a less generic naming language visually.

## Site icon
The favicon/app icon is now a plain #0038ff blue circle.

## v4.21 entry animation refinement
- removed the visible sweep/fixed stripe from the live mark
- removed RIPPLE from the regular route grammar; motion is now less wave-heavy
- increased ASCII weighting in route generation
- added explicit square, block and Braille ASCII render states
- route insertion now prefers ASCII-family transformations

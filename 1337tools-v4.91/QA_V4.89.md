# 1337tools v4.89 — quality checklist

## Fixes

- Brand primary blue `#0035BD` is the same on splash, catalog idle cards and interface headers. Catalog films/background decorations no longer recolor surfaces.
- Index hover: card shifts (-4,-4) with shadow. Card labels stay static. Background large tool name still changes on hover.
- EDITOR: each fill / stroke / outline palette includes COLOR and NONE. NONE uses `null` in layer state. The previous color is retained for COLOR restore.
- Stamped shapes keep null when other stamp parameters change.
- Outside text outline can be drawn without fill (SVG and PNG Canvas rendering).
- Halftone dot color accepts NONE; the dot effect disappears instead of reverting to black.

## Manual QA after deployment

1. Check splash and catalog idle tile against identical hex color (#0035BD) with inspector.
2. Hover all seven cards: dark background name changes; tile moves; text stays fixed.
3. In EDITOR create rectangle, set stroke width >0; set Fill → NONE; stroke remains, including in PNG.
4. Set Stroke → NONE; fill remains; then COLOR restores previous stroke.
5. Text with Outline width >0 and OUTSIDE mode: Fill → NONE must leave only outline.
6. Stamp a shape, set its Fill/Stroke to NONE, change size or width; null paint must persist.
7. Multi-select shapes and text: Group Fill → NONE should remove paint from each.
8. Test export PNG α after disabling fill and outline.
9. Re-deploy the new archive; previous deployed pages may still use #0052F5. Perform a hard refresh, and check deployed version label 4.89.

## Testing limits

Static source audit and syntax checks for pure JavaScript passed. Full Next.js production build, browser interaction/PNG parity and Safari were not run in this environment (project dependencies unavailable).

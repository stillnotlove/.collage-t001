# 1337tools v4.45

Technical QA / stability release. No visual redesign and no new tools.

## Current entry motion
- CLEAN → ASCII variant A → SLICE → ASCII variant B → CLEAN
- ASCII variants are randomized between glyphs, blocks, braille and squares; the second variant always differs from the first
- heavy outline/tiles/blend states are excluded from the entry grammar
- ASCII and SLICE target frames are pre-rendered once per cycle; transitions only blend prepared frames
- the main canvas is explicitly cleared every frame so old ASCII states cannot stick
- resize work is event-driven instead of forcing a layout read on every animation frame
- animation timing pauses while the tab is hidden and resumes without phase jumps

## QA / technical fixes
- all slider + numeric controls now use one shared `RangeInputs` implementation across FIELD / SLICE / ASCII / ECHO / EDITOR
- numeric input is clamped to its declared min/max, respects step values, handles negative/decimal drafts safely, and keeps the fixed aligned value column
- Editor keyboard shortcuts no longer steal Cmd/Ctrl+Z, Cmd/Ctrl+D, Delete or Escape while typing in an input/select/textarea/contenteditable element
- paste handlers use the same editable-target guard in all tools
- Editor async image insertion and background cutout commit against the latest scene state instead of an older render snapshot
- ECHO ignores stale background-removal results if the source image changes while cutout is running
- obsolete entry-animation CSS from the old phase renderer was removed
- the internal static visual-audit page was refreshed to the current catalog instead of the old 4.33 markup

## Existing behavior retained
- editable Editor canvas background with PAPER / WHITE / BLUE / BLACK presets
- exactly three dots below `visual processing system`
- circular static slider thumbs and fixed numeric value column
- hover-only card underlays
- FIELD / SLICE / ASCII / ECHO / EDITOR ratios, PNG / PNG α export and CONTINUE flow
- Credits copy and current brand treatment

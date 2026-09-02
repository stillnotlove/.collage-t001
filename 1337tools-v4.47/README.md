# 1337tools v4.47

Motion / stability release. No new tools.

## Current entry motion
- CLEAN → exactly 3 generated effects → CLEAN
- routes are randomized from lightweight ASCII / SLICE / ECHO combinations, with a preferred ASCII → SLICE → ASCII grammar in the pool
- ASCII variants are randomized between glyphs, blocks, braille and squares without repeating the same variant inside one route when alternatives exist
- SLICE is live: horizontal bands continuously spread apart and converge again with deterministic smooth motion
- transitions use quintic easing and lightweight canvas crossfades; heavy outline/tiles/blend states remain excluded
- ASCII frames are pre-rendered once per cycle; only low-cost SLICE/ECHO draw operations animate per frame
- the main canvas is explicitly cleared every frame so old effect states cannot stick
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
- giant FIELD / SLICE / ASCII / ECHO / EDITOR background labels are disabled in every workspace
- the internal static visual-audit page was refreshed to the current catalog instead of the old 4.33 markup

## Existing behavior retained
- editable Editor canvas background with PAPER / WHITE / BLUE / BLACK presets
- exactly three dots below `visual processing system`
- circular static slider thumbs and fixed numeric value column
- hover-only card underlays
- FIELD / SLICE / ASCII / ECHO / EDITOR ratios, PNG / PNG α export and CONTINUE flow
- Credits copy and current brand treatment

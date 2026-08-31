# 1337tools v4.16

Audit + refinement release.

## Audit fixes
- re-checked FIELD / SLICE / ASCII / EDITOR for ratio, preview, export and transfer consistency
- restored the transparent FIELD workspace preview so the beige/white field backdrop does not return
- added image-load failure handling to procedural tools
- kept PNG and PNG alpha export paths separate
- preserved canvas ratio through CONTINUE / SEND TO EDITOR
- bumped all visible version labels to 4.16

## ASCII
- removed the two dark-blue strips around ASCII preview (they were the shared canvas shadow leaking into this tool)
- fixed source geometry again: sampling now happens from the actual transformed canvas, so the image is not squeezed by the ASCII sampling grid
- corrected the character grid aspect to better match monospace glyph proportions
- RAW / STRAIGHT is now a direct two-state switch
- added BLUE as an explicit color mode; WHITE now actually means white
- added selectable background color
- added Image scale (25-400), Image X and Image Y, plus reset
- expanded ASCII Scale to 20-500 for poster/detail use
- PNG keeps the selected background; PNG alpha removes it
- CONTINUE / SEND TO EDITOR keep the selected ASCII background because it is part of the visible composition

## Entry
- added a restrained cyclic transformation of the 1337tools mark: CLEAN -> ASCII -> SCAN -> DISTRESS
- kept click/key entry behavior unchanged
- tightened the local kerning between 1 and the first 3 without globally crushing 1337 tracking

Vercel Root Directory: `1337tools-v4.16`

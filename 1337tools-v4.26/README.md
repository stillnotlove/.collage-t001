# 1337tools v4.26

Stability / audit release.

Key changes:
- Stamp text defaults to `1337`.
- Shape Stamp has Fill, Stroke and Stroke width controls again; selected stamped shapes update live.
- Fixed duplicate Editor clear-canvas handler.
- Fixed image replacement in FIELD / SLICE / ASCII / ECHO so a damaged new file no longer destroys the currently loaded source.
- FIELD pipeline now keeps its selected background, matching what the user sees in preview; PNG alpha remains transparent.
- Tool hover previews no longer keep idle requestAnimationFrame loops running.
- Added `by stillnotlove` to the tool index.
- Main entry animation has additional OUTLINE / TILES routes while retaining ASCII / block / Braille-heavy variants and a readability floor.
- General version / import / syntax consistency pass.

Root Directory: `1337tools-v4.26`

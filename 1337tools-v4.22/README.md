# 1337tools v4.22

## Index hover identities
- FIELD: the word behaves like a small vector field and pulls toward a generated attractor.
- SLICE: the word is split by a diagonal cut and the halves move in opposite directions.
- ASCII: the word rebuilds live from randomly selected glyph, square, block, or Braille systems.
- EDITOR: the word becomes a selected object with transform handles and a small live transform.
- Names themselves stay FIELD / SLICE / ASCII / EDITOR.

## Navigation
- Clicking the 1337tools wordmark in the index or inside any tool returns to the entry screen.

## Entry animation
- Expanded the transition grammar instead of adding more wave movement.
- Added block-ASCII routes and four different rebuild behaviours: glyph, diagonal slice, columns, and soft settle.
- Routes mutate within curated rules so cycles do not fall into the same slice → ASCII → clean pattern.
- Clean state now remains visible longer between cycles.

## Existing features retained
- FIELD / SLICE / ASCII collapsible HUD groups.
- ASCII background, image zoom/position, RAW/STRAIGHT, extended character scale.
- CONTINUE pipeline and transparent export.

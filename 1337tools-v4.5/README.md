# 1337tools v4.5

TYPE deep-glyph update + smoother entry transition.

## Main changes
- Entry → index transition is slower and more fluid, with a soft scale/blur exit and staggered index arrival.
- TYPE now mutates the actual raster silhouette of glyphs instead of only rotating/scaling normal text.
- Added GLYPH FORM controls: Roundness, Inflate/Erode, Width, Height, Slant, Horizontal Cut, Vertical Cut, Slice Offset and Slice Position.
- WORD mode still randomizes complete words, but each letter now receives its own seeded glyph-form mutation.
- GLYPH mode acts as a single-glyph generator and keeps controlled reroll/random generation.
- Outline follows the mutated glyph silhouette approximately rather than the untouched font shape.
- Existing FIELD and EDITOR remain available.

## Deploy
Vercel Root Directory: `1337tools-v4.5`

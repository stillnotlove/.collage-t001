# 1337tools v3.6

Experimental graphic playground / COMPOSE branch.

## v3.6 stabilized build
- Blue / white / yellow HUD foundation for the future new-ugly visual language.
- `1337` uses a heavy Arial Black-style system stack; `tools` uses a thin Helvetica/Arial-style stack.
- Curated type list: Arial, Arial Black, Helvetica, Helvetica Neue plus open web fonts Golos Text, IBM Plex Sans, IBM Plex Mono, JetBrains Mono, Roboto Condensed, Commissioner, Unbounded, Archivo Black and Space Mono.
- Canvas display fits the available viewport while document dimensions stay fixed by ratio.
- Export was rebuilt: PNG/JPEG now render directly from the scene model into an exact-size Canvas instead of screenshotting the editor DOM. Selection, handles, HUD state and responsive canvas size cannot affect export.
- Removed the `html-to-image` dependency and its DOM/font/mask serialization failure path.
- Export keeps layer order, rotation, opacity, blend modes, shapes, text, image fit and the current distress effects.
- Image decode is cached during export so repeated copies of the same source are not decoded for every layer.
- Blob URLs are retained for the whole editing session so Undo/Redo cannot restore a revoked image; they are released on editor unmount.
- No-op pointer gestures no longer create unnecessary Undo entries.
- Next.js remains on 15.5.24.

## Deploy
Set Vercel Root Directory to `1337tools-v3.6`.

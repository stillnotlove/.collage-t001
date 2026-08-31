# 1337tools v4.14 — audit / stability pass

Audited FIELD, SLICE, ASCII, EDITOR, shared export and selection geometry.

Fixed:
- FIELD preview accidentally regained the light canvas background; preview is transparent again.
- FIELD noise is now masked to actual generated image content, so PNG α does not create stray noise over empty transparency.
- FIELD / SLICE / ASCII canvas ratio changes now redraw immediately and react to workspace resizing.
- Procedural exports use a Safari-safe download flow and show errors instead of failing silently.
- ASCII handles Unicode charsets correctly and respects source alpha / transparent pixels.
- EDITOR imported images now keep their real aspect ratio on non-square canvases (including SEND TO EDITOR results).
- New regular shapes start with correct physical proportions on portrait / landscape canvases.
- Changing EDITOR canvas ratio preserves layer visual proportions and participates in Undo/Redo.
- Multi-selection bounds, marquee hit-testing and group rotation are corrected for non-square canvases.
- EDITOR canvas is isolated for more predictable blend-mode preview.
- Editor clipboard image insertion now follows the current canvas ratio instead of a stale ratio closure.
- Stamp style edits now participate in Undo/Redo as one control gesture.
- FIELD Contrast=0 and Posterize=1 now behave correctly.
- SLICE at Chaos=0 no longer adds hidden random opacity.
- Removed duplicated canvas-size text and stale displayed/browser version labels.

Canvas presets remain: 1:1, 4:5, 9:16, 16:9, 3:2.

Vercel Root Directory: `1337tools-v4.14`

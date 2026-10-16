# 1337tools v4.87 — tool numbering

This release is based on v4.84. **08 WEAVE has been removed completely** from the catalogue, routing, CONTINUE and implementation. Seven tools remain: FIELD, SLICE, ASCII, EDITOR, ECHO, SCAN, GLASS.

Hovering a catalog card now moves the whole card up-left by 4px and reveals the original offset shadow. Card text stays static; no animated canvas labels. Keyboard focus has equivalent feedback and reduced motion is respected.

No other tool rendering or exports were intentionally changed. Run `npm run audit` for structural checks. Full Next.js build requires project dependencies; browser verification should be repeated on Vercel Preview, especially Safari.

## v4.86

Restores dynamic dark background tool lettering on catalog hover and keyboard focus. The card shifts remain CSS-only while labels stay static. The background returns to FIELD when no card is hovered, and hover state clears on wheel scroll.


## v4.86 — entry pacing and blue correction

- INTRO (splash → catalog): blue cover dissolves over **720 ms**, with no transform on the catalog and no interactive scroll blocker.
- Tool / credits → INDEX remains immediate; the return path is intentionally faster.
- The brand UI blue is now `#0052F5` (with matching blue-dark/deep), shifting from violet-indigo to a cooler, cleaner blue. Theme metadata and BLUE presets are aligned.
- Hover switches the oversized dark background text to the hovered or keyboard-focused tool, while the card itself translates and its label stays static.

## v4.87 — tool order and numbering

The catalog and workspace headers now use **05 GLASS → 06 ECHO → 07 SCAN**. This matches the existing visual grid position: GLASS beside EDITOR, then ECHO and SCAN on the following row. All seven tool implementations, hover motion, blue palette and entry timing are otherwise unchanged.

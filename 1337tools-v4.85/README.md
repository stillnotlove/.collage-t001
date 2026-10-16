# 1337tools v4.85 — WEAVE removal + interactive catalog cards

This release is based on v4.84. **08 WEAVE has been removed completely** from the catalogue, routing, CONTINUE and implementation. Seven tools remain: FIELD, SLICE, ASCII, EDITOR, ECHO, SCAN, GLASS.

Hovering a catalog card now moves the whole card up-left by 4px and reveals the original offset shadow. Card text stays static; no animated canvas labels. Keyboard focus has equivalent feedback and reduced motion is respected.

No other tool rendering or exports were intentionally changed. Run `npm run audit` for structural checks. Full Next.js build requires project dependencies; browser verification should be repeated on Vercel Preview, especially Safari.

# v4.92 — navigation transition QA

- [ ] Open splash screen; click or press a key; the catalog should reveal in approximately 460 ms.
- [ ] Use BACK/INDEX from any tool; catalog should appear immediately, without the long curtain.
- [ ] From the catalog open a tool, return to INDEX, repeat with GLASS and SCAN.
- [ ] Scroll wheel / trackpad over catalog cards must scroll normally.
- [ ] Hover cards: 4 px movement, white shadow, large background label follows focus/hover; glyphs remain still.
- [ ] Verify color #0047DE and translucent cards unchanged.

Only the intro-to-catalog curtain animation timing was changed in the runtime stylesheet; version labels and audit were updated.

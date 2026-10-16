# QA v4.85

- Homepage catalogue displays exactly seven distinct tools, ending with 07 GLASS.
- WEAVE no longer appears in navigation or CONTINUE.
- Hover on every card translates the *card* by 4px up-left with a 6px offset shadow. Text does not animate independently.
- Wheel/trackpad scroll should work while pointer is directly above any card.
- Tap/focus on mobile and with reduced-motion preferences do not trigger hover animation.
- FIELD, SLICE, ASCII, EDITOR, ECHO, SCAN, GLASS route and exports should work unchanged.
- `npm run audit` checks structural integrity only; it is not a production build.

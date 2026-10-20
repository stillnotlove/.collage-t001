# QA v4.87

- Exactly seven tools are listed: 01 FIELD, 02 SLICE, 03 ASCII, 04 EDITOR, 05 GLASS, 06 ECHO, 07 SCAN.
- GLASS beside EDITOR in the second row displays 05. ECHO / SCAN below display 06 / 07.
- Open GLASS, ECHO, SCAN and verify their workspace headers display the same new numbers.
- Hover cards: background lettering changes to matching tool; entire card shifts with offset shadow; text itself remains static.
- Splash transition remains 720 ms and color remains #0052F5.
- CONTINUE and exports remain functional; no routing IDs changed.
- npm run audit checks structure; production build / Safari preview are separate checks.

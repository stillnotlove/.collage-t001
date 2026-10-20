# 1337tools v4.90 — color-only regression checklist

1. Splash, index background and idle cards must all compute to #0047DE.
2. Tool chrome should use the same #0047DE; workspaces may intentionally use darker #0035A9, with shadows #001B66.
3. Browser theme color, PWA manifest and application icons should match #0047DE.
4. FIELD / ECHO / EDITOR BLUE presets should select #0047DE.
5. Hover on catalog cards should still move the card and change large dark background text; card label text remains static.
6. EDITOR COLOR/NONE for fill and stroke and PNG export must remain unchanged from v4.89.
7. Check brand color after publishing with a hard refresh. Version should display 4.90.

Status: source-level checks and archive validation; full browser deployment testing may need to occur on your environment.

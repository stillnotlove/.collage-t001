# 1337tools v4.68

Favicon cleanup release.

## What changed
- favicon now has one canonical source: `app/favicon.ico`
- Next.js app metadata files provide `app/icon.png` and `app/apple-icon.png`
- removed duplicate favicon/icon files from `public`
- removed manual `metadata.icons` and manual `<link>` declarations from `layout.js`
- manifest now references the canonical Next-served `/icon.png`
- no wordmark, kerning, tools or layout changes

## QA
Run `npm run audit`.

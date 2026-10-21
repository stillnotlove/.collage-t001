# 1337tools · v4.96 (release candidate)

Web-based visual experiments: FIELD · SLICE · ASCII · EDITOR · GLASS · ECHO · SCAN.

## Run locally

Requirements: Node.js 20+ and npm with access to the package registry.

```bash
npm install
npm run audit
npm run build
npm run start
```

Deploy to Vercel by importing the project directory, with the default Next.js framework configuration. Keep the Next.js configuration, `app`, `components`, `lib` and `public` directories at the root of the deployed project.

## Release changes

This release is based on v4.95 and is limited to a SCAN reliability patch:

- RANDOMIZE now cancels any previous scan pass and drops delayed callbacks from it.
- It creates an immediate first-pass result, before the next animation frame.
- Subsequent scan strips continue in the same deterministic scan engine as before.
- The SCAN progress display resets correctly on repeated RANDOMIZE.
- Starting PNG export, PNG α export or CONTINUE freezes the current pass so the result cannot change during rendering.

All seven tools, their appearance, the original brand blue `#0038FF`, navigation, transition timing and export formats are unchanged. The earlier GLASS CLEAN/HUD behavior is preserved.

See `QA_RELEASE_V4.96.md` for exact test coverage and known verification limits, and `CHANGELOG.md` for previous versions.

# 1337tools v4.67

Safari favicon reliability fix.

- adds a real `app/favicon.ico` for Next.js App Router file-based metadata
- keeps `/public/favicon.ico` as a direct browser fallback
- removes query-string cache keys from favicon URLs
- keeps PNG, Apple Touch and Safari pinned-tab fallbacks
- does not change wordmark, kerning, tools or layout

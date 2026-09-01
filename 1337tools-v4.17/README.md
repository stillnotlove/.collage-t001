# 1337tools v4.17

- Reworked the entry screen animation from preset DOM states into a real-time generative canvas renderer.
- The clean 1337tools wordmark is rasterized live and continuously passes through randomized ASCII, slice, scan, distress and echo processes.
- Each process receives a new randomized seed, duration and internal parameters; the order is intentionally non-fixed.
- Effects blend in and out around the clean wordmark instead of hard-cutting between static variants.
- The entry render area has explicit padding and all effects stay inside one canvas, preventing the cropped / broken look from v4.16.
- Reduced-motion preference falls back to the clean mark.
- All existing FIELD / SLICE / ASCII / EDITOR functionality from v4.16 is retained.

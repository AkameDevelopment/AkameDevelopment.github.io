# Header geometry browser checks

From the repository root:

```sh
npm ci --prefix tests/header-layout
CHROMIUM_PATH=/usr/bin/chromium npm test --prefix tests/header-layout
```

Set `CHROMIUM_PATH` to a compatible Chrome/Chromium executable on your machine. The pinned Playwright Core dependency is test-only; no website runtime dependency is added.

The runner renders the actual repository HTML, scripts and CSS in Chromium, with a synthetic delayed Discord member and avatar. All requests are intercepted: no real login, credentials, backend reads or writes are used. External fonts/media are not needed for the header geometry. The header uses system fonts to avoid page-specific font metric changes.

Coverage: 17 pages × 13 viewport widths (320, 360, 390, 768, 850, 851, 900, 901, 1024, 1280, 1500, 1501, 1920). The runner samples initial previews and initialized controls, checks position/size stability, compares positions across pages, and verifies all four main destination links are visible either in the desktop navigation or its menu.

Additional task QA used the real Chromium browser for German/dark and English/light interactions at ten widths, 12 window-resize transitions, account/notification overlays, a short settings page, and long profile names. Safari and actual Discord OAuth were not tested by this layout suite.

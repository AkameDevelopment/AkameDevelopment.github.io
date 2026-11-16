# Header geometry browser checks

From the repository root:

```sh
npm ci --prefix tests/header-layout
CHROMIUM_PATH=/usr/bin/chromium npm test --prefix tests/header-layout
```

Set `CHROMIUM_PATH` to a compatible Chrome/Chromium executable on your machine. The pinned Playwright Core dependency is test-only; no website runtime dependency is added.

The runner renders the actual repository HTML, scripts and CSS in Chromium, with a synthetic delayed Discord member and avatar. All requests are intercepted: no real login, credentials, backend reads or writes are used. External fonts/media are not needed for the header geometry. The header uses system fonts to avoid page-specific font metric changes.

Coverage: 20 pages × 15 viewport widths (320, 360, 390, 768, 850, 851, 900, 901, 1024, 1359, 1360, 1400, 1500, 1501, 1920). The runner samples initial previews and initialized controls, checks position/size stability, compares positions across pages, and verifies all four main destination links are visible either in the desktop navigation or its menu.

Additional task QA used the real Chromium browser for German/dark and English/light interactions at ten widths, 12 window-resize transitions, account/notification overlays, a short settings page, and long profile names. Safari and actual Discord OAuth were not tested by this layout suite.

The full navigation is shown from 1360px, including windowed desktop layouts. The runner also checks that it never overlaps the wordmark or account actions. Narrower windows retain the menu.

The two nested AkameSMP server detail pages share the same header checks as the main site.

Run `npm run test:administration --prefix tests/header-layout` to check both server administration pages across guests, members, owners, developers, server admins, and unrelated global admins at mobile and desktop widths. Console commands stay disabled until the server connection is configured.

Server 2 uses its own statistics tables, ingestion endpoint and credential. `npm run test:stats2 --prefix tests/header-layout` verifies endpoint routing and payload rejection. Administration tests also verify the private configuration download stores only the token hash.

`npm run test:control --prefix tests/header-layout` checks remote-control authorization, server states, queued actions, console input and private agent setup downloads. `remote-control-rls.sql` is a rollback-only database policy test for privileged maintenance use; it never executes Minecraft commands.

`npm run test:avatars --prefix tests/header-layout` checks member-avatar loading on mobile/desktop, Discord animated URLs, uploaded GIFs, broken-image fallbacks, node reuse on layout changes, and reduced-motion canvases. Set `AVATAR_GIF_FIXTURE` to a local animated GIF to exercise a multi-frame asset.

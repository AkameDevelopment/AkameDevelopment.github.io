# Website stability and loading checks — 2026-11-16

Shared changes:

- One Supabase client per page, pinned to SDK 2.119.0, with a single PKCE/session lifecycle. Only simultaneous `getUser()` calls share an in-flight request; completed user data and authorization decisions are not cached.
- Translation work is grouped by animation frame. Its own text edits no longer trigger another full translation scan.
- Hidden tabs pause notification and administration polling; visible tabs resume immediately.
- Clean routes preserve settings/community/support tabs, ticket links and player-profile links. Static fragment links resolve against the current page instead of the root `<base>` URL.
- Explicit directory index pages take precedence over old redirect aliases. The guide does not redirect to itself, and nested `/index.html` URLs normalize to the directory.
- The lightweight route bootstrap is deferred. Connection hints and a versioned module preload start shared dependencies early.
- Cache fingerprints include the shared asset revision, so changing a dependency also invalidates cached scripts that reference its old URL.
- Restoring settings also synchronizes the reset theme to the signed-in profile.

## Controlled browser comparison

The same actual page scripts ran with a delayed synthetic authenticated SDK; all requests were intercepted. This measures initialization work, not real-user network load times or a Lighthouse score. Request coalescing depends on overlap; frame/network scheduling can shift an individual initial count between one and two.

| Page | SDK clients before → after | Initial getUser calls before → after |
| --- | --- | --- |
| Home | 5 → 1 | 5 → 1 |
| Downloads | 4 → 1 | 4 → 1–2 |
| Community | 5 → 1 | 5 → 1 |
| Settings | 4 → 1 | 4 → 1 |
| Profile | 7 → 1 | 8 → 2 |

Run `PERF_SITE=/path/to/generated/site PERF_ASSERT_SHARED=1 node tests/header-layout/performance.mjs` for the current initialization checks. `navigation.mjs` checks clean-route tab changes/reloads and the guide's in-page links. Both require Chromium and the pinned test-only Playwright dependency.

Validation includes the support/settings/community/notifications/build unit suite, shared-client isolation tests, a dependent-asset cache invalidation test, desktop/mobile header checks, and the existing server administration/remote-control browser tests. A rollback-only database signup fixture checks profile creation and one welcome notification; no fixture account is retained. Real Discord OAuth and the target Windows agent are not exercised by the browser fixtures.

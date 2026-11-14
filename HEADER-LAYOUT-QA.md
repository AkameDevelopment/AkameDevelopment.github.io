# Header layout correction

## Findings

- Legacy GitHub links in initial HTML briefly occupied space before JavaScript removed them. The measured loading shift reached 104.69px.
- Preview and live account controls had conflicting dimensions and padding; desktop account width changed by 8.14px, and mobile height by 2px.
- Different pages loaded header styles before different legacy style blocks, changing action gaps and breakpoints.
- Scrollbars were 10px on some pages and 15px on others, causing a further 5px route-to-route shift. The reserved gutter also showed a mismatched dark strip.
- Five obsolete `nth-child` rules hid selected primary navigation links in window mode.
- A menu click on its SVG could remove the original event target while switching icons. The outside-click check then mistook it for an outside click and closed the menu immediately.

## Changes

- `site-header.css`: explicit identical grid slots for static and initialized controls; shared preview/live dimensions and padding; consistent system fonts, scrollbar width and background; one menu breakpoint; readable light-mode Home link.
- `mobile-nav.js`: outside clicks use the event path, and the resize close threshold matches the 1500px navigation breakpoint.
- All 17 root HTML pages with a header: remove obsolete GitHub header markup, load the shared header stylesheet last, and update shared asset cache versions.
- Original support, community and authentication data flows remain intact. No database changes.

## Verification

- 221 Chromium page/width measurements: zero loading shifts and zero cross-page differences for share, notification and account control boxes.
- 20 Chromium interaction scenarios: German/dark and English/light; visible destinations, menu/account/notification controls, no overlaps or offscreen controls.
- 12 resize transitions across the navigation breakpoints and a short-page notification overlay check passed.
- 23 existing DOM/function regressions passed, including mobile scrolling, hit targets, profile preview and sign-out cleanup.
- Header screenshots inspected in Chromium. These are rendering checks with synthetic auth responses, not live Discord or Safari tests.

The repeatable browser runner and pinned test dependencies are in `tests/header-layout/`.

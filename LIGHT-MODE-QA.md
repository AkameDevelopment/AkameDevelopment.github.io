# Muted light mode

`light-mode.css` is a color-only, shared light-theme layer loaded last by every page with a header. All rules are scoped to `:root[data-akame-theme="light"]`.

The existing `site-theme.js` remains authoritative and unchanged: without an explicit saved Light preference, the website starts in Dark even when the operating system prefers Light. Existing saved preferences and the Settings theme selector continue to work.

## Appearance

- Muted lavender-gray canvas (#e8e5ee), soft surfaces (#f2f0f5) and restrained shadows replace white panels and large bright gradients.
- Dark readable text, deeper purple links, clear controls and focus indicators.
- Specific corrections for release cards, Community and member lists, the personal dashboard, Settings, admin editors, support tickets and replies, player statistics/dialogs and public/private profiles.
- Author-selected profile banners and example game artwork are retained. Names and biography panels remain legible on those backgrounds.
- No account permissions, data, content or backend schemas were changed.

## Verification

Chromium rendered all 17 pages at desktop (1920px) and mobile (390px) widths, with additional menus, forms, ticket details, admin sections and player-profile states: 92 views and 4,887 UI text checks in total. Measured UI text passed the contrast thresholds used by the audit (4.5:1 normal text, 3:1 large text). This sampling is not a certification for arbitrary user-authored images, videos, gradients or personalized colors.

Default Dark was checked on Home, Settings, Admin and Support with the system set to Light. With the light stylesheet present versus omitted, the sampled Dark colors and header geometry were unchanged. Saved Light survived navigation; both manual theme switches and the English settings selector passed.

Screenshots were inspected for the page families and critical dialogs. Authentication and content were mocked locally to isolate rendering; no real OAuth session or backend writes were used. Real Safari/iPhone rendering was not tested.

The parallel Community/Settings updates were preserved and rechecked before publication. The light layer does not replace their markup, scripts or behaviors.

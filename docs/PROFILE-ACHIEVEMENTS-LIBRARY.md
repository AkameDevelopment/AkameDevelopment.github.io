# Profile badges, achievements and personal mod library

## Existing implementation audited

- Discord Auth and staff_access roles. Owner/admin manage badges; owner/developer manage catalogue uploads. Preserve those boundaries.
- profile_badge_definitions / profile_badge_grants, automatic Beta Tester and Downloaded badges, Community/Minecraft visibility plus per-badge and global profile visibility.
- Public profile RPC filters display preferences, but raw badge grants had a public SELECT policy. No favourites or order yet. Staff role chips are rendered separately and need deduplication.
- Downloaded uses a download_events trigger. Existing browser-generated events cannot prove a server-authorized download; keep history and existing grants, do not relabel that history verified.
- Community dashboard has personal posts, support, selected-profile-mod downloads and beta access. profile_mods is a public profile selection, not installation or download history. Legacy dashboard also uses profile_mods and the obsolete static release feed.
- Catalogue/release data and private mod-files storage exist. Files are gated, but beta release metadata was public. The new request requires private beta releases to be inaccessible through the API as well.
- Support resolved status is administrator-controlled, protected by existing Discord-session restrictive RLS. Use resolved bug reports as confirmed evidence; submitting a bug alone is insufficient.

## Implementation plan

1. Reuse badge definitions/grants: add validated achievement criteria, translations and opt-out/revocation persistence. Reuse Downloaded and Bug Hunter instead of duplicate definitions.
2. Add ordered, validated max-three showcase IDs to the existing profile. Apply visibility before ordering public badges. Render role badges once.
3. Issue signed download URLs through an authenticated server endpoint; derive all event metadata server-side, deduplicate repeat starts, reject client inserts. Preserve legacy rows as unverified.
4. Server triggers and self-scoped refresh/backfill award permanent achievements from actual posts, verified non-demo download starts, distinct catalogue mods, resolved bugs and Auth registration age. No client counters.
5. Extend the current dashboard download section with a private library, last-downloaded labels, version comparison, authorised beta releases and short history. Keep profile selection separate.
6. Extend existing badge admin controls with criteria, descriptions, translations and recalculation; preserve manual grants and administrative revocation.
7. Test RLS, rollback fixtures, duplicates, visibility, grants/revocation, translations, responsive themes and existing profile/community flows.

## Evidence semantics

A verified download means the server authenticated/authorised the request and issued an expiring file URL. It does not prove that the browser completed saving the file, or that a mod is installed. Demo/test files do not count towards achievements. Old unverified history remains visible to its owner and administrators, with its provenance labelled.

## Implemented

- Profile Settings → Badges: global/per-badge visibility, ordered max-three favourites, earned/locked achievements, progress and English/German copy. The existing Save action persists the changes; public RPC output filters visibility before ordering and deduplicates role aliases.
- First Post, Active Member, First Download (reuses Downloaded), Mod Collector, Bug Hunter (reuses existing definition), Veteran. Existing grants are retained. Older awards without verified supporting events are labelled as retained historical awards in the owner's settings.
- Existing badge admin assignment flow remains. User management adds achievement names/descriptions in both languages, small icons/colours, supported server-side criteria, thresholds, pause switch and a recheck action. Server validation prevents new awards without evidence; revocation blocks automatic re-awarding.
- The existing Community dashboard download section and legacy dashboard now share the personal library. Public profile mod selection remains unchanged. Releases come from the existing catalogue. Library rows show last downloaded versions, authorised previews, semantic-version update checks and recent history; unknown versions are not guessed to be updates.
- `mod-download` authenticates bearer tokens with Supabase Auth, reads releases and signs files with the caller's permissions, then records trusted metadata with a service-only recorder. Anonymous public downloads create no personal history. The endpoint never accepts a user ID, file path or version as authoritative input. Repeated same-release/user/day starts are deduplicated. Direct client inserts and unsafe schema privileges were revoked.
- Private beta/alpha release rows and files require access; public mod descriptions stay discoverable. Raw grants are own/admin only. Public badges use the visibility-filtered RPC. No owner/staff-role rows were changed.

## Applied migrations and server deployment

All three migrations below were applied to project `wycdpuzlbivtfxwtarzn` and are included in source:

1. `20261117220118_profile_badge_showcase_achievements_library.sql`
2. `20261117220359_profile_feature_private_wrapper_permissions.sql`
3. `20261117220939_profile_achievement_trigger_record_types.sql`

The two corrective migrations address invoker-wrapper schema permissions and trigger row-type evaluation found during transactional testing. Private schema usage is granted only after removing inherited PUBLIC execution from internal trigger/maintenance functions; intended role predicates retain authenticated execution.

Edge Function source: `supabase/functions/mod-download/`. Gateway JWT verification is disabled because this endpoint supports anonymous public releases and validates any supplied bearer token itself; invalid tokens never fall back to anonymous access. Service credentials are read only from server environment variables. CORS allows the website origin. Daily achievement checks run through the existing pg_cron extension at 03:00 UTC; users and administrators can also request self-scoped/admin-scoped rechecks.

## Validation

- Transactional SQL tests: own-only settings/history/grants, max-three unique earned favourites, hidden favourites and role deduplication, rejected forged downloads/grants, post/download/confirmed-bug awards, real Auth registration age versus spoofed profile timestamps, repeat-download deduplication, permanent revocation/manual regrant, beta metadata isolation and private library aggregation. All test changes rolled back; zero QA catalogue entries remain.
- 12 focused Node tests: signed-download client requests, invalid/anonymous authentication, permission failures, trusted identity/file metadata, no browser-side history writes, no blank tabs, numerical/prerelease semantic-version comparison and unknown-version handling.
- Browser coverage at 390/800/1440px: favourite selection, three-item cap, reordering, hidden badges, saved preferences, preserved unknown visibility preferences, progress, public role deduplication, library, sign-out cleanup, admin criterion editing and English/German switching. Dark/light screenshots inspected.
- Existing profile workspace regression flow: bio/Spotify/visibility saves, section switching/reload, appearance, post deletion, guest state and mobile/desktop layout.
- Browser attachment downloads at mobile/desktop widths still download successfully without a blank tab or page navigation.
- Live Edge endpoint rejects anonymous private beta requests (404) and invalid bearer tokens (401).
- Security advisors contain the pre-existing public SECURITY DEFINER/auth-password advisories; no new public SECURITY DEFINER wrappers were introduced.

## Limits

Historical client-generated download rows remain unverified and do not unlock new download achievements. Existing badge grants are preserved instead of silently revoked. A verified event attests an authorised download start/issued URL, not completed transfer or installation. There is no client installation detector. A signed-in production download smoke test requires the actual user's Discord session; server behaviour is covered by unit/RLS tests and anonymous/invalid-token live checks.

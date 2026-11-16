# Mod catalogue, uploads and download activity

In **Admin → Mods**, Owner and Developer accounts can create a mod, upload up to
12 PNG/JPEG/WebP gallery images (5 MB each), and save its name, summary, description
and visibility. The permanent ID supports lowercase letters, numbers and hyphens.

Save the mod first, then add versions with a file, version number, Minecraft
version, loader, channel, environment and changelog. Files support JAR, ZIP, EXE,
MSI, DMG, AppImage, GZ and 7Z, up to 50 MB. Editing version metadata without
selecting a new file keeps the existing file. A replaced/deleted file and orphan
uploads after failed saves are cleaned up. Gallery removals apply on Save mod.

Both the mod and its version must be published to appear in **Downloads**.
The download browser shows descriptions, gallery images, version filters and
changelogs from the database alongside the existing static releases. Beta mods
require a beta grant for that mod ID; hidden mods and drafts stay private.
The old home-screen visibility editor is removed. Existing home-screen visibility rules remain stored.

Images use the public `mod-assets` bucket. Files use private `mod-files` storage
with RLS-protected, short-lived download URLs. Only Owner and Developer may write
the catalogue or upload files; Admin accounts retain user and activity access.

The Admin overview replaces duplicate navigation cards with recent registrations,
latest download starts and total/last-seven-days counters. Each user detail dialog
has a paginated download history. History is visible to the user through RLS and
to Owner/Admin; it is not added to public profiles. Download starts are recorded
for signed-in users from rollout onward. Anonymous downloads are not attributed,
old downloads cannot be reconstructed, and a start does not prove completion.
Client-generated activity is informational, not a tamper-proof billing record.

## Deployment and validation

The additive migration `20261116181816_admin_mod_catalogue_and_download_history`
has already been applied to project `wycdpuzlbivtfxwtarzn`, including buckets,
policies and dynamic beta invitation IDs. Do not reapply it to the same database.
The frontend becomes available when this source is merged and Pages deploys.
The migration's timestamp comes from the native Supabase migration history:
the CLI could not initialize its user settings directory in this sandbox.

Run `python3 scripts/build-pages.py --output /tmp/akame-pages`,
`npm test --prefix tests/support`, and
`PERF_SITE=/tmp/akame-pages node tests/header-layout/admin-catalogue.mjs`.
The browser test uses the installed Chromium and fixture API/storage responses;
it covers Owner/Developer uploads, version edits, upload cleanup, public download
rendering, activity/user history, access restrictions and mobile/desktop widths.
It does not upload real executables or use a real Discord OAuth session.
`tests/header-layout/mod-catalogue-rls.sql` tests real database policies inside a
rolled-back transaction; it retains no fixture users, roles, mods or events.

The baseline support suite currently has two unrelated failures: the AkameSMP
navigation test expects three links after a fourth was added, and one generated
route lacks the base element expected by the clean-URL test. Both reproduce on
the unchanged base commit. The four new catalogue tests pass.

Mods can be published before any file exists. Set their release status, optional
expected release date and note; the public listing shows the announcement while
the download action stays disabled until a published file version exists.

“Delete entire mod” unpublishes the mod, deletes every file/image in its storage
folders in batches, then removes the catalogue row and cascading versions. If
cleanup fails, the mod stays unpublished and deletion can be retried.

The default creation form now needs only a name. Its ID is generated automatically.
An optional first file and its version can be published with the same Save action.
Without a file, release announcements and dates are available. Further versions
and technical options are grouped into expandable sections.

Each mod now has a separate optional profile/cover image in `cover_path`. The
public mod card and heading use that image; gallery screenshots remain separate.
Admin → Mods has explicit Profile image and Gallery images sections. Both show
local previews before saving. Selected gallery files can be removed individually
before upload, and removed/replaced saved assets are cleaned up after saving.
The cover column migration is already applied; existing gallery entries are
preserved and are not automatically reclassified as profile images.

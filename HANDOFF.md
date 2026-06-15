# CinePop — Handoff / Continue-Here Notes

_Last updated: 2026-06-15. Written so a fresh Claude (or you) can pick up exactly where we left off._

> 📌 **2026-06-15 update:** Pushed this trivial commit to try to trigger a fresh Vercel deployment for `master` (latest commit `03302c8`), since auto-deploy appeared stalled (root cause #2 below). If `cinepop.live/u/...` is still 404 after this, the GitHub↔Vercel auto-deploy connection likely needs reconnecting in Vercel → Settings → Git.

## What CinePop is
A movie/TV watchlist app for couples/friends/family ("circles").
- **Stack:** Next.js 14 + TypeScript + Tailwind + Supabase + OMDB + TMDB, deployed on **Vercel**.
- **Live site:** cinepop.live
- **GitHub:** github.com/kristeldelmundo/CinePop — default branch is **`master`** (not `main`).
- **Local copy:** `C:\Users\Kristel Delmundo\Documents\GitHub\CinePop`
- **Dev workflow:** I use **GitHub Desktop (GUI)** + VS Code. I'm newer to dev — give git steps as GitHub Desktop UI actions (Fetch origin → Pull), and explain clearly.

## How to set up a fresh Claude to help
Connect these in **Settings → Connectors** (same accounts as before):
1. **GitHub** (the `kristeldelmundo` account) — lets Claude read/edit the repo.
2. **Supabase** (the CinePop project) — database access.
3. **Gmail** — optional, only used occasionally.
4. **Claude for Chrome** extension — for viewing the live site (note: this was flaky last session).

Nothing else needs "transferring" — the code is in GitHub, the data is in Supabase, the site is on Vercel. Claude stores none of it.

## IMPORTANT environment note for whoever continues
- Files are edited by pushing full file content via the GitHub connector (the local disk copy isn't in Claude's container). Always fetch the current file's SHA before updating.
- Vercel builds with **`npm ci`**, which is strict: **any dependency added to `package.json` MUST also be in `package-lock.json`**, or the production build fails silently and the live site keeps serving the old build. (This exact mistake caused the bug below.)

---

## 🔴 UNFINISHED — the thing to fix first

### Feature that was built (PR #53, merged to master)
"Shareable public profiles + visit circle members' profiles":
- Public profile route at **`/u/[id]`** (e.g. `cinepop.live/u/8aa3c9dc-2270-441f-833b-dbcdd152bbed`), readable by anyone (logged out too).
- **Share** button on `/profile` → modal with **Copy link** (the download-image option was removed, see below).
- Circle member pills link to `/u/[id]`, plus a dedicated `/circles/members` screen.
- DB migration `allow_public_read_profiles_for_share_links` (anon SELECT on profiles) — already applied.

### The bug
After merging, `cinepop.live/u/...` returns a **404** and the **Share button doesn't appear**.

**Root cause #1 (fixed in code):** The Share feature added the `html-to-image` dependency to `package.json` but it never got into `package-lock.json`. Vercel's `npm ci` build failed because of the mismatch, so production stayed on the old build. 
→ Already fixed: commits `3e2e07c` (removed dep from package.json) and `03302c8` (removed the `html-to-image` import from `components/profile/ShareProfileModal.tsx`, keeping Copy-link only). Both are on `master`.

**Root cause #2 (NOT yet resolved — DO THIS):** As of the last Vercel Deployments screenshot, the **newest production deployment was ~1h old** and there were **no deployment rows for commits `3e2e07c` or `03302c8`** — i.e. those fixed commits **never built/deployed**. New pushes to `master` did not trigger fresh Vercel deployments.

### Next steps to finish (in Vercel — Claude can't click these without the Chrome extension connected)
1. In **Vercel → CinePop → Deployments**, trigger a fresh build of the latest `master` (commit `03302c8` "fix: remove html-to-image import…"):
   - Use the **⋯ menu → Redeploy** on the top deployment, with **"Use existing Build Cache" UNCHECKED**, OR push any trivial new commit to `master` to trigger a build.
2. Check **Settings → Git**: confirm the **GitHub connection is still active** (auto-deploy appears to have stopped — this is the likely reason the fix commits didn't build). Reconnect if needed.
3. Once the new deployment shows **Ready + Production**, verify:
   - `cinepop.live/u/8aa3c9dc-2270-441f-833b-dbcdd152bbed` loads the profile card (not 404).
   - `cinepop.live/profile` shows a **Share** button next to Edit.
4. If the build shows **Error**, read the build log and fix what it reports.

### Deferred (do later, the right way)
- Re-add the **downloadable profile-card image**. It needs `html-to-image` (or similar) added with the **lockfile updated in the same commit** so `npm ci` doesn't break. Note: cross-origin TMDB/OMDB poster images may render blank in the snapshot — needs a proxy or `crossorigin` attribute.
- BF's idea: prettier share URLs like **`/@username`**. This is a real improvement but requires adding a unique `username` column to `profiles` and a chooser UI. `/@<uuid>` would be ugly, so do it with real usernames or keep `/u/[id]`.

---

## Key accounts / IDs
- **Main profile (Kristel):** id `8aa3c9dc-2270-441f-833b-dbcdd152bbed`, email kmdm03@gmail.com. Public link: `cinepop.live/u/8aa3c9dc-2270-441f-833b-dbcdd152bbed`
- **Circle:** "Movie Love" id `94334618-2869-4b7a-a7db-2859e705b6f6`.
- **Test accounts to delete later:** kristelmdelmundo@gmail.com ("John"), and the two Eric test profiles.
- **Supabase project URL:** https://lscjqfqpnquielxncybb.supabase.co

## Key files
- `app/u/[id]/page.tsx` — public profile route
- `app/profile/page.tsx` — own profile (view/edit + Share button)
- `app/circles/page.tsx` — circles (member pills link to /u/[id])
- `app/circles/members/page.tsx` — dedicated members screen
- `components/profile/ProfileCard.tsx` — reusable read-only card
- `components/profile/ShareProfileModal.tsx` — share modal (copy-link only right now)
- `lib/profile.ts` — genres, viewer-type, `loadProfileStats(userId)`
- `lib/theme.ts` — accents, fonts, backgrounds, custom picks helpers
- `lib/circles.ts` — circle helpers

## Note for the move
This is currently being worked on inside a **company** Claude workspace. If CinePop is a personal project, continue it in your **personal** Claude and confirm the GitHub/Supabase/Vercel accounts are your personal logins (they appear to be under `kristeldelmundo`).

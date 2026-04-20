# Deploying the app — Vercel

Alternative to Cloudflare Pages. Equally viable; pick whichever account
you already have. Vercel's Git integration is particularly good if you
want zero-config preview URLs for every pull request.

## Option A — Vercel Git integration (zero CI)

1. Install the [Vercel GitHub app](https://vercel.com/new) and import this
   repository.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Install command: `npm ci`.
6. Node.js version: **20.x**.

Vercel will auto-build on every push and create a preview URL per branch
and per PR. No GitHub Actions workflow is required for this path.

## Option B — `vercel` CLI (manual or custom CI)

```bash
npm i -g vercel
vercel login
npm run build
vercel --prod                          # or `vercel` for a preview deploy
```

For CI-driven deploys, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID` as GitHub Actions secrets and call `vercel deploy
--prebuilt --token=$VERCEL_TOKEN` after `vercel build`.

This repo does **not** ship a Vercel CI workflow by default — the
Cloudflare workflow is the canonical one. If you need a Vercel workflow
instead, the shape to copy is the one documented at
<https://vercel.com/docs/deployments/git/vercel-for-github>.

## `vercel.json`

Optional, because the Vercel dashboard already knows how to build a Vite
project. If you want to pin the settings in the repo:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite"
}
```

Keep this file at the repo root only if you actually deploy to Vercel;
committing it when CF Pages is the live host would be dead config.

## Gotchas

- **Base path.** Vercel serves at the project root, so keep
  `VITE_BASE=/`. Only override if you later mirror the app onto GitHub
  Pages.
- **Node version.** Pin to 20 in the dashboard or in `vercel.json` via
  `"engines": { "node": "20.x" }` in `package.json`. The build step must
  match what the workflow and the dev machine use.
- **SPA routing.** This prototype is a single `index.html`; no SPA
  rewrite rule is needed. If a future round adds client-side routes,
  add `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }` to
  `vercel.json`.

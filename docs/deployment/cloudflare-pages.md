# Deploying the app — Cloudflare Pages

Preferred host for the app. Free tier is generous; builds are fast; no
subpath gymnastics (the app is served at the project root, so
`VITE_BASE=/`).

## One-time setup

1. Create a Cloudflare account and add your workspace's Cloudflare API
   token to the GitHub repo under
   **Settings → Secrets and variables → Actions**:

   | Secret name             | Value                                              |
   |-------------------------|----------------------------------------------------|
   | `CLOUDFLARE_API_TOKEN`  | Scope: **Pages: Edit** for your account.           |
   | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (32-char hex).          |

2. In the Cloudflare dashboard, **create a Pages project** named
   `geometry-of-music` (or change `CF_PROJECT_NAME` in the workflow to
   match whatever name you picked). You can skip the "Connect to Git"
   step — this repo deploys via direct Wrangler upload, not the Pages
   Git integration. That way the deploy is triggered by CI, and CI owns
   the build output.

## Automatic deploys (recommended)

Every push to `main` that touches app code runs
[.github/workflows/deploy-app.yml](https://github.com/Trance-0/GeometryOfMusic/blob/main/.github/workflows/deploy-app.yml):

1. Install dependencies.
2. `npm run typecheck`.
3. `npm run build` with `VITE_BASE=/` (Cloudflare Pages serves at root).
4. `wrangler pages deploy dist/ --project-name=geometry-of-music`.

The action uses Cloudflare's official
[`cloudflare/wrangler-action@v3`](https://github.com/cloudflare/wrangler-action).

## Manual deploy

From your machine:

```bash
npm ci
npm run typecheck
npm run build                          # produces dist/
npx wrangler pages deploy dist \
  --project-name=geometry-of-music
```

Wrangler will open a browser to authenticate on the first run. Subsequent
deploys reuse the cached credentials under `~/.wrangler/config/`.

## Preview deploys

Cloudflare Pages creates a unique preview URL for every deploy that is
not pushed to the project's production branch. The workflow tags the
deploy with the current branch name; Wrangler uses that as the preview
environment. Pull-request flows therefore get a per-branch preview for
free.

## Gotchas

- **API token scope.** `Pages: Edit` is the minimum. A wider token still
  works but is unnecessary.
- **Project name mismatch.** If you rename the Pages project, update the
  `CF_PROJECT_NAME` env entry in the workflow and the `deploy:cf` npm
  script in `package.json` in the same commit.
- **Node version.** The workflow pins Node 20. Cloudflare Pages itself
  does not build anything — only serves `dist/` — so Node is only
  relevant during CI.
- **Vite `base`.** For CF Pages, leave `VITE_BASE=/` (the default). Only
  override it if you simultaneously mirror the app onto GitHub Pages,
  which would need `VITE_BASE=/GeometryOfMusic/`.

## Verifying the deploy

After a deploy, the workflow prints a URL like
`https://<deploy-hash>.geometry-of-music.pages.dev` and, for pushes to
`main`, attaches the production alias. Click the production alias and
verify:

1. The torus renders.
2. The preset C–E / F–A / G–B / C–E progression plays when you press
   **Play** (headphones in, autoplay is gated by a user gesture).
3. The legend appears in the upper-right of the 3D view.

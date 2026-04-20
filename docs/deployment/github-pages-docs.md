# Deploying the docs site — GitHub Pages

The **docs site** (this site you are reading) is published to GitHub
Pages. The **app itself** is published separately on Cloudflare Pages or
Vercel — see [cloudflare-pages.md](cloudflare-pages.md) and
[vercel.md](vercel.md).

## Why GitHub Pages for docs

- Native to the repo (no third-party account required for maintainers).
- Free, cached worldwide, simple static hosting.
- Plays well with mkdocs-material, which already has a GitHub-native
  Pages deploy path.

## Published URL

`https://trance-0.github.io/GeometryOfMusic/`

The docs live under `/GeometryOfMusic/` because this is a **project
site**, not a user site. Links inside the docs are written as
markdown-relative links so mkdocs rewrites them with the correct
prefix — don't hard-code `/GeometryOfMusic/...` in markdown.

## One-time setup

1. In the GitHub repo, open **Settings → Pages → Build and deployment**
   and select **GitHub Actions** as the source.
2. No secrets are required — the workflow uses the repo's built-in
   `GITHUB_TOKEN`.

## Workflow

[.github/workflows/deploy-docs.yml](https://github.com/Trance-0/GeometryOfMusic/blob/main/.github/workflows/deploy-docs.yml)
runs on:

- every push to `main` that touches `docs/**`, `mkdocs.yml`, or the
  workflow itself;
- manual dispatch from the **Actions** tab.

Steps:

1. Check out the repo (no submodule fetch needed for docs build — the
   `AGENTS.md` submodule is only referenced, not built).
2. Install Python and `mkdocs-material`.
3. `mkdocs build --strict --site-dir _site`.
4. Upload `_site/` as a Pages artifact.
5. A separate `deploy` job calls `actions/deploy-pages@v4` to publish
   the artifact.

The `--strict` flag turns unresolved internal links and missing pages
into errors. If the docs build fails in CI, run
`npm run docs:build` locally and read the first error — it usually
points at a broken relative link.

## Manual local build

```bash
pip install mkdocs-material
npm run docs:serve            # live reload on http://127.0.0.1:8000
npm run docs:build            # strict build into site/
```

`site/` is git-ignored.

## Gotchas

- **Base URL.** `mkdocs.yml` sets `site_url` to
  `https://trance-0.github.io/GeometryOfMusic/`. If you fork the repo to
  a different owner or rename it, update `site_url` **and** the link
  shown above in the same commit. Mismatched base URLs are the most
  common Pages failure in this template.
- **Docs-only changes don't rebuild the app.** The docs workflow uses
  a `paths:` filter so editing `docs/usage.md` does not trigger a
  Cloudflare Pages rebuild of the app, and vice versa.
- **Concurrency.** Both workflows declare `concurrency: { group: pages,
  cancel-in-progress: false }` so two docs deploys don't clobber each
  other. The app workflow does *not* use the `pages` group because it
  doesn't touch Pages.
- **Images / static assets.** Put them in `docs/assets/` and reference
  with `![alt](assets/foo.png)`. mkdocs-material picks them up
  automatically.

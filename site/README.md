# ostack website

A static page for browsing and installing the skills. `index.html` and `app.js` provide the content and interactions.
`styles.css` imports `tokens.css` and `base.css`; `fonts/` contains locally served
fonts and their open-source licenses. The catalog stays readable without JavaScript;
JavaScript adds search, category filters, illustrative previews, and an install
picker with harness, method, and scope buttons plus command copying.
Skill previews describe workflows; they do not execute agents or commands.

## Local preview

From the repository root:

```sh
python3 -m http.server 8080 --directory site
```

Open http://localhost:8080. Clipboard access requires localhost or HTTPS.

## Cloudflare Pages

Import this repository into **Workers & Pages → Create application → Pages**.
Use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Root directory | Leave blank (repository root) |
| Build command | `exit 0` |
| Build output directory | `site` |

No environment variables or package installation are needed. Alternatively,
upload the contents of `site/` through Pages Direct Upload. Do not upload the
whole repository. `site/_headers` applies security headers on Pages.

See [Cloudflare’s static HTML guide](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/).

## Check the site

From the repository root, run `python3 -B -m unittest discover -s tests` for
catalog and local-link checks, and `node --check site/app.js` for JavaScript syntax.

## Update the catalog

Edit the skill cards in `index.html`; the skill key, category, command, and preview steps
live on each card as data attributes. Keep the visible skill count and the
README collection in sync when adding or removing a skill. All skill links
point to their source files in the repository.

## Update installation options

Harness IDs and personal/project paths live on the `data-agent`, `data-global`,
and `data-project` attributes in `index.html`. `app.js` generates commands for the
selected method and scope. Keep the root README installation table and examples
in sync when changing these options. Without JavaScript, the default Claude Code
CLI command and a link to the complete installation guide remain available.

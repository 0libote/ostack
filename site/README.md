# ostack website

A static page for browsing and installing the skills. `index.html` and `app.js` provide the content and interactions.
`styles.css` imports `tokens.css` and `base.css`; `fonts/` contains locally served
fonts and their open-source licenses. The catalog stays readable without JavaScript;
JavaScript adds search, category filters, illustrative previews, and an install
picker with harness, method, and scope buttons plus command copying.
Skill previews describe workflows; they do not execute agents or commands.

## Development

Install [Bun](https://bun.sh/docs/installation), using the version in
[`.bun-version`](../.bun-version) (currently 1.4.4). From the repository root:

```sh
bun install
bun run dev
```

Open the local URL Bun prints (normally http://localhost:3000). Its HTML dev server
bundles the referenced JavaScript, CSS, logos, and fonts and reloads edits.
Clipboard access requires localhost or HTTPS. There are currently no package
dependencies; Bun creates a lockfile when dependencies are added.

The source remains HTML, CSS, and JavaScript. Bun can bundle TypeScript and package
imports when new features need them. Add runtime packages with `bun add` and
development tools with `bun add --dev` from the root.

## Production build

```sh
bun run build
```

This cleans and generates `dist/`, bundling and minifying scripts and styles and
rewriting asset URLs. The build also copies Cloudflare security headers and the
asset licenses. Fonts are embedded in the bundled CSS; the `font-src` directive
permits those font data URLs while scripts and styles remain restricted to the
same origin. The output is static: deployment does not need a running Bun server.

## Cloudflare Pages

Import this repository into **Workers & Pages → Create application → Pages**.
Use these build settings, replacing the previous `exit 0` / `site` configuration:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Root directory | Leave blank (repository root) |
| Build command | `bun run build` |
| Build output directory | `dist` |
| Environment variable | `BUN_VERSION=1.4.4` |

For Direct Upload, build locally first and upload the contents of `dist/`.
Do not upload the repository or the source `site/` directory.

See [Cloudflare’s build image guide](https://developers.cloudflare.com/pages/configuration/build-image/)
and [Bun’s HTML bundler documentation](https://bun.sh/docs/bundler/html-static).

## Check the site

```sh
bun test
```

Bun's test runner checks catalog coverage, local links, unique IDs, and agreement
between the README and install picker. The build test also generates `dist/` and
checks its linked assets, font policy, security headers, and license files.
The website CI runs these same checks on pushes and pull requests.

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

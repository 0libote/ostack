# ostack website

A static catalog and individual pages for browsing and installing the skills.
`index.html` is the homepage, `skills/index.html` holds the catalog content,
`catalog.js` handles search and filters, and `install.js` provides the shared install picker.
`styles.css` imports `tokens.css` and `base.css`; `fonts/` contains locally served
fonts and their open-source licenses. The catalog stays readable without JavaScript;
JavaScript adds search, category filters, a moving skill-name banner, and an install
picker with harness, method, and scope buttons plus command copying.
The skill-name banner moves continuously and links to the individual pages.
It pauses on hover or keyboard focus and has a pause/play control. Reduced motion
and no-JavaScript mode show a static, wrapping list of all skill names.

## Development

Install [Bun](https://bun.sh/docs/installation), using the version in
[`.bun-version`](../.bun-version) (currently 1.4.4). From the repository root:

```sh
bun install
bun run dev
```

Open the local URL Bun prints (normally http://localhost:3000). The dev script
generates the skill pages and serves them through Bun with hot reload. Routes
include `/`, `/skills/`, and `/skills/<skill-name>/`; catalog and detail routes also work without the
trailing slash. Bun bundles the referenced JavaScript, CSS, logos, and fonts.
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
between the README and install picker. It verifies every skill page, its source
instructions, internal links, and dependency-aware installation. The build test also generates `dist/` and
checks its linked assets, font policy, security headers, and license files.
The website CI runs these same checks on pushes and pull requests.

## Update the catalog

Edit the skill cards in `skills/index.html`; the skill key, category, command, and workflow steps
live on each card as data attributes. Keep the visible skill count and the
README collection in sync when adding or removing a skill. Catalog links open the individual skill pages, which also link to their source files.

## Update installation options

Harness IDs and personal/project paths live on the `data-agent`, `data-global`,
and `data-project` attributes in `index.html`. `install.js` generates commands for the
selected method and scope. Skill pages use the same picker, restricted to that
skill and its transitive dependencies. Keep the root README installation table and examples
in sync when changing these options. Without JavaScript, the default Claude Code
CLI command and a link to the complete installation guide remain available.

## Skill pages

Catalog titles link to `/skills/<name>/`. `scripts/generate-pages.js` creates all
14 detail pages in ignored `site/skills/<name>/` folders whenever development or a production
build starts. The catalog at `site/skills/index.html` is source; do not edit the generated detail HTML.

Edit card descriptions, commands, and workflow steps in `site/skills/index.html`. The
page layout, dependency map, and skill-specific notes live in the generator.
Full instructions come directly from each `skills/<name>/SKILL.md` and are shown
as escaped text inside a native disclosure. This preserves code examples without
executing HTML or scripts from skill documents. Restart `bun run dev` after
changing catalog metadata, skill instructions, or the generator to regenerate pages.

Production output contains `dist/index.html`, `dist/skills/index.html`, and `dist/skills/<name>/index.html`.
The site stays readable without JavaScript, including each page's default install
command and expandable source. The existing Cloudflare `dist` setting serves all
pages; no application server or deployment setting change is needed.

## Moving skill-name banner

`skill-banner.js` animates the homepage’s fallback list of skill names and links.
A second copy produces the seamless CSS transform loop; its links work with a
pointer but are excluded from keyboard navigation and assistive technology.
Keyboard focus pauses movement and brings the selected original link into view.

Animation pauses when offscreen or in a background tab. The explicit Pause/Play
control preserves the current position. With reduced motion or JavaScript off,
all names form a static, wrapping list. Keep the fallback list in `index.html`
aligned with the catalog; the site test checks this. Change `--banner-duration`
in `tokens.css` to adjust the pace.

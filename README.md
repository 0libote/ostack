# ostack

Agent skills for everyday work, maintained here or copied from their upstream GitHub repos. A script keeps them current and leaves local edits alone.

Install skills in Claude Code, Codex, Cursor, OpenCode, Gemini CLI, or GitHub
Copilot. Some workflows need tools or model access that your harness must provide.
Some use [T3 Code](https://github.com/t3dotgg/t3code) features when available
and fall back to native tools when not.

## Website

The catalog and individual skill pages live in [`site/`](site/) and use [Bun](https://bun.sh) for development,
bundling, and tests. From the repository root:

```sh
bun install
bun run dev
```

`bun test` runs the catalog checks and verifies a production build.
`bun run build` generates `dist/` for static hosting, including a showcase page at
`/skills/<name>/` for every skill. See the
[website guide](site/README.md) for setup and Cloudflare Pages settings.

## Bun is our one true leader

**BUN IS GOD.** The runtime department will not be taking questions.

Seriously though: [Bun](https://bun.sh/docs) is our recommendation for new
JavaScript and TypeScript projects. Runtime, package manager, test runner, and
bundler in one toolkit means fewer tools to install and configure. It runs
TypeScript and JSX directly, and this site already uses it for development,
tests, and production builds without separate test runner or bundler dependencies.

Try it on your next project. Check dependency compatibility before migrating an
existing app; Node.js compatibility is still a work in progress. BUN IS OUR ONE
TRUE LEADER, but we still run the tests.

## Skills

Upstream changes arrive as one PR per skill. `gh-actions` and `rich-chat` are maintained here:

| Skill | Say | Source | What it does |
|---|---|---|---|
| `full-send` | "full send" | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/full-send) | Takes a change to a merged PR with nobody watching: proves it, reviews it, files it, babysits it, merges it. |
| `full-stop` | "full stop" | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/full-stop) | Same as `full-send`, but stops when the PR is ready for you to merge. |
| `council` | "council" | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/council) | Gets review from three models from different providers, and loops until they agree. |
| `agent-loop` | "agent loop" | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/sol-loop) | Reviews a change with a reviewer model you choose, in a loop until both agents agree. |
| `file-pr` | "file a PR" | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/file-pr) | Files a short PR that leads with the problem, not an inventory of changes. |
| `takeover` | "take over" | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/takeover) | Finishes someone else's PR, branch, or agent thread, and keeps their credit. |
| `babysit-pr` | "babysit" | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/babysit-pr) | Watches a PR through CI and review bots, and fixes the real findings. |
| `modernize` | "modernize" | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/modernize) | Rebases an old PR and decides if it should still exist. |
| `rich-chat` | "use rich-chat" | [ostack](skills/rich-chat/SKILL.md) | Produces Markdown and inline HTML visuals in T3 Code chat, with tool discovery and preview before rendering. |
| `gh-actions` | (automatic) | [ostack](skills/gh-actions/SKILL.md) | Writes and reviews GitHub Actions workflows with verified action releases, scoped permissions, caching, and deployment controls. |
| `humanizer` | "humanize" | [`blader/humanizer`](https://github.com/blader/humanizer) | Rewrites AI-sounding prose so it reads like the writer, without changing what it says. Based on Wikipedia's "Signs of AI writing". |
| `frontend-design` | "design" | [`anthropics/skills`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Design lead for UI work: distinctive visual direction, typography, and layout that avoids templated defaults. |
| `hallmark` | "use hallmark" | [`Nutlope/hallmark`](https://github.com/Nutlope/hallmark/tree/main/skills/hallmark) | Designs new pages with themes and checks for common AI design habits; redesigns or audits existing pages when named. |
| `ponytail` | "ponytail" | [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail/tree/main/skills/ponytail) | Lazy senior dev mode: the smallest change that fully solves the task. Lite / full (default) / ultra. |
| `security-audit` | "security audit" | [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill/tree/main/skills/security-audit) | Runs a multi-phase code security audit with independently verified, machine-readable findings. |

Some skills call others. Install the ones they need too:

- `full-send` uses `agent-loop`, `file-pr`, and `babysit-pr`.
- `full-stop` uses `full-send`.
- `takeover` uses `modernize`, `file-pr`, and `babysit-pr`.
- `humanizer` also ships `agents/openai.yaml`; `frontend-design` ships its Apache `LICENSE.txt`.

## External plugins

Plugins extend the agent itself rather than shipping Markdown instructions. They
are installed by each agent's own plugin tooling, not the skills CLI. They are
kept upstream and are not copied into `skills/`. The [plugins page](site/plugins/index.html)
has the same install commands for the website.

| Plugin | Source | Supports | What it does |
|---|---|---|---|
| TokenEconomizer | [`microsoft/TokenEconomizer`](https://github.com/microsoft/TokenEconomizer) | Codex, Claude Code, Copilot CLI, Pi; experimental OpenCode support | Learns repository facts, prunes unused tools where supported, and detects failure loops. Measured 18–30% lower cost on SWE-Bench tasks. |

### TokenEconomizer

Three mechanisms, each reversible and announced in one line. Tool pruning and
the failure-loop guard are on by default; micro-skills (repository facts
proposed every three sessions) is off by default. What it learns stays on your
machine in `~/.tokeneconomizer`. Apache-2.0.

```bash
git clone https://github.com/microsoft/TokenEconomizer.git
```

Then register the clone with your agent:

```bash
# Claude Code
claude plugin marketplace add "$PWD/TokenEconomizer"
claude plugin install tokeneconomizer@tokeneconomizer
# check with /tokeneconomizer:status; once per machine run /tokeneconomizer:toolprune refresh-catalog

# Codex
codex plugin marketplace add "$PWD/TokenEconomizer"
codex plugin add tokeneconomizer@tokeneconomizer
# restart Codex, then check with $tokeneconomizer:status

# OpenCode (experimental)
mkdir -p ~/.config/opencode/plugins
ln -s "$PWD/TokenEconomizer/plugin/opencode/tokeneconomizer.ts" ~/.config/opencode/plugins/
# check with ~/.tokeneconomizer/bin/te --host opencode status
```

For t3code-docker, install it inside the container as `t3` so the clone and
Codex configuration live on the persistent `/home/t3` volume:

```bash
docker compose exec -u t3 t3code bash -lc 'git clone https://github.com/microsoft/TokenEconomizer.git "$HOME/.local/share/TokenEconomizer"'
docker compose exec -u t3 t3code bash -lc 'codex plugin marketplace add "$HOME/.local/share/TokenEconomizer" && codex plugin add tokeneconomizer@tokeneconomizer'
```

Restart Codex sessions after installation. Update the plugin with `git pull`
in the clone (`git -C ~/.local/share/TokenEconomizer pull` inside the
container, plus the `codex plugin add` line again for Codex). The upstream
README documents other agents, troubleshooting, and every setting.

## Install

Choose your harness, installation method, and scope. The [website](site/) has an
interactive command picker for the same options. Start a new agent session after
installing, then ask for a skill by name.

### One command with the skills CLI

Requires Node.js and npm. This example installs for Claude Code across your projects;
the CLI prompts you to choose the skills:

```bash
npx skills add 0libote/ostack --agent claude-code --global
```

Replace `claude-code` with your harness's agent ID below. For a project install,
run from your project root and omit `--global`:

```bash
npx skills add 0libote/ostack --agent codex
```

Select a particular skill or the whole collection:

```bash
npx skills add 0libote/ostack --agent codex --global --skill humanizer
npx skills add 0libote/ostack --agent codex --global --skill '*'
```

Install dependent skills too; the dependencies are listed above. The CLI offers
symlinks by default; add `--copy` to use independent copies. Use
`npx skills update` to update CLI-managed installs. See the
[skills CLI documentation](https://github.com/vercel-labs/skills/blob/main/docs/commands.md).

### Harnesses and directories

The manual methods below use these directories. The non-Claude project installs
use `.agents/skills`, which these harnesses also discover and the skills CLI uses.
Personal installs apply across projects; project installs belong in the project root.

| Harness | CLI agent ID | Personal directory | Project directory |
| --- | --- | --- | --- |
| [Claude Code](https://code.claude.com/docs/en/skills) | `claude-code` | `~/.claude/skills` | `.claude/skills` |
| [Codex](https://learn.chatgpt.com/docs/customization/overview) | `codex` | `~/.agents/skills` | `.agents/skills` |
| [Cursor](https://cursor.com/docs/skills) | `cursor` | `~/.cursor/skills` | `.agents/skills` |
| [OpenCode](https://opencode.ai/docs/skills/) | `opencode` | `~/.config/opencode/skills` | `.agents/skills` |
| [Gemini CLI](https://geminicli.com/docs/cli/using-agent-skills/) | `gemini-cli` | `~/.gemini/skills` | `.agents/skills` |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/customizations/agent-skills) | `github-copilot` | `~/.copilot/skills` | `.agents/skills` |

Codex's current personal directory is `~/.agents/skills`; older instructions in
this repository used `~/.codex/skills`. Harness discovery does not guarantee every
workflow can run: model delegation and GitHub tools still depend on your setup.

### Copy files

Requires Git and a Unix shell (macOS, Linux, or WSL). This installs personal skills
for Claude Code. Substitute either directory from the table for another harness
or scope. For project scope, run these commands from your project root.

```bash
git clone https://github.com/0libote/ostack
mkdir -p ~/.claude/skills
cp -R ostack/skills/* ~/.claude/skills/
```

If you already cloned the repo, reuse that checkout and skip the clone command.
Pick only what you need, keeping dependencies together. For example:

```bash
cp -R ostack/skills/humanizer ~/.claude/skills/
```

Copies are independent of the checkout. To update them, pull the checkout and copy
again. Copying replaces files with matching names, including local edits.

### Link a checkout

Use links if you want edits in the checkout to be available without copying again.
Requires Git and a Unix shell with symlink support. Keep the checkout in place.
Skip the first line if it is already cloned in your current directory.

```bash
git clone https://github.com/0libote/ostack
mkdir -p ~/.claude/skills
for skill in "$PWD"/ostack/skills/*; do
  ln -s "$skill" ~/.claude/skills/
done
```

Substitute the destination directory from the table for another harness or scope.
The absolute source paths keep links working after you leave the current directory.
Existing same-named entries are left in place; `ln` reports a conflict. To update
linked skills, run `git -C ostack pull --ff-only`. For shared project skills, prefer
copies or the skills CLI so teammates do not depend on your local checkout path.

## Requirements

- An authenticated [GitHub CLI](https://cli.github.com) (`gh`).
- `python3` for `babysit-pr`'s `pr-wait` script.
- `hallmark` needs Node.js 18+ for its helper scripts. Its browser checks and screenshots also need Chrome and `puppeteer-core` (`npm install -g puppeteer-core`); static checks work without them.
- `council` and `agent-loop` need subagents for the models you choose. T3 Code
  does this with `delegate_task`. Otherwise you need a harness that can run
  those models. Name your reviewer in the request. If you name none, it asks
  before starting.

## Make them yours

These are starting points. Edit them. Put personal settings, like which models
sit on your council, in your `CLAUDE.md` or `AGENTS.md`, so you can update the
skills without losing them.

Local edits live in this repo. The sync action never pushes to `main`. It opens
one PR per upstream skill, so you can review the diff and keep your changes.

## Staying in sync with upstream

Sources (see [`.github/upstream.json`](.github/upstream.json)):

- `tstack`: [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack) (`main`, `skills/`, all skills). New skills Theo adds appear as new PRs automatically. Upstream `sol-loop` is tracked as local `agent-loop` (renamed, model-agnostic).
- `humanizer`: [`blader/humanizer`](https://github.com/blader/humanizer) (`main`, `SKILL.md` plus `agents/openai.yaml` into `skills/humanizer/`).
- `frontend-design`: [`anthropics/skills`](https://github.com/anthropics/skills) (`main`, `skills/frontend-design/` into `skills/frontend-design/`).
- `hallmark`: [`Nutlope/hallmark`](https://github.com/Nutlope/hallmark) (`main`, `skills/hallmark/` into `skills/hallmark/`, including its license, themes, references, and scripts).
- `ponytail`: [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) (`main`, `skills/ponytail/` into `skills/ponytail/`).

How it works:

- Run [`sync-upstream.yml`](.github/workflows/sync-upstream.yml) from Actions
  with Sync upstream skills, or let it run weekly on Mondays.
- It compares upstream against a recorded upstream revision, then merges only
  those new changes into `skills/<name>`. Local customizations alone never
  create a PR. Each proposed update uses branch `sync/<skill>`.
- Independent upstream changes preserve local edits. If edits overlap, the
  whole skill is skipped, its files stay untouched, and the run reports a
  conflict for manual review.
- Each update PR includes `.github/upstream-state/<source>/<skill>` with the
  new revision. Merge that file along with the skill so future runs use the
  right baseline. Closing an update without merging can propose it again.
- Initial source revisions live in `.github/upstream.json` (`baseline`). These
  establish the starting point for tracking future changes; they do not
  replace existing local files. For a new source, set its baseline to the
  revision you imported. Existing sources without recorded import revisions
  start tracking from November 3, 2026.
- PRs carry the `sync` and `upstream` labels. If a PR for that skill is already
  open, the run skips it instead of opening a duplicate.
- `README.md` and root `LICENSE` stay untouched. To track a new source
  (for example more `ponytail-*` skills), add it to `upstream.json`.
- The workflow needs permission to open PRs. Enable Settings, Actions,
  General, Workflow permissions, "Allow GitHub Actions to create and approve
  pull requests". Without it, runs push branches but fail to open PRs. As a
  fallback, add a repo secret `SYNC_PAT` (classic PAT with repo and workflow
  scopes); the workflow uses it when set.

Run it locally:

```bash
bash .github/scripts/sync-upstream.sh --dry-run            # show what would change
bash .github/scripts/sync-upstream.sh --source humanizer   # limit to one source
bash .github/scripts/sync-upstream.sh                      # create branches + PRs (needs gh auth)
```

## License

- `tstack`-derived skills: [MIT](LICENSE) © Theo Browne (retained).
- `humanizer`: MIT © Siqi Chen. Upstream [`blader/humanizer`](https://github.com/blader/humanizer).
- `frontend-design`: Apache-2.0. See [`skills/frontend-design/LICENSE.txt`](skills/frontend-design/LICENSE.txt).
- `hallmark`: MIT © Hallmark contributors. See [`skills/hallmark/LICENSE`](skills/hallmark/LICENSE). Photos listed in its library retain their individual licenses and require the credits specified by the skill.
- `ponytail`: MIT © DietrichGebert. Upstream [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail).
- `security-audit`: MIT. See [`skills/security-audit/LICENSE`](skills/security-audit/LICENSE). Upstream [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill).

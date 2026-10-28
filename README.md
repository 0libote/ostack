# ostack

Agent skills for everyday work, copied from their upstream GitHub repos. A script keeps them current and leaves local edits alone.

Skills run in Claude Code and Codex. Some use
[T3 Code](https://github.com/t3dotgg/t3code) features when available
and fall back to native tools when not.

## Website

A small, static skill showcase lives in [`site/`](site/). See the
[website guide](site/README.md) for local preview and Cloudflare Pages settings.
No build step or dependencies are required.

## Skills

Each upstream change arrives as one PR per skill:

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
| `leaving-pr-comments` | (automatic) | [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack/tree/main/skills/leaving-pr-comments) | Formats comments that an agent posts on your behalf. |
| `humanizer` | "humanize" | [`blader/humanizer`](https://github.com/blader/humanizer) | Rewrites AI-sounding prose so it reads like the writer, without changing what it says. Based on Wikipedia's "Signs of AI writing". |
| `frontend-design` | "design" | [`anthropics/skills`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Design lead for UI work: distinctive visual direction, typography, and layout that avoids templated defaults. |
| `ponytail` | "ponytail" | [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail/tree/main/skills/ponytail) | Lazy senior dev mode: the smallest change that fully solves the task. Lite / full (default) / ultra. |

Some skills call others. Install the ones they need too:

- `full-send` uses `agent-loop`, `file-pr`, and `babysit-pr`.
- `full-stop` uses `full-send`.
- `takeover` uses `modernize`, `file-pr`, `babysit-pr`, and `leaving-pr-comments`.
- `file-pr`, `babysit-pr`, and `modernize` use `leaving-pr-comments`.
- `humanizer` also ships `agents/openai.yaml`; `frontend-design` ships its Apache `LICENSE.txt`.

## Install

```bash
git clone https://github.com/0libote/ostack
cp -R ostack/skills/* ~/.claude/skills/   # Claude Code
cp -R ostack/skills/* ~/.codex/skills/    # Codex
```

Pick only what you need. For example `cp -R ostack/skills/full-send ostack/skills/babysit-pr ~/.claude/skills/`.

## Requirements

- An authenticated [GitHub CLI](https://cli.github.com) (`gh`).
- `python3` for `babysit-pr`'s `pr-wait` script.
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
- `ponytail`: [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) (`main`, `skills/ponytail/` into `skills/ponytail/`).

How it works:

- Run [`sync-upstream.yml`](.github/workflows/sync-upstream.yml) from Actions
  with Sync upstream skills, or let it run weekly on Mondays.
- It clones each source, diffs upstream skill(s) against `skills/<name>`, and
  for each new or changed skill opens one PR named
  `sync(<source>): <skill> from <repo>@<sha>` on branch `sync/<skill>`.
- The PR diff shows upstream against your current files, so you see what changed.
  Merge it as-is, or cherry-pick and resolve conflicts to keep local edits.
- PRs carry the `sync` and `upstream` labels. If a PR for that skill is already
  open, the run skips it instead of opening a duplicate.
- `README.md` and root `LICENSE` stay untouched. To track a new source
  (for example more `ponytail-*` skills), add it to `upstream.json`.

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
- `ponytail`: MIT © DietrichGebert. Upstream [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail).

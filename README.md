# ostack

Agent skills for everyday work, based on [tstack](https://github.com/t3dotgg/tstack)
by Theo Browne. This is **not a fork** — it's a synced copy with our own
additions on top.

Upstream skills work in Claude Code and Codex. Some use
[T3 Code](https://github.com/t3dotgg/t3code) features when they are available
and fall back to native tools when they are not.

This repo adds three local-only skills on top of upstream, and automation to
stay in sync without overwriting local edits.

## Skills

Upstream (synced from `t3dotgg/tstack`, one PR per skill when they change):

| Skill | Say | What it does |
|---|---|---|
| `full-send` | "full send" | Takes a change to a merged PR with nobody watching: proves it, reviews it, files it, babysits it, merges it. |
| `full-stop` | "full stop" | Same as `full-send`, but stops when the PR is ready for you to merge. |
| `council` | "council" | Gets review from three models from different providers, and loops until they agree. |
| `sol-loop` | "sol loop" | Reviews a change with GPT Sol in a loop until both agents agree. |
| `file-pr` | "file a PR" | Files a short PR that leads with the problem, not an inventory of changes. |
| `takeover` | "take over" | Finishes someone else's PR, branch, or agent thread, and keeps their credit. |
| `babysit-pr` | "babysit" | Watches a PR through CI and review bots, and fixes the real findings. |
| `modernize` | "modernize" | Rebases an old PR and decides if it should still exist. |
| `leaving-pr-comments` | (automatic) | Formats comments that an agent posts on your behalf. |

Local-only (never overwritten by sync):

| Skill | Say | What it does |
|---|---|---|
| `humanizer` | "humanize" | Rewrites AI-sounding prose so it reads like the writer, without changing what it says. Based on Wikipedia's "Signs of AI writing". |
| `frontend-design` | "design" | Design lead for UI work: distinctive visual direction, typography, and layout that avoids templated defaults. |
| `ponytail` | "ponytail" | Lazy senior dev mode: the smallest change that fully solves the task. Lite / full / ultra. |

Some skills call others. Install the ones they need too:

- `full-send` uses `sol-loop`, `file-pr`, and `babysit-pr`.
- `full-stop` uses `full-send`.
- `takeover` uses `modernize`, `file-pr`, `babysit-pr`, and `leaving-pr-comments`.
- `file-pr`, `babysit-pr`, and `modernize` use `leaving-pr-comments`.

## Install

```bash
git clone https://github.com/0libote/ostack
cp -R ostack/skills/* ~/.claude/skills/   # Claude Code
cp -R ostack/skills/* ~/.codex/skills/    # Codex
```

Pick only what you need — e.g. `cp -R ostack/skills/full-send ostack/skills/babysit-pr ~/.claude/skills/`.

## Requirements

- An authenticated [GitHub CLI](https://cli.github.com) (`gh`).
- `python3` for `babysit-pr`'s `pr-wait` script.
- `council` and `sol-loop` need subagents on other providers' models. T3 Code
  does this with `delegate_task`. Otherwise you need a harness that can run
  those models.

## Make them yours

These are starting points. Edit them. Put personal settings, like which models
sit on your council, in your `CLAUDE.md` or `AGENTS.md`, so you can update the
skills without losing them.

Local edits to upstream skills live in this repo. The sync action never pushes
directly to `main` — it opens one PR per upstream skill so you can review the
diff and keep your customizations (see below).

## Staying in sync with upstream

Upstream: [`t3dotgg/tstack`](https://github.com/t3dotgg/tstack) (`main` branch).
This repo contains a clean copy of its `skills/` directory plus our own
`humanizer`, `frontend-design`, and `ponytail` skills.

- [`sync-upstream.yml`](.github/workflows/sync-upstream.yml) can be run manually
  from Actions → "Sync upstream skills", and weekly on Mondays.
- It clones upstream, diffs `skills/<name>` against this repo, and for each
  **new or changed** upstream skill opens **one PR** named
  `sync(upstream): <skill> from t3dotgg/tstack@<sha>`.
- The PR diff is exactly upstream-vs-current, so you see what Theo changed.
  Merge it as-is, or cherry-pick / resolve conflicts to keep local edits.
- PRs are labeled `sync` + `upstream`. If a PR for that skill is already open,
  the run skips it instead of opening a duplicate.
- `README.md`, `LICENSE`, and the local-only skills
  (`humanizer`, `frontend-design`, `ponytail`) are never overwritten.

Config lives in [`.github/upstream.json`](.github/upstream.json).
The logic lives in [`.github/scripts/sync-upstream.sh`](.github/scripts/sync-upstream.sh)
— you can also run it locally:

```bash
bash .github/scripts/sync-upstream.sh --dry-run   # show what would change
bash .github/scripts/sync-upstream.sh             # create branches + PRs (needs gh auth)
```

## License

[MIT](LICENSE) — upstream copyright Theo Browne, retained here. Our additions
are under the same license.

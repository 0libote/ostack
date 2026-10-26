#!/usr/bin/env bash
# Sync skills from the upstream tstack repo, one PR per skill.
#
# Usage:
#   bash .github/scripts/sync-upstream.sh [--dry-run] [--upstream-repo owner/name] [--upstream-branch main]
#
# Behaviour:
# - Clones upstream (shallow) and diffs upstream skills/<name> against local skills/<name>.
# - For each new or changed skill: creates branch sync/upstream-<skill>, copies
#   the upstream skill directory in, commits, pushes, and opens a PR.
# - Skips skills that are unchanged, local-only (see .github/upstream.json),
#   or already have an open PR on the same branch.
# - Never touches README.md, LICENSE, or local-only skills.
# - The PR diff is upstream-vs-current main, so reviewers see exactly what
#   changed upstream and can preserve local edits via normal merge resolution.
set -euo pipefail

DRY_RUN=0
UPSTREAM_REPO="t3dotgg/tstack"
UPSTREAM_BRANCH="main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --upstream-repo) UPSTREAM_REPO="$2"; shift 2 ;;
    --upstream-branch) UPSTREAM_BRANCH="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--upstream-repo owner/name] [--upstream-branch main]"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Allow config file to provide defaults when flags were not given.
CONFIG=".github/upstream.json"
if [[ -f "$CONFIG" ]]; then
  cfg_repo=$(python3 -c "import json;print(json.load(open('$CONFIG')).get('upstream_repo',''))" 2>/dev/null || true)
  cfg_branch=$(python3 -c "import json;print(json.load(open('$CONFIG')).get('upstream_branch',''))" 2>/dev/null || true)
  # Only use config values when the user did not override via flags (defaults still set).
  if [[ "$UPSTREAM_REPO" == "t3dotgg/tstack" && -n "${cfg_repo:-}" ]]; then UPSTREAM_REPO="$cfg_repo"; fi
  if [[ "$UPSTREAM_BRANCH" == "main" && -n "${cfg_branch:-}" ]]; then UPSTREAM_BRANCH="$cfg_branch"; fi
fi

# Local-only skills are never synced (they don't exist upstream).
LOCAL_ONLY=("humanizer" "frontend-design" "ponytail")
if [[ -f "$CONFIG" ]]; then
  mapfile -t _local < <(python3 -c "import json;print('\n'.join(json.load(open('$CONFIG')).get('local_only_skills',[])))" 2>/dev/null || true)
  if [[ ${#_local[@]} -gt 0 && -n "${_local[0]:-}" ]]; then LOCAL_ONLY=("${_local[@]}"); fi
fi

is_local_only() {
  local s="$1"
  for x in "${LOCAL_ONLY[@]}"; do [[ "$x" == "$s" ]] && return 0; done
  return 1
}

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Fetching upstream ${UPSTREAM_REPO}@${UPSTREAM_BRANCH} ..."
git clone --depth 1 --branch "$UPSTREAM_BRANCH" "https://github.com/${UPSTREAM_REPO}.git" "$TMPDIR/upstream" --quiet
UPSTREAM_SHA=$(git -C "$TMPDIR/upstream" rev-parse HEAD)
UPSTREAM_SHORT=$(git -C "$TMPDIR/upstream" rev-parse --short HEAD)
echo "Upstream SHA: $UPSTREAM_SHA"

BASE_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
[[ -z "$BASE_BRANCH" ]] && BASE_BRANCH="main"
echo "Base branch: $BASE_BRANCH"

changed=()
new_skills=()
skipped=()
unchanged=()

for upstream_dir in "$TMPDIR/upstream/skills"/*/; do
  [[ -d "$upstream_dir" ]] || continue
  skill=$(basename "$upstream_dir")
  if is_local_only "$skill"; then
    echo "skip (local-only): $skill"
    continue
  fi

  local_dir="skills/$skill"
  status="new"
  if [[ -d "$local_dir" ]]; then
    if diff -r -q "$local_dir" "$upstream_dir" >/dev/null 2>&1; then
      unchanged+=("$skill")
      continue
    else
      status="updated"
    fi
  fi

  branch="sync/upstream-${skill}"
  echo "---"
  echo "Skill '$skill' is $status (upstream $UPSTREAM_SHORT)."

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] would sync $skill -> branch $branch"
    echo "[dry-run] diff stat:"
    if [[ -d "$local_dir" ]]; then
      diff -r -u "$local_dir" "$upstream_dir" | head -n 100 || true
    else
      echo "[dry-run] new skill, files:"
      find "$upstream_dir" -type f | sed "s|$TMPDIR/upstream/||"
    fi
    if [[ "$status" == "new" ]]; then new_skills+=("$skill"); else changed+=("$skill"); fi
    continue
  fi

  # Skip if an open PR already exists for this branch.
  if command -v gh >/dev/null 2>&1; then
    existing=$(gh pr list --head "$branch" --state open --json number,url --jq '.[0].url // empty' 2>/dev/null || true)
    if [[ -n "$existing" ]]; then
      echo "skip: open PR already exists for $skill: $existing"
      skipped+=("$skill")
      continue
    fi
  fi

  # Create sync branch from base.
  git fetch origin "$BASE_BRANCH" --quiet 2>/dev/null || true
  git checkout -q "$BASE_BRANCH" 2>/dev/null || git checkout -q -b "$BASE_BRANCH"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git branch -D "$branch" >/dev/null
  fi
  git checkout -q -b "$branch"

  rm -rf "$local_dir"
  mkdir -p "$local_dir"
  cp -R "$upstream_dir". "$local_dir"/
  # Preserve executable bit for helper scripts (e.g. babysit-pr/scripts/pr-wait).
  if [[ -f "$TMPDIR/upstream/skills/$skill/scripts/pr-wait" ]]; then
    chmod +x "$local_dir/scripts/pr-wait" || true
  fi

  git add "$local_dir"
  if git diff --cached --quiet; then
    echo "no changes to commit for $skill (unexpected)"
    git checkout -q "$BASE_BRANCH"
    git branch -D "$branch" >/dev/null || true
    unchanged+=("$skill")
    continue
  fi

  diffstat=$(git diff --cached --stat | head -n 30)
  filelist=$(git diff --cached --name-only | tr '\n' ' ')

  git -c user.name="github-actions[bot]" -c user.email="github-actions[bot]@users.noreply.github.com" \
    commit -q -m "sync(upstream): $skill from ${UPSTREAM_REPO}@${UPSTREAM_SHORT}"

  git push -u origin "$branch" --force-with-lease

  title="sync(upstream): $skill from ${UPSTREAM_REPO}@${UPSTREAM_SHORT}"
  body=$(cat <<EOF
Syncs skill \`$skill\` from upstream [\`${UPSTREAM_REPO}@\`${UPSTREAM_SHORT}](https://github.com/${UPSTREAM_REPO}/commit/${UPSTREAM_SHA}).

**Status:** $status skill.

**Files:**
\`$filelist\`

**Diff stat (vs \`$BASE_BRANCH\`):**
\`\`\`
$diffstat
\`\`\`

**How to review:**
- The PR diff shows upstream-vs-your current files. Upstream changes are applied wholesale on this branch.
- If you customized \`skills/$skill\` locally, resolve conflicts / cherry-pick to keep your edits. Do not lose local settings — merge, don't just overwrite \`main\` blindly.
- New upstream skills appear as added files. Delete the branch / close the PR if you don't want that skill.
- \`README.md\`, \`LICENSE\`, and local-only skills (\`humanizer\`, \`frontend-design\`, \`ponytail\`) are never touched by this sync.

Upstream: https://github.com/${UPSTREAM_REPO}/tree/${UPSTREAM_BRANCH}/skills/$skill
EOF
)
  gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body "$body" --label sync --label upstream 2>/dev/null \
    || gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body "$body"

  echo "opened PR for $skill"
  if [[ "$status" == "new" ]]; then new_skills+=("$skill"); else changed+=("$skill"); fi

  git checkout -q "$BASE_BRANCH"
done

echo "==="
echo "Upstream: ${UPSTREAM_REPO}@${UPSTREAM_SHORT}"
echo "New: ${new_skills[*]:-none}"
echo "Updated: ${changed[*]:-none}"
echo "Unchanged: ${unchanged[*]:-none}"
echo "Skipped (open PR exists): ${skipped[*]:-none}"

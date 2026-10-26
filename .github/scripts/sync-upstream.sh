#!/usr/bin/env bash
# Sync skills from their upstream GitHub repos, one PR per skill.
#
# Usage:
#   bash .github/scripts/sync-upstream.sh [--dry-run] [--source <id>]
#
# Behaviour:
# - Reads sources from .github/upstream.json.
# - For each source, clones upstream (shallow) and diffs upstream skill(s)
#   against local skills/<name>.
# - tstack (mode=all): every subdir of upstream skills/ is a skill. New
#   upstream skills become new PRs automatically.
# - humanizer / frontend-design / ponytail (mode=single): one mapped skill
#   each (see upstream.json). Full directory or listed files are compared.
# - For each new or changed skill: creates branch sync/<skill>, copies the
#   upstream skill files in, commits, pushes, and opens a PR.
# - Skips skills that are unchanged or already have an open PR on the same
#   branch. Never pushes directly to main.
# - The PR diff is upstream-vs-current main, so reviewers see exactly what
#   changed upstream and can preserve local edits via normal merge resolution.
set -euo pipefail

DRY_RUN=0
ONLY_SOURCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --source) ONLY_SOURCE="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--source <id>]"
      echo "Sources are defined in .github/upstream.json"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

CONFIG=".github/upstream.json"
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

if [[ ! -f "$CONFIG" ]]; then
  echo "Missing $CONFIG" >&2
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

BASE_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
[[ -z "$BASE_BRANCH" ]] && BASE_BRANCH="main"
echo "Base branch: $BASE_BRANCH"

PR_PREFIX=$(python3 -c "import json;print(json.load(open('$CONFIG')).get('pr_branch_prefix','sync/'))")
LABELS_JSON=$(python3 -c "import json;print(' '.join(json.load(open('$CONFIG')).get('pr_labels',['sync','upstream'])))")
read -ra LABEL_ARGS <<< "$(for l in $LABELS_JSON; do printf -- '--label %s ' "$l"; done)"

NUM_SOURCES=$(python3 -c "import json;print(len(json.load(open('$CONFIG')).get('sources',[])))")

changed=()
new_skills=()
skipped=()
unchanged=()

sync_one_skill() {
  # args: source_id repo sha short upstream_dir local_dir skill status_label
  local source_id="$1" repo="$2" sha="$3" short="$4"
  local upstream_dir="$5" local_dir="$6" skill="$7" status="$8"

  local branch="${PR_PREFIX}${skill}"
  echo "---"
  echo "Skill '$skill' is $status (source $source_id $repo@$short)."

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] would sync $skill -> branch $branch"
    if [[ -d "$local_dir" ]]; then
      diff -r -u "$local_dir" "$upstream_dir" 2>/dev/null | head -n 100 || true
    else
      echo "[dry-run] new skill, files:"
      (cd "$upstream_dir" && find . -type f | head -n 30)
    fi
    if [[ "$status" == "new" ]]; then new_skills+=("$skill"); else changed+=("$skill"); fi
    return
  fi

  if command -v gh >/dev/null 2>&1; then
    local existing
    existing=$(gh pr list --head "$branch" --state open --json url --jq '.[0].url // empty' 2>/dev/null || true)
    if [[ -n "$existing" ]]; then
      echo "skip: open PR already exists for $skill: $existing"
      skipped+=("$skill")
      return
    fi
  fi

  git fetch origin "$BASE_BRANCH" --quiet 2>/dev/null || true
  git checkout -q "$BASE_BRANCH" 2>/dev/null || git checkout -q -b "$BASE_BRANCH"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git branch -D "$branch" >/dev/null
  fi
  git checkout -q -b "$branch"

  rm -rf "$local_dir"
  mkdir -p "$local_dir"
  # Copy preserving modes (keeps pr-wait executable, etc.).
  cp -R "$upstream_dir"/. "$local_dir"/
  # Ensure any upstream-executable file stays executable (cp -R usually keeps it, belt and braces).
  (cd "$upstream_dir" && find . -type f -perm -u+x -print0) | (cd "$local_dir" && xargs -0 -r chmod +x 2>/dev/null || true)

  git add "$local_dir"
  if git diff --cached --quiet; then
    echo "no changes to commit for $skill (unexpected)"
    git checkout -q "$BASE_BRANCH"
    git branch -D "$branch" >/dev/null || true
    unchanged+=("$skill")
    return
  fi

  local diffstat filelist
  diffstat=$(git diff --cached --stat | head -n 30)
  filelist=$(git diff --cached --name-only | tr '\n' ' ')

  git -c user.name="github-actions[bot]" -c user.email="github-actions[bot]@users.noreply.github.com" \
    commit -q -m "sync(${source_id}): ${skill} from ${repo}@${short}"

  git push -u origin "$branch" --force-with-lease

  local title="sync(${source_id}): ${skill} from ${repo}@${short}"
  local body
  body=$(cat <<EOF
Syncs skill \`$skill\` from upstream [\`${repo}@\`${short}](https://github.com/${repo}/commit/${sha}).

**Source:** \`$source_id\` — https://github.com/${repo}
**Status:** $status skill.

**Files:**
\`$filelist\`

**Diff stat (vs \`$BASE_BRANCH\`):**
\`\`\`
$diffstat
\`\`\`

**How to review:**
- The PR diff shows upstream-vs-your current files. Upstream changes are applied wholesale on this branch.
- If you customized \`skills/$skill\` locally, resolve conflicts / cherry-pick to keep your edits. Do not lose local settings — merge, don't just overwrite \`$BASE_BRANCH\` blindly.
- New upstream skills appear as added files. Close the PR if you don't want that skill.
- \`README.md\` and \`LICENSE\` are never touched by this sync.

Upstream skill path: https://github.com/${repo}/tree/${UPSTREAM_BRANCH_HINT}/$UPSTREAM_PATH_HINT
EOF
)
  # shellcheck disable=SC2086
  gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body "$body" ${LABEL_ARGS[@]:-} 2>/dev/null \
    || gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body "$body"

  echo "opened PR for $skill"
  if [[ "$status" == "new" ]]; then new_skills+=("$skill"); else changed+=("$skill"); fi

  git checkout -q "$BASE_BRANCH"
}

for ((i = 0; i < NUM_SOURCES; i++)); do
  SRC_JSON=$(python3 -c "import json,sys;print(json.dumps(json.load(open('$CONFIG'))['sources'][$i]))")
  source_id=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['id'])" "$SRC_JSON")
  repo=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['repo'])" "$SRC_JSON")
  branch=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('branch','main'))" "$SRC_JSON")
  mode=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('mode','all'))" "$SRC_JSON")

  if [[ -n "$ONLY_SOURCE" && "$source_id" != "$ONLY_SOURCE" ]]; then
    continue
  fi

  export UPSTREAM_BRANCH_HINT="$branch"
  echo "==="
  echo "Fetching source $source_id ${repo}@${branch} ..."
  clone_dir="$TMPDIR/$source_id"
  git clone --depth 1 --branch "$branch" "https://github.com/${repo}.git" "$clone_dir" --quiet
  SHA=$(git -C "$clone_dir" rev-parse HEAD)
  SHORT=$(git -C "$clone_dir" rev-parse --short HEAD)
  echo "Source SHA: $SHA"

  if [[ "$mode" == "all" ]]; then
    upstream_path=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('upstream_path','skills'))" "$SRC_JSON")
    local_path=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('local_path','skills'))" "$SRC_JSON")
    export UPSTREAM_PATH_HINT="$upstream_path"
    for upstream_dir in "$clone_dir/$upstream_path"/*/; do
      [[ -d "$upstream_dir" ]] || continue
      skill=$(basename "$upstream_dir")
      export UPSTREAM_PATH_HINT="$upstream_path/$skill"
      local_dir="$local_path/$skill"
      status="new"
      if [[ -d "$local_dir" ]]; then
        if diff -r -q "$local_dir" "$upstream_dir" >/dev/null 2>&1; then
          unchanged+=("$skill")
          continue
        else
          status="updated"
        fi
      fi
      sync_one_skill "$source_id" "$repo" "$SHA" "$SHORT" "$upstream_dir" "$local_dir" "$skill" "$status"
    done
  else
    local_skill=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('local_skill',''))" "$SRC_JSON")
    upstream_path=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('upstream_path',''))" "$SRC_JSON")
    has_files=$(python3 -c "import json,sys;print('yes' if 'files' in json.loads(sys.argv[1]) else 'no')" "$SRC_JSON")
    local_dir="skills/$local_skill"
    stage="$TMPDIR/stage-$source_id-$local_skill"
    rm -rf "$stage"
    mkdir -p "$stage"

    if [[ "$has_files" == "yes" ]]; then
      mapfile -t FILES < <(python3 -c "import json,sys;print('\n'.join(json.loads(sys.argv[1])['files']))" "$SRC_JSON")
      export UPSTREAM_PATH_HINT="(files: ${FILES[*]})"
      for f in "${FILES[@]}"; do
        if [[ ! -e "$clone_dir/$f" ]]; then
          echo "warning: $repo missing expected file $f (skipping)" >&2
          continue
        fi
        mkdir -p "$stage/$(dirname "$f")"
        cp -R "$clone_dir/$f" "$stage/$f"
      done
    else
      export UPSTREAM_PATH_HINT="$upstream_path"
      if [[ ! -d "$clone_dir/$upstream_path" ]]; then
        echo "warning: $repo missing expected path $upstream_path (skipping)" >&2
        continue
      fi
      cp -R "$clone_dir/$upstream_path"/. "$stage"/
    fi

    status="new"
    if [[ -d "$local_dir" ]]; then
      if diff -r -q "$local_dir" "$stage" >/dev/null 2>&1; then
        unchanged+=("$local_skill")
        continue
      else
        status="updated"
      fi
    fi
    sync_one_skill "$source_id" "$repo" "$SHA" "$SHORT" "$stage" "$local_dir" "$local_skill" "$status"
  fi
done

echo "==="
echo "New: ${new_skills[*]:-none}"
echo "Updated: ${changed[*]:-none}"
echo "Unchanged: ${unchanged[*]:-none}"
echo "Skipped (open PR exists): ${skipped[*]:-none}"

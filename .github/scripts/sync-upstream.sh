#!/usr/bin/env bash
# Sync skills from their upstream GitHub repos, one PR per skill.
#
# Usage:
#   bash .github/scripts/sync-upstream.sh [--dry-run] [--source <id>]
#
# Apply only upstream changes since a recorded revision using a three-way merge.
# Local-only edits survive. Conflicts skip the whole skill and fail the run.
# Each PR records its new baseline; main advances only when the PR is merged.
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

if [[ "$DRY_RUN" != "1" ]]; then
  if [[ "$(git config user.name)" != "0libote" || "$(git config user.email)" != "79215282+0libote@users.noreply.github.com" ]]; then
    echo "Set git identity to 0libote <79215282+0libote@users.noreply.github.com> before syncing." >&2
    exit 1
  fi
fi

# Prefer an optional PAT for `gh` calls (workflow secret SYNC_PAT).
# GITHUB_TOKEN cannot open PRs while the repo setting "Allow GitHub Actions
# to create and approve pull requests" is off.
if [[ -n "${SYNC_PAT:-}" ]]; then
  export GH_TOKEN="$SYNC_PAT"
fi

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

# Ensure pr_labels exist so `gh pr create --label` doesn't fail on fresh
# repos (missing labels were the "(without labels)" fallback noise).
if command -v gh >/dev/null 2>&1 && [[ "$DRY_RUN" != "1" ]]; then
  EXISTING_LABELS=$(gh label list --json name --jq '.[].name' 2>/dev/null || true)
  for l in $LABELS_JSON; do
    if ! grep -qx "$l" <<< "$EXISTING_LABELS"; then
      echo "Creating missing label: $l"
      gh label create "$l" --color 0E8A16 2>/dev/null \
        || echo "warning: could not create label $l (continuing without it)" >&2
    fi
  done
fi

NUM_SOURCES=$(python3 -c "import json;print(len(json.load(open('$CONFIG')).get('sources',[])))")

changed=()
new_skills=()
skipped=()
unchanged=()
failed=()

sync_one_skill() {
  # args: source_id repo sha short upstream_dir local_dir skill status [upstream_name]
  local source_id="$1" repo="$2" sha="$3" short="$4"
  local upstream_dir="$5" local_dir="$6" skill="$7" status="$8"
  local upstream_name="${9:-$skill}"

  local state_file=".github/upstream-state/$source_id/$skill"
  local baseline
  baseline=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["baseline"])' "$SRC_JSON")
  [[ ! -f "$state_file" ]] || baseline=$(cat "$state_file")
  if [[ -d "$local_dir" ]]; then
    if ! git -C "$clone_dir" cat-file -e "$baseline^{commit}" 2>/dev/null; then
      git -C "$clone_dir" fetch --depth 1 origin "$baseline" --quiet
    fi
    local mapping="$SRC_JSON"
    if [[ "$mode" == "all" ]]; then
      mapping=$(python3 -c 'import json,sys; print(json.dumps({"upstream_path":sys.argv[1]}))' "$UPSTREAM_PATH_HINT")
    fi
    local merged="$TMPDIR/merged-$source_id-$skill"
    if ! python3 .github/scripts/merge-upstream.py "$clone_dir" "$baseline" "$mapping" "$local_dir" "$upstream_dir" "$merged"; then
      echo "Conflict: $skill; local files left untouched. Resolve upstream changes manually." >&2
      failed+=("$skill (conflict)")
      return
    fi
    upstream_dir="$merged"
    if diff -r -q "$local_dir" "$upstream_dir" >/dev/null 2>&1; then
      unchanged+=("$skill")
      return
    fi
  fi

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

  mkdir -p "$(dirname "$state_file")"
  printf '%s\n' "$sha" > "$state_file"
  git add "$local_dir" "$state_file"
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

  git commit -q -m "sync(${source_id}): ${skill} from ${repo}@${short}"

  git push -u origin "$branch" --force-with-lease

  local title="sync(${source_id}): ${skill} from ${repo}@${short}"
  local RENAME_NOTE=""
  if [[ "$upstream_name" != "$skill" ]]; then
    RENAME_NOTE="- Note: local \`$skill\` is renamed and customized from upstream \`$upstream_name\`. Cherry-pick workflow changes only and keep the local generalization (model choice, trigger phrase, report line)."
  fi
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
- Only changes since the recorded upstream revision are merged. Local edits are preserved; conflicting skills are skipped.
- New upstream skills appear as added files. Close the PR if you don't want that skill.
- \`README.md\` and \`LICENSE\` are never touched by this sync.
$RENAME_NOTE
Upstream skill path: https://github.com/${repo}/tree/${UPSTREAM_BRANCH_HINT}/$UPSTREAM_PATH_HINT
EOF
)
  # shellcheck disable=SC2086
  local pr_url="" pr_err=""
  if pr_url=$(gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body "$body" ${LABEL_ARGS[@]:-} 2>&1); then
    echo "opened PR for $skill: $pr_url"
  elif pr_url=$(gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body "$body" 2>&1); then
    echo "opened PR for $skill (without labels): $pr_url"
  else
    pr_err="$pr_url"
    echo "warning: branch $branch was pushed but no PR was opened for $skill." >&2
    echo "$pr_err" >&2
    if echo "$pr_err" | grep -qi "not permitted to create.*pull request"; then
      cat >&2 <<EOF
fix: enable Settings > Actions > General > Workflow permissions > "Allow GitHub Actions to create and approve pull requests",
or add a repo secret SYNC_PAT (classic PAT with repo + workflow scopes) - the workflow prefers it automatically.
Branch $branch is already pushed; re-run the workflow once fixed.
EOF
    fi
    failed+=("$skill")
    git checkout -q "$BASE_BRANCH"
    return 0
  fi

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
    renames_json=$(python3 -c "import json,sys;print(json.dumps(json.loads(sys.argv[1]).get('renames',{})))" "$SRC_JSON")
    export UPSTREAM_PATH_HINT="$upstream_path"
    for upstream_dir in "$clone_dir/$upstream_path"/*/; do
      [[ -d "$upstream_dir" ]] || continue
      skill=$(basename "$upstream_dir")
      export UPSTREAM_PATH_HINT="$upstream_path/$skill"
      local_name=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get(sys.argv[2],sys.argv[2]))" "$renames_json" "$skill")
      local_dir="$local_path/$local_name"
      status="new"
      if [[ -d "$local_dir" ]]; then
        if diff -r -q "$local_dir" "$upstream_dir" >/dev/null 2>&1; then
          unchanged+=("$local_name")
          continue
        else
          status="updated"
        fi
      fi
      sync_one_skill "$source_id" "$repo" "$SHA" "$SHORT" "$upstream_dir" "$local_dir" "$local_name" "$status" "$skill"
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
echo "Failed (branch pushed, no PR): ${failed[*]:-none}"

if [[ ${#failed[@]} -gt 0 ]]; then
  echo "One or more skills conflicted or could not open a PR. See the errors above." >&2
  exit 1
fi

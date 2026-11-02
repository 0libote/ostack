---
name: gh-actions
description: >-
  Write, modify, or review GitHub Actions workflows and local composite actions.
  Check action releases, permissions, caching, triggers, and deployment safety.
---

# GitHub Actions

Read the affected workflows, repository scripts, runtime version files, and dependency
update configuration before editing. Keep existing job names that are required by
branch protection. Match the repository's package manager and supported runtimes.

## Action versions and pins

Verify releases when adding or updating an action. Check the action's own repository,
release notes, and inputs; a newer major may require newer runners or change defaults.
For `owner/repo/path@ref`, query releases on `owner/repo`.

```bash
gh api repos/actions/checkout/releases/latest --jq '.tag_name'
gh api repos/actions/setup-node/releases/latest --jq '.tag_name'
```

The latest-release endpoint returns the latest published stable release, not every
tag. If an action publishes only tags, inspect its tags and documentation. If access
fails, report what could not be verified and preserve existing pins; never invent a
version or SHA. Check GitHub Enterprise Server and self-hosted runner compatibility
before upgrading. Check actions touched by the change; keep unrelated upgrades out
of a focused fix unless the user requested a broader refresh.

Pin remote actions and reusable workflows to full commit SHAs, including those from
`actions/` and `github/`. Add a comment with the verified release tag. Resolve the
release tag to its commit in the upstream repository, dereferencing annotated tags.
A release object's `target_commitish` may be a branch; it is not a verified pin.
Local actions (`uses: ./...`) have no remote ref. Pin Docker actions by image digest.

[pinact](https://github.com/suzuki-shunsuke/pinact) can resolve tags to SHAs. If it is
available, check its current usage and scope changes to the intended files; inspect
the diff afterward. Do not install or run an unverified remote installer. Use the
repository's Dependabot or Renovate configuration to keep pins current; suggest a
GitHub Actions update rule if none exists. Respect an explicit repository policy
that requires version tags, and explain that those refs remain mutable.

See GitHub's [secure use reference](https://docs.github.com/en/actions/reference/security/secure-use).

## Permissions and trust

Start new workflows with `permissions: {}` and grant permissions on the jobs that
need them. A checkout normally needs `contents: read`. Avoid `write-all`; give
publishing, PR comments, and deployments only their specific write scopes. Declaring
permissions makes unspecified scopes `none`, so check every affected job.

- Use `pull_request` for tests of PR code. Fork PRs normally receive a read-only
  token and no repository secrets; Dependabot PRs have similar restrictions.
- Reserve `pull_request_target` for base-repository automation such as labeling.
  It runs in the base repository's privileged context, subject to explicit permissions
  and policy. Never check out or execute PR head code there, including local actions,
  package install hooks, or scripts from the PR. A fork needing a comment does not
  justify running its code with a write token.
- Treat `workflow_run` as another privilege boundary. Before consuming artifacts,
  verify the source workflow, repository, event, and run identity. Never execute
  untrusted artifacts or restore untrusted caches in privileged jobs.
- Keep untrusted PR jobs off persistent self-hosted runners with secrets or access
  to internal services. Use isolated disposable runners for untrusted workloads.
- Set checkout's `persist-credentials: false` when subsequent steps do not need
  authenticated Git operations. Pass secrets only to the steps that need them.
- Prefer OIDC for cloud credentials when supported. Grant `id-token: write` only
  to the deployment job and constrain the provider's trust policy to the intended
  repository, branch or protected environment. OIDC permission alone grants no
  cloud authorization. Use environment protections for production deployments.

Treat PR titles, bodies, branch names, issue text, and workflow inputs as untrusted.
Pass them through environment variables and quote shell expansions:

```yaml
- name: Print PR title
  env:
    TITLE: ${{ github.event.pull_request.title }}
  run: printf '%s\n' "$TITLE"
```

Do not put such expressions directly into `run:` scripts. Environment variables
prevent script interpolation; they do not make `eval`, unsafe argument parsing, or
commands built from untrusted text safe. Use structured API arguments and `--` where
supported to separate options from user-controlled arguments.

## Dependency installation and caching

Use the setup action's built-in cache when it supports the package manager. Read
its current inputs and defaults: `setup-go` enables caching by default, while the
other setup actions have their own opt-in or automatic behavior. Do not copy a
single cache configuration across Node, Python, Go, and Java.

- Use the repository's lockfile and frozen install command, such as `npm ci`.
  A dependency cache does not replace installing or validating dependencies.
- Point cache dependency inputs at the correct lockfiles in monorepos. Check
  working directories; `defaults.run.working-directory` does not configure `uses:`
  steps.
- Use `actions/cache` for custom paths or keys. Include the OS, architecture when
  relevant, toolchain, and lockfile hash. Keep restore prefixes compatible with the
  cached data. Avoid overlapping caches for the same paths.
- Never cache secrets or credentials. PRs can read eligible base-branch caches.
  Cache contents are untrusted input, not verified release artifacts.
- Use artifacts to pass build outputs between jobs. Give matrix outputs distinct
  artifact names, choose retention deliberately, and deploy the verified output
  rather than rebuilding with a different dependency resolution.

See the [setup action documentation](https://github.com/actions/setup-node) and
GitHub's [cache reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).

## Triggers and required checks

`pull_request` normally tests the synthetic merge commit. Overriding checkout to
the PR head changes what is validated. Use a default-branch `push` trigger for
post-merge publishing or deployment, with an explicit branch or tag policy.

Use path filters for optional workflows that apply to specific files. A required
workflow skipped by branch or path filtering can leave its check pending and block
merging. Keep required checks reporting a result, and include workflow files and
shared configuration in filters when those changes should trigger validation.

If required CI participates in a merge queue, handle `merge_group` as well as
`pull_request` and check that expressions work without a PR payload. Workflows
triggered on both PRs and pushes may duplicate runs; choose triggers deliberately.
Events created with `GITHUB_TOKEN` generally do not start other workflows, apart
from supported dispatch exceptions. Do not rely on a bot push to trigger follow-up
CI without checking this behavior.

## Concurrency and time limits

For replaceable CI runs, cancel older work for the same workflow and ref:

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

For deployments, group by the shared target environment so different branches
cannot deploy to it simultaneously. Protect the running deployment:

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

With the default queue, a newer pending run replaces an older pending run even
when `cancel-in-progress` is false. When every deployment must wait, check support
for `queue: max` on the target GitHub instance: it allows up to 100 pending runs
and cannot be combined with `cancel-in-progress: true`. Queue order follows when
runs start waiting, which may differ from commit or dispatch order. Use release
orchestration if strict release ordering is required.

Set a realistic `timeout-minutes` on every job that runs steps, with step timeouts
for operations that commonly hang. A job that calls a reusable workflow does not
accept this field; set timeouts inside the called workflow. Use `fail-fast: false`
when all matrix results are needed, and `max-parallel` when capacity or external
service limits require it. Derive runtime matrices from the project's supported
versions rather than copying a fixed list.

See GitHub's [concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Shared workflows and validation

Use `workflow_call` for shared jobs and composite actions for shared steps. Keep
inputs typed, pass only required secrets, and avoid broad `secrets: inherit` across
trust boundaries. Called workflows cannot elevate the caller's token permissions.

Before handing back:

- Review the diff for changed triggers, permissions, secret exposure, required job
  names, and cache or artifact trust boundaries.
- Run `actionlint` on the changed workflows if available. Check its version when
  it rejects recently introduced syntax. Use the repository's existing checks for
  composite actions and scripts; a generic YAML parser does not validate Actions
  expressions or job schemas.
- Run the underlying build or test commands where practical. Local checks cannot
  prove hosted runner behavior, fork permissions, OIDC trust, or environment rules.
- Report what passed and what needs a hosted run. Dispatching a publishing or
  deployment workflow requires authorization for that external action; editing
  its YAML alone does not authorize a release.

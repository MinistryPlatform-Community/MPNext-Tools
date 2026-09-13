# Release Command

Create a GitHub release with auto-generated release notes from merged pull requests.

## Instructions

1. **Promote `dev` → `main`:**
   - A release is the promotion of verified `dev` into `main`. Do this first — the tag must point at the merge commit on `main`.
   - Confirm `dev` is green and staged-verified with the user before promoting.
   - Check whether `main` is already up to date: `git rev-list --count origin/main..origin/dev`
     - If `0`, `main` already has everything — skip to step 2 and tag the existing `main`.
   - Otherwise open a release PR: `gh pr create --base main --head dev --title "release: <tag>" --body "<summary>"`
   - **Merge it with a merge commit, never a squash**: `gh pr merge --merge` — squashing `dev` into `main` would rewrite history and make `dev` permanently diverge from `main`.
   - After merge, run `git fetch origin` and re-confirm `git rev-list --count origin/main..origin/dev` is `0`.

2. **Gather context:**
   - Run `gh release list --limit 5` to find the most recent release (if any)
   - Run `git tag --sort=-version:refname | head -5` to see existing tags
   - If a previous release exists, identify its tag to scope the changelog
   - Run `git log --oneline` (from last release tag to HEAD, or recent commits if first release) to understand what's new

3. **Identify PRs to include:**
   - If this is the first release, run `gh pr list --state merged --limit 20 --json number,title,mergedAt,body,labels` to get recent merged PRs
   - If a previous release exists, find PRs merged since that release using `gh pr list --state merged --search "merged:>YYYY-MM-DD" --json number,title,mergedAt,body,labels`
   - Present the list of PRs to the user and ask which to include (default: all)
   - Exclude the `dev` → `main` release PR itself — it is a promotion, not a change

4. **Determine version:**
   - Auto-compute the version tag using calver format: `v{YYYY}.{MM}.{DD}.{HHmm}` based on the current date and time
   - Generate it with: `date -u +v%Y.%m.%d.%H%M` (UTC time)
   - Example: `v2026.02.20.1735` means 2026-02-20 at 17:35 UTC
   - Show the computed version to the user for confirmation
   - If `--tag` argument was provided, use that instead of auto-computing
   - If the computed tag already exists, append a `.1` suffix (e.g., `v2026.02.20.1735.1`)

5. **Generate release notes:**
   - Categorize included PRs by type using PR title prefixes and content:
     - `⚠️ Breaking Changes` — any PR with breaking changes (migration steps, renamed APIs, changed URLs, removed features)
     - `🚀 Features` — PRs with `feat:` prefix or feature work
     - `🐛 Bug Fixes` — PRs with `fix:` prefix or bug fixes
     - `📚 Documentation` — PRs with `docs:` prefix or doc-only changes
     - `🔧 Maintenance` — dependency updates, refactoring, CI changes, chores
   - For each PR, write a concise summary line: `**Short title** (#number) — One-sentence description.`
   - Pull the description from the PR body's Summary section if available
   - Only include categories that have PRs in them
   - Ask the user if there are any breaking changes or additional notes to add

6. **Review with user:**
   - Show the complete draft release notes to the user
   - Ask if any edits are needed before publishing
   - Apply any requested changes

7. **Create the release:**
   - Run `gh release create <tag> --target main --title "<tag>" --notes "<notes>"`
   - Use a HEREDOC for the notes body to handle multiline content
   - Run `git fetch --tags` to sync the new tag locally

8. **Post-creation:**
   - Display the release URL
   - Confirm tag is synced locally
   - Show summary of what was released

## Arguments

- `$ARGUMENTS` - Optional arguments:
  - `--tag <version>` - Specify version tag directly (skip version prompt)
  - `--draft` - Create as draft release
  - `--prerelease` - Mark as pre-release
  - `--target <branch>` - Target branch (default: `main`)
  - `--since <tag>` - Override: include PRs since this tag instead of auto-detecting

## Release Notes Format

```markdown
## What's Changed

### ⚠️ Breaking Changes

- **Description of breaking change** (#PR) — What changed and what action users must take.

### 🚀 Features

- **Feature title** (#PR) — Brief description of the feature.

### 🐛 Bug Fixes

- **Fix title** (#PR) — Brief description of what was fixed.

### 📚 Documentation

- **Doc change title** (#PR) — Brief description of doc changes.

### 🔧 Maintenance

- **Maintenance title** (#PR) — Brief description of maintenance work.

**Full Changelog**: https://github.com/OWNER/REPO/compare/PREVIOUS_TAG...NEW_TAG
```

## Example Workflow

```bash
# 1. Check existing releases and tags
gh release list --limit 5
git tag --sort=-version:refname | head -5

# 2. Get merged PRs since last release
gh pr list --state merged --limit 20 --json number,title,mergedAt,body,labels

# 3. Get repo info for changelog URL
gh repo view --json nameWithOwner --jq .nameWithOwner

# 4. Create the release
gh release create v2026.02.20.1735 --target main --title "v2026.02.20.1735" --notes "$(cat <<'EOF'
## What's Changed

### 🚀 Features

- **New feature** (#44) — Description of the feature.

### 🐛 Bug Fixes

- **Bug fix** (#40) — Description of the fix.

**Full Changelog**: https://github.com/owner/repo/compare/v0.1.0...v2026.02.20.1735
EOF
)"

# 5. Sync tag locally
git fetch --tags
```

## Error Handling

- If `gh` CLI is not installed or not authenticated, provide instructions for setup
- If no merged PRs are found since the last release, inform the user and ask how to proceed
- If the tag already exists, warn the user and ask if they want to use a different tag
- If release creation fails, show the error and suggest fixes

## Notes

- Always use HEREDOC for release notes to handle multiline content and special characters
- Include the Full Changelog comparison link at the bottom when a previous release exists
- `main` is the production branch and is ALWAYS the release target — pass `--target main` explicitly, since the
  repo's default branch is `dev` and `gh release create` would otherwise tag `dev`
- Sync tags locally after creating the release so `git describe` and local tooling work correctly
- When categorizing PRs, prefer using the PR title prefix (feat:, fix:, docs:, chore:) but fall back to analyzing the PR body content
- Ask about breaking changes explicitly — they're easy to miss but critical for users upgrading

# OpenSpec Instructions

Instructions for AI coding assistants using OpenSpec for spec-driven development.

## TL;DR Quick Checklist

- Run `openspec spec list --long` and `openspec list` to search existing work
- Pick unique `change-id`: kebab-case, verb-led (`add-`, `update-`, `remove-`, `refactor-`)
- Scaffold: `proposal.md`, `tasks.md`, optional `design.md`, delta specs per affected capability
- Write deltas: use `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` with at least one `#### Scenario:` per requirement
- Run `gh issue create --title "<title>" --body "$(cat openspec/changes/<id>/proposal.md)"`
- Add issue link to `proposal.md`: `> **GitHub Issue:** [#<N>](https://github.com/<owner>/<repo>/issues/<N>)`
- Run `openspec validate <change-id> --strict` and fix issues
- Wait for approval before implementing
- Run `git checkout -b openspec/<change-id>` before implementing
- Run `gh pr create --draft --title "Implement: <title>" --body "Closes: #<N>"`
- After all tasks complete, run `gh pr ready`

## GitHub Integration

### GitHub Issue Creation

Create GitHub issue for every proposal:

```bash
gh issue create \
  --title "<descriptive-title>" \
  --label "enhancement" \
  --body "$(cat openspec/changes/<change-id>/proposal.md)"
```

Add issue reference to `proposal.md` after title:

```markdown
# Change: Your Change Title

> **GitHub Issue:** [#<issue-number>](https://github.com/<owner>/<repo>/issues/<issue-number>)

## Why
```

Sync proposal with issue when updating:

```bash
gh issue edit <issue-number> --body "$(cat openspec/changes/<change-id>/proposal.md)"
```

### Branch Management

Check current branch before implementing:

```bash
git branch --show-current
```

Create branch using pattern `openspec/<change-id>`:

```bash
git checkout -b openspec/<change-id>
```

If branch exists, checkout and pull:

```bash
git checkout openspec/<change-id>
git pull origin openspec/<change-id> 2>/dev/null || true
```

Never implement on `main` or `master`.

### Draft PR Creation

Push branch:

```bash
git push -u origin openspec/<change-id>
```

Create draft PR with issue link:

```bash
gh pr create \
  --title "Implement: <change-title>" \
  --body "$(cat <<'EOF'
## Summary

Implements openspec change proposal.

**Proposal:** openspec/changes/<change-id>/proposal.md
**Closes:** #<issue-number>

## Tasks

See `openspec/changes/<change-id>/tasks.md` for implementation checklist.

## Test Plan

- [ ] All existing tests pass
- [ ] New tests added for changed behavior
- [ ] `openspec validate <change-id> --strict` passes
EOF
)" \
  --draft
```

Always use `--draft` flag. Always include `Closes: #<issue-number>` in body.

### PR Completion

Verify all tasks complete:

```bash
cat openspec/changes/<change-id>/tasks.md | grep -E "^\s*- \["
openspec validate <change-id> --strict
npm test
```

Mark PR ready:

```bash
gh pr ready
```

Optional: add reviewers:

```bash
gh pr edit --add-reviewer <username>
```

### Command Reference

```bash
# Issues
gh issue create --title "<title>" --body "..." --label "enhancement"
gh issue edit <number> --body "..."
gh issue view <number>
gh issue list --label "enhancement"

# Pull Requests
gh pr create --title "<title>" --body "..." --draft
gh pr ready
gh pr edit --add-reviewer <user>
gh pr view
gh pr list --state open

# Check branch
git branch --show-current

# Create branch
git checkout -b openspec/<change-id>
```

### Required Actions by Stage

Stage 1 (Proposal):
1. Create `openspec/changes/<change-id>/proposal.md`
2. Run `gh issue create` with proposal content
3. Add issue reference to proposal.md

Stage 2 (Implementation):
1. Run `git branch --show-current` - verify not on main/master
2. Run `git checkout -b openspec/<change-id>` if branch doesn't exist
3. Run `gh pr create --draft` with `Closes: #<issue-number>`
4. Complete all tasks in `tasks.md`
5. Run `openspec validate <change-id> --strict`
6. Run `gh pr ready`

Stage 3 (Archive):
1. After PR merged, run `openspec archive <change-id> --yes`
2. GitHub issue auto-closes via `Closes:` link

---

## Three-Stage Workflow

### Stage 1: Creating Changes
Create proposal when:
- Adding features or functionality
- Making breaking changes (API, schema)
- Changing architecture or patterns  
- Optimizing performance (changes behavior)
- Updating security patterns

User request patterns that trigger proposal creation:
- "Help me create a change proposal"
- "Help me plan a change"
- "Help me create a proposal"
- "I want to create a spec proposal"
- "I want to create a spec"

Pattern matching: request contains one of `proposal`, `change`, `spec` with one of `create`, `plan`, `make`, `start`, `help`

Skip proposal for:
- Bug fixes (restoring intended behavior)
- Typos, formatting, comments
- Dependency updates (non-breaking)
- Configuration changes
- Tests for existing behavior

**Workflow**
1. Run `openspec list` and `openspec list --specs` to understand current context
2. Choose unique verb-led `change-id` and scaffold files under `openspec/changes/<id>/`
3. Write spec deltas using `## ADDED|MODIFIED|REMOVED Requirements` with at least one `#### Scenario:` per requirement
4. Run `openspec validate <id> --strict` and resolve issues
5. Run `gh issue create --title "<title>" --body "$(cat openspec/changes/<id>/proposal.md)"`
6. Add issue reference to `proposal.md` after title: `> **GitHub Issue:** [#<N>](...)`

### Stage 2: Implementing Changes
Track these steps as TODOs and complete them one by one.

**Pre-Implementation (Required):**
1. Run `cat openspec/changes/<change-id>/proposal.md | grep "GitHub Issue:"` to verify issue link exists
2. Run `git branch --show-current` to verify not on main/master
3. Run `git checkout -b openspec/<change-id>` to create branch
4. Run `gh pr create --draft` with `Closes: #<issue-number>` in body

**Implementation:**
5. Read `openspec/changes/<change-id>/proposal.md` to understand what's being built
6. Read `openspec/changes/<change-id>/design.md` if exists
7. Read `openspec/changes/<change-id>/tasks.md` for implementation checklist
8. Implement tasks sequentially, commit regularly
9. Confirm every item in `tasks.md` is complete
10. Update `tasks.md` to set every task to `- [x]`

**Completion:**
11. Run `openspec validate <change-id> --strict`
12. Run `npm test` to verify all tests pass
13. Run `gh pr ready` when ALL tasks complete
14. Optional: run `gh pr edit --add-reviewer <username>`

### Stage 3: Archiving Changes
After PR is merged:

1. PR merge auto-closes GitHub issue via `Closes: #N` link
2. Run `openspec archive <change-id> --yes` to archive change
3. Commit archived files
4. Push to main or create archive PR

**Archive commands:**

```bash
# Standard archive (updates specs)
openspec archive <change-id> --yes

# Tooling-only changes (no spec updates)
openspec archive <change-id> --skip-specs --yes

# Validate after archive
openspec validate --strict
```

**Result:**
- `changes/<name>/` moves to `changes/archive/YYYY-MM-DD-<name>/`
- `specs/` updated with merged deltas (unless `--skip-specs`)
- GitHub issue closed via PR merge

## Before Any Task

**Context Checklist:**
- [ ] Read relevant specs in `specs/<capability>/spec.md`
- [ ] Run `openspec list` to check for pending changes and conflicts
- [ ] Read `openspec/project.md` for conventions
- [ ] Run `openspec list --specs` to see existing capabilities

**GitHub Checklist (for implementation):**
- [ ] Run `cat openspec/changes/<change-id>/proposal.md | grep "GitHub Issue:"` to verify issue link exists
- [ ] Run `git branch --show-current` to check current branch
- [ ] Run `git checkout -b openspec/<change-id>` to create implementation branch
- [ ] Run `gh pr list --head openspec/<change-id>` to verify draft PR exists

**Before Creating Specs:**
- Run `openspec list --specs` to check if capability exists
- Modify existing specs instead of creating duplicates
- Run `openspec show <spec>` to review current state
- Ask 1-2 clarifying questions if request is ambiguous

### Search Guidance
- Run `openspec spec list --long` to enumerate specs (use `--json` for scripts)
- Run `openspec list` to enumerate changes
- Run `openspec show <spec-id> --type spec` to show spec details (use `--json` for filters)
- Run `openspec show <change-id> --json --deltas-only` to show change details
- Run `rg -n "Requirement:|Scenario:" openspec/specs` for full-text search

## Quick Start

### CLI Commands

```bash
# Essential commands
openspec list                  # List active changes
openspec list --specs          # List specifications
openspec show [item]           # Display change or spec
openspec validate [item]       # Validate changes or specs
openspec archive <change-id> [--yes|-y]   # Archive after deployment (add --yes for non-interactive runs)

# Project management
openspec init [path]           # Initialize OpenSpec
openspec update [path]         # Update instruction files

# Interactive mode
openspec show                  # Prompts for selection
openspec validate              # Bulk validation mode

# Debugging
openspec show [change] --json --deltas-only
openspec validate [change] --strict
```

### Command Flags

- `--json` - Machine-readable output
- `--type change|spec` - Disambiguate items
- `--strict` - Comprehensive validation
- `--no-interactive` - Disable prompts
- `--skip-specs` - Archive without spec updates
- `--yes`/`-y` - Skip confirmation prompts (non-interactive archive)

## Directory Structure

```
openspec/
├── project.md              # Project conventions
├── specs/                  # Current truth - what IS built
│   └── [capability]/       # Single focused capability
│       ├── spec.md         # Requirements and scenarios
│       └── design.md       # Technical patterns
├── changes/                # Proposals - what SHOULD change
│   ├── [change-name]/
│   │   ├── proposal.md     # Why, what, impact
│   │   ├── tasks.md        # Implementation checklist
│   │   ├── design.md       # Technical decisions (optional; see criteria)
│   │   └── specs/          # Delta changes
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # Completed changes
```

## Creating Change Proposals

### Decision Tree

```
New request?
├─ Bug fix restoring spec behavior? → Fix directly
├─ Typo/format/comment? → Fix directly  
├─ New feature/capability? → Create proposal
├─ Breaking change? → Create proposal
├─ Architecture change? → Create proposal
└─ Unclear? → Create proposal (safer)
```

### Proposal Structure

1. Create directory `changes/<change-id>/` (kebab-case, verb-led, unique)

2. Write `proposal.md`:
```markdown
# Change: <brief-description>

## Why
<1-2 sentences on problem/opportunity>

## What Changes
- <bullet list of changes>
- <mark breaking changes with **BREAKING**>

## Impact
- Affected specs: <list capabilities>
- Affected code: <key files/systems>
```

3. Create spec deltas in `specs/<capability>/spec.md`
```markdown
## ADDED Requirements
### Requirement: New Feature
The system SHALL provide...

#### Scenario: Success case
- **WHEN** user performs action
- **THEN** expected result

## MODIFIED Requirements
### Requirement: Existing Feature
[Complete modified requirement]

## REMOVED Requirements
### Requirement: Old Feature
**Reason**: [Why removing]
**Migration**: [How to handle]
```
For multiple capabilities, create multiple delta files under `changes/<change-id>/specs/<capability>/spec.md` (one per capability).

4. Create `tasks.md`:
```markdown
## 1. Implementation
- [ ] 1.1 Create database schema
- [ ] 1.2 Implement API endpoint
- [ ] 1.3 Add frontend component
- [ ] 1.4 Write tests
```

5. Create `design.md` if any of the following apply; otherwise omit:
- Cross-cutting change (multiple services/modules) or a new architectural pattern
- New external dependency or significant data model changes
- Security, performance, or migration complexity
- Ambiguity that benefits from technical decisions before coding

Minimal `design.md` skeleton:
```markdown
## Context
[Background, constraints, stakeholders]

## Goals / Non-Goals
- Goals: [...]
- Non-Goals: [...]

## Decisions
- Decision: [What and why]
- Alternatives considered: [Options + rationale]

## Risks / Trade-offs
- [Risk] → Mitigation

## Migration Plan
[Steps, rollback]

## Open Questions
- [...]
```

## Spec File Format

### Critical: Scenario Formatting

**CORRECT** (use #### headers):
```markdown
#### Scenario: User login success
- **WHEN** valid credentials provided
- **THEN** return JWT token
```

**WRONG** (don't use bullets or bold):
```markdown
- **Scenario: User login**  ❌
**Scenario**: User login     ❌
### Scenario: User login      ❌
```

Every requirement MUST have at least one scenario.

### Requirement Wording
- Use `SHALL` or `MUST` for normative requirements
- Avoid `should` or `may` unless intentionally non-normative

### Delta Operations

- `## ADDED Requirements` - New capabilities
- `## MODIFIED Requirements` - Changed behavior
- `## REMOVED Requirements` - Deprecated features
- `## RENAMED Requirements` - Name changes

Headers matched with `trim(header)` - whitespace ignored.

#### When to use ADDED vs MODIFIED
- Use `ADDED` when introducing new capability or sub-capability that stands alone
- Use `ADDED` for orthogonal changes (e.g., adding "Slash Command Configuration")
- Use `MODIFIED` when changing behavior, scope, or acceptance criteria of existing requirement
- Use `RENAMED` when only name changes

Common pitfall: Using MODIFIED to add a new concern without including the previous text. This causes loss of detail at archive time. If you aren’t explicitly changing the existing requirement, add a new requirement under ADDED instead.

For `MODIFIED` requirements:
1. Locate existing requirement in `openspec/specs/<capability>/spec.md`
2. Copy entire requirement block (from `### Requirement: ...` through scenarios)
3. Paste under `## MODIFIED Requirements` and edit to reflect new behavior
4. Ensure header text matches exactly (whitespace-insensitive) with at least one `#### Scenario:`
5. Include full updated content (header + all scenarios) - archiver replaces entire requirement

Common error: Using `MODIFIED` to add new concern without including previous text causes loss of detail. Use `ADDED` instead.

Example for RENAMED:
```markdown
## RENAMED Requirements
- FROM: `### Requirement: Login`
- TO: `### Requirement: User Authentication`
```

## Troubleshooting

### Common Errors

Error: "Change must have at least one delta"
- Check `changes/<change-id>/specs/` exists with .md files
- Verify files have operation prefixes (`## ADDED Requirements`)

Error: "Requirement must have at least one scenario"
- Verify scenarios use `#### Scenario:` format (4 hashtags)
- Do not use bullet points or bold for scenario headers

Error: Silent scenario parsing failures
- Use exact format: `#### Scenario: Name`
- Run `openspec show <change-id> --json --deltas-only` to debug

### Validation Tips

```bash
# Use strict mode for comprehensive checks
openspec validate <change-id> --strict

# Debug delta parsing
openspec show <change-id> --json | jq '.deltas'

# Check specific requirement
openspec show <spec-id> --json -r 1
```

## Happy Path Script

```bash
# 1) Explore current state
openspec spec list --long
openspec list
# Optional full-text search:
# rg -n "Requirement:|Scenario:" openspec/specs
# rg -n "^#|Requirement:" openspec/changes

# 2) Choose change id and scaffold
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## Why\n...\n\n## What Changes\n- ...\n\n## Impact\n- ...\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. Implementation\n- [ ] 1.1 ...\n" > openspec/changes/$CHANGE/tasks.md

# 3) Add deltas (example)
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: Two-Factor Authentication
Users MUST provide a second factor during login.

#### Scenario: OTP required
- **WHEN** valid credentials are provided
- **THEN** an OTP challenge is required
EOF

# 4) Validate
openspec validate $CHANGE --strict
```

## Multi-Capability Example

```
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md   # ADDED: Two-Factor Authentication
    └── notifications/
        └── spec.md   # ADDED: OTP email notification
```

auth/spec.md
```markdown
## ADDED Requirements
### Requirement: Two-Factor Authentication
...
```

notifications/spec.md
```markdown
## ADDED Requirements
### Requirement: OTP Email Notification
...
```

## Best Practices

### Simplicity First
- Default to <100 lines of new code
- Single-file implementations until proven insufficient
- Avoid frameworks without clear justification
- Choose boring, proven patterns

### Complexity Triggers
Add complexity only when:
- Performance data shows current solution too slow
- Concrete scale requirements exist (>1000 users, >100MB data)
- Multiple proven use cases require abstraction

### Clear References
- Use `file.ts:42` format for code locations
- Reference specs as `specs/auth/spec.md`
- Link related changes and PRs

### Capability Naming
- Use verb-noun: `user-auth`, `payment-capture`
- Single purpose per capability
- 10-minute understandability rule
- Split if description needs "AND"

### Change ID Naming
- Use kebab-case, short and descriptive: `add-two-factor-auth`
- Prefer verb-led prefixes: `add-`, `update-`, `remove-`, `refactor-`
- Ensure uniqueness; if taken, append `-2`, `-3`, etc.

## Tool Selection Guide

| Task | Tool | Why |
|------|------|-----|
| Find files by pattern | Glob | Fast pattern matching |
| Search code content | Grep | Optimized regex search |
| Read specific files | Read | Direct file access |
| Explore unknown scope | Task | Multi-step investigation |

## Error Recovery

### Change Conflicts
1. Run `openspec list` to see active changes
2. Check for overlapping specs
3. Coordinate with change owners
4. Consider combining proposals

### Validation Failures
1. Run `openspec validate <change-id> --strict`
2. Run `openspec show <change-id> --json` to check details
3. Verify spec file format matches requirements
4. Verify scenarios use `#### Scenario:` format

### Missing Context
1. Read `openspec/project.md`
2. Run `openspec show <spec>` to check related specs
3. Run `ls openspec/changes/archive` to review recent archives
4. Ask user for clarification

## Quick Reference

### Stage Indicators
- `changes/` - Proposed, not yet built
- `specs/` - Built and deployed
- `archive/` - Completed changes

### File Purposes
- `proposal.md` - Why and what
- `tasks.md` - Implementation steps
- `design.md` - Technical decisions
- `spec.md` - Requirements and behavior

### CLI Essentials
```bash
openspec list                                # List active changes
openspec show <item>                         # View details
openspec validate --strict                   # Validate all
openspec validate <change-id> --strict       # Validate specific change
openspec archive <change-id> [--yes|-y]      # Archive change after merge
```

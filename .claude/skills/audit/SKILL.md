---
name: audit
description: Read-only code quality audit for a Blueprint project. Reviews the active feature, changed files, a selected path, or the full project for maintainability issues such as duplication, dead code, DRY violations, inconsistent patterns, overgrown files or functions, unused exports, missing or disabled tests, standards drift, and obvious security or performance risks. Use when the user runs /audit, invokes $audit, asks to audit the code, review code quality, check for dead code, check for duplicates, clean up a vibe-coded project, or make sure the code still meets project standards.
---

# audit - review code quality against the project standards

Where this sits in the workflow:

    /implement or /autopilot  ->  [audit]  ->  fixes or /complete
    (code exists)                 (read-only   (repair quality issues
                                   review)      or close the feature)

`/check` proves behavior against the spec. `/doctor` checks Blueprint setup and
workflow health. This skill checks the code itself: maintainability, duplication,
dead code, consistency, test coverage for logic, and standards drift.

It is always read-only. It never edits files, installs dependencies, commits,
merges, pushes, or starts product work.

## Input

Optional scope:

- no argument: use `current` when an active feature exists, otherwise use
  `changed` when local changes exist, otherwise use `full`
- `current`: audit the active `current-feature.md`, every committed feature-branch
  change from its merge base through `HEAD`, staged and unstaged changes,
  untracked source files, and nearby code affected by the feature
- `changed`: audit staged, unstaged, and untracked source files plus nearby code
- `full`: audit all project-owned source, tests, and configuration while excluding
  dependencies, generated files, build output, coverage output, caches, vendored
  code, and minified assets unless the user explicitly includes them
- path or directory: audit that area and the tests or callers needed to understand it

If the requested scope is unclear, pick the smallest useful scope and state it.

## Step 1 - gather context

Read:

- `AGENTS.md`
- `blueprint/context/project-overview.md`
- `blueprint/context/coding-standards.md`
- `blueprint/context/current-feature.md`
- `blueprint/context/ai-interaction.md`
- `blueprint/build-plan.md`, when feature order matters
- git branch and working tree status
- relevant source files, tests, and configs for the chosen scope

For `current`, resolve the comparison base without network access:

1. Use a base branch declared by the active spec or project instructions.
2. Otherwise use the locally recorded remote default branch when available.
3. Otherwise use an existing local `main`, then `master`.
4. Find the merge base and inspect the committed delta through `HEAD`, then add
   staged, unstaged, and untracked work.
5. If no reliable base exists, say so and use the active spec plus local changes.
   Never claim that committed feature work was fully covered in that case.

Do not fetch or pull to discover the base. For `full`, state the excluded paths
before reviewing so generated or third-party code does not consume the audit.

Prefer `rg` and targeted file reads. Do not dump large files into the response.

## Step 2 - run available signals

Use existing commands only. Do not install tools.

Run or inspect as appropriate:

- lint command, when declared in `AGENTS.md`
- typecheck command, when declared
- test command, when declared and relevant
- build command, when the audit needs to know if the current code compiles
- existing security or performance commands when declared and locally runnable
- lightweight searches for unused exports, duplicate names, TODO/FIXME, ignored
  errors, unsafe suppressions, empty catch blocks, skipped or focused tests,
  copied logic, and oversized files

If a useful command is missing, report that as a gap. Do not invent a pass.

## Step 3 - review the code

Look for issues that affect long-term maintainability:

- duplicated logic, duplicated components, duplicated styles, or repeated data
  shaping that should share one helper
- dead code, unused files, unused exports, stale comments, unreachable branches,
  and abandoned feature paths
- functions, components, routes, or modules that are too large to review safely
- clever abstractions that do not pay for themselves
- missing abstractions where duplication is already causing risk
- inconsistent project patterns, naming, validation, error handling, or data access
- logic-bearing code without tests when the project has a declared test command
- skipped, focused, or placeholder tests; swallowed failures; and weak assertions
  around important logic
- UI or integration code without real browser evidence when behavior matters
- obvious security issues such as missing auth checks, unsanitized input, trusting
  client-supplied ownership fields, or leaking sensitive data
- obvious performance issues such as N+1 queries, unnecessary client rendering,
  unbounded loops, avoidable repeated network calls, or expensive work in render
- drift from `coding-standards.md`, `project-overview.md`, or the active spec

Do not nitpick harmless style differences unless they signal drift from the local
patterns. Prefer a short list of real findings over a broad list of guesses.

If a possible secret is found, never quote its value, paste the matching source
line, or include raw command output containing it. Report only the redacted secret
category, file, line, risk, and remediation. Redact sensitive values from all
audit evidence before responding.

## Step 4 - report findings

Lead with findings, ordered by severity. Use this shape:

    [P1] Title
    File: path:line
    Why it matters: ...
    Suggested fix: ...

Severity:

- `P0` - data loss, security break, or code that cannot ship
- `P1` - likely bug, broken contract, missing guard, or high-risk duplication
- `P2` - maintainability issue worth fixing before the feature closes
- `P3` - small cleanup, consistency issue, or follow-up candidate

Use P0 or P1 only when a concrete code path, violated contract or security
boundary, failing command or test, or reproducible behavior confirms the risk. If
the evidence is incomplete, list it under `Unverified risks` with the missing
validation instead of presenting it as a confirmed high-severity finding.

If there are no findings, say that clearly and name any remaining risk or missing
signal, such as "no test command declared" or "browser flow not audited."

Then include:

- commands run and results
- selected scope
- base branch, merge base, and commit range for `current`, when available
- files or directories reviewed
- generated, third-party, or otherwise excluded paths
- standards checked
- browser or runtime evidence inspected, when relevant
- skipped, focused, or placeholder tests found
- checks that were unavailable or could not run
- suggested repair order

For `full`, say whether coverage was complete or partial. Never label a partial
review as a full-project audit.

## Rules

- Read-only only. Never edit, format, install, commit, merge, push, or delete.
- Never fetch, pull, or run network-backed audit tools without explicit approval.
- Never reproduce secrets or sensitive values in findings or command output.
- Findings first. Keep summaries short.
- Ground every finding in a file path and line number when possible.
- Avoid speculative rewrites. Recommend the smallest fix that removes the risk.
- Respect existing project patterns over generic advice.
- Do not require perfection. The goal is code that is understandable, consistent,
  testable where it matters, and safe to keep building on.

## Formatting

Format the output to match the project's conventions in
`blueprint/context/ai-interaction.md`: concise, scannable markdown, with lists for
enumerations and tables for matrices rather than dense paragraphs.

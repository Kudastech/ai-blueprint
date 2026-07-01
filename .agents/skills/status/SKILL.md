---
name: status
description: Show where the project stands - build-plan progress, the current feature's checked/unchecked steps, and git state (branch, uncommitted changes, last commit) - in a short "you are here" summary. Read-only: it never edits files, commits, or builds. Use when the user runs /status, asks where things stand, what's next, what's in progress, or is picking work back up after a break or a context clear.
---

# status - where the project stands right now

Where this sits in the workflow:

    any time  ->  [status]  ->  reads build-plan + current-feature + git
                  (read-only)   prints a short "you are here"

This skill answers one question: *where am I?* It reads the files that already
track progress and prints a short orientation. It is the fast way back in after a
break, a context clear, or a day away. It never changes anything - no edits, no
commits, no build.

Progress in this workflow lives in files, not the chat, so everything this skill
reports comes from disk and git. That is the point: a fresh session can run
`/status` and know exactly as much as the last one did.

## Input

None. `/status` takes no argument.

## What it reads

Gather these, then summarize. Don't dump file contents; report the distilled
state.

1. **Build plan** - `blueprint/build-plan.md`. Count checked vs unchecked items.
   Name the next unchecked leaf (the same target `/feature` would pick), and note
   if a parent item was split into sub-items (`4a`, `4b`, ...).
2. **Current feature** - `blueprint/context/current-feature.md`. Is something in
   progress, or is it the reset stub? If a spec is present, report its name, which
   build steps are checked, and the first unchecked step (where `/implement`
   resumes).
3. **Git** - current branch, whether the working tree is clean or has uncommitted
   changes (and roughly how many files), the last commit subject, and whether the
   branch is ahead of its remote. If the directory isn't a git repo, say so and
   skip this part rather than failing.

## Output

A short, scannable summary - not a wall of text. Aim for something like:

    On feature 4 (PDF export), branch feature/pdf-export.
    Steps: 2 of 3 done. Next: Step 3 - Download PDF button.
    Git: 3 uncommitted files, last commit "feat: widen download helper to png|pdf".
    Build plan: 3 of 9 features complete.

    Next action: run /implement to build Step 3.

End with a single suggested next action, chosen from what the state implies:

- A spec is in progress with unchecked steps -> `/implement` (name the step).
- `current-feature.md` is the reset stub -> `/feature` for the next build-plan item
  (name it).
- All build-plan items checked -> say so; suggest the next milestone (for example
  deploy) or a new plan.
- Work is built and steps are all checked but not merged -> `/complete`.

If something is off - on `main` with uncommitted feature work, a spec in progress
but no matching branch, the build plan and current feature disagreeing - flag it in
one line. Catching that drift is half the value of the command.

## Rules

- **Read-only, always.** This skill never writes a file, never commits, never runs
  a build or tests, never switches branches. If the user wants to act on what it
  reports, they run the relevant skill next.
- **Distill, don't dump.** Report the state in a few lines; don't paste file
  contents back.
- **Be honest about gaps.** If a file is missing or the repo isn't initialized, say
  that plainly instead of guessing.

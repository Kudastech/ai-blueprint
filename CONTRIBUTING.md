# Contributing

AI Blueprint ships workflow files and a dependency-free Node.js installer. The
repository validation gate requires Node.js 18 or newer and does not require an
install step.

## Validation commands

| Command | Purpose |
| --- | --- |
| `npm run check` | Run the complete repository gate used by CI. |
| `npm run check:static` | Check adapter parity, command inventories, imports, references, and package metadata. |
| `npm test` | Run the installer unit tests. |
| `npm run test:package` | Pack the npm artifact and smoke-test Codex, Claude, and combined installs. |

Run `npm run check` before opening or merging a pull request. The package smoke
test builds the installer template, packs it into a temporary directory, installs
that artifact locally, verifies all three adapter modes, and removes its temporary
files.

## Workflow changes

Shared skills under `.agents/skills/` and `.claude/skills/` must remain identical.
Add or remove a command in both adapter trees, the `AGENTS.md` command inventory,
and the README command table in the same change. The validation gate rejects any
drift between those surfaces.

The root `package.json`, `scripts/`, `.github/`, and this guide are maintainer
files. They are not copied into applications by `create-ai-blueprint`.

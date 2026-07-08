# create-ai-blueprint

Install the AI Coding Blueprint into an already scaffolded app.

```bash
npx create-ai-blueprint@latest
```

You can also use npm's initializer form:

```bash
npm create ai-blueprint@latest
```

The installer copies the Blueprint workflow files into the current directory:

- `AGENTS.md`
- `CLAUDE.md`
- `.agents/`
- `.claude/`
- `blueprint/`

It keeps the app's root `README.md` alone and installs the Blueprint workflow
docs at `blueprint/README.md`.

The installed workflow includes optional Render and Vercel deployment readiness
through `/release` or `$release`; it prepares local config and checks, but does
not deploy without explicit approval.

If you install the Blueprint while Claude Code is already open in the project,
restart Claude Code in that folder so the newly added project skills appear.

## Options

```bash
npx create-ai-blueprint@latest -- --codex
npx create-ai-blueprint@latest -- --claude
npx create-ai-blueprint@latest -- --both
npx create-ai-blueprint@latest -- --force
npx create-ai-blueprint@latest -- --target ./my-app
```

The same flags work with `npm create ai-blueprint@latest -- ...`.

Use `--force` to overwrite existing Blueprint files. Without `--force`, the
installer asks before overwriting in an interactive terminal and exits in
non-interactive runs.

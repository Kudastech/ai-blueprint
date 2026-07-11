#!/usr/bin/env node

const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");

const packageRoot = path.resolve(__dirname, "..");
const templateRoot = path.join(packageRoot, "template");

const adapterChoices = new Set(["codex", "claude", "both"]);

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.version) {
    console.log(readPackageVersion());
    return;
  }

  if (!fsSync.existsSync(templateRoot)) {
    throw new Error(
      "Installer template is missing. Run `npm run prepare-template` before local testing."
    );
  }

  const targetDir = path.resolve(process.cwd(), options.target || ".");
  const adapter = await resolveAdapter(options);
  const entries = getTemplateEntries(adapter);
  const existingEntries = entries.filter((entry) =>
    fsSync.existsSync(path.join(targetDir, entry.target))
  );

  if (options.dryRun) {
    printPlan(targetDir, adapter, entries, existingEntries);
    return;
  }

  await confirmOverwrite(existingEntries, options);

  for (const entry of entries) {
    await copyTemplateEntry(entry, targetDir);
  }

  printSuccess(targetDir, adapter, entries, existingEntries);
}

function parseArgs(args) {
  const options = {
    adapter: null,
    dryRun: false,
    force: false,
    help: false,
    target: null,
    version: false,
    yes: false
  };

  const modeFlags = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "init") {
      continue;
    }

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      options.version = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force" || arg === "-f") {
      options.force = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--codex" || arg === "--claude" || arg === "--both") {
      modeFlags.push(arg.slice(2));
      continue;
    }

    if (arg === "--target" || arg === "-t") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`${arg} needs a directory path.`);
      }
      options.target = next;
      index += 1;
      continue;
    }

    if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (modeFlags.length > 1) {
    throw new Error("Choose only one adapter option: --codex, --claude, or --both.");
  }

  options.adapter = modeFlags[0] || null;
  return options;
}

async function resolveAdapter(options) {
  if (options.adapter) {
    return options.adapter;
  }

  if (options.yes || !process.stdin.isTTY) {
    return "both";
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question(
      "Install which adapters? [1] Codex, [2] Claude Code, [3] both (default): "
    );

    const normalized = answer.trim().toLowerCase();

    if (normalized === "" || normalized === "3" || normalized === "both") {
      return "both";
    }

    if (normalized === "1" || normalized === "codex") {
      return "codex";
    }

    if (
      normalized === "2" ||
      normalized === "claude" ||
      normalized === "claude code"
    ) {
      return "claude";
    }

    throw new Error("Choose 1, 2, or 3.");
  } finally {
    rl.close();
  }
}

function getTemplateEntries(adapter) {
  if (!adapterChoices.has(adapter)) {
    throw new Error(`Unknown adapter mode: ${adapter}`);
  }

  const entries = [
    { source: "AGENTS.md", target: "AGENTS.md" },
    { source: "blueprint", target: "blueprint" }
  ];

  if (adapter === "codex" || adapter === "both") {
    entries.push({ source: ".agents", target: ".agents" });
  }

  if (adapter === "claude" || adapter === "both") {
    entries.push({ source: "CLAUDE.md", target: "CLAUDE.md" });
    entries.push({ source: ".claude", target: ".claude" });
  }

  return entries;
}

async function confirmOverwrite(existingEntries, options) {
  if (existingEntries.length === 0 || options.force) {
    return;
  }

  if (options.yes || !process.stdin.isTTY) {
    throw new Error(
      `Existing Blueprint files found: ${existingEntries
        .map((entry) => entry.target)
        .join(", ")}. Re-run with --force to overwrite them.`
    );
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log("Existing Blueprint files found:");
    for (const entry of existingEntries) {
      console.log(`- ${entry.target}`);
    }

    const answer = await rl.question("Overwrite matching Blueprint files? [y/N] ");

    if (!["y", "yes"].includes(answer.trim().toLowerCase())) {
      throw new Error("Install cancelled.");
    }
  } finally {
    rl.close();
  }
}

async function copyTemplateEntry(entry, targetDir) {
  const source = path.join(templateRoot, entry.source);
  const target = path.join(targetDir, entry.target);
  await copyPath(source, target);
}

async function copyPath(source, target) {
  const stats = await fs.stat(source);

  if (stats.isDirectory()) {
    await fs.mkdir(target, { recursive: true });
    const children = await fs.readdir(source);

    for (const child of children) {
      await copyPath(path.join(source, child), path.join(target, child));
    }

    return;
  }

  if (stats.isFile()) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
}

function printPlan(targetDir, adapter, entries, existingEntries) {
  console.log(`Target: ${targetDir}`);
  console.log(`Adapters: ${adapter}`);
  console.log("Would copy:");

  for (const entry of entries) {
    console.log(`- ${entry.target}`);
  }

  if (existingEntries.length > 0) {
    console.log("Would overwrite matching files under:");
    for (const entry of existingEntries) {
      console.log(`- ${entry.target}`);
    }
  }
}

function printSuccess(targetDir, adapter, entries, existingEntries) {
  console.log("AI Blueprint installed.");
  console.log(`Target: ${targetDir}`);
  console.log(`Adapters: ${adapter}`);
  console.log("Copied:");

  for (const entry of entries) {
    console.log(`- ${entry.target}`);
  }

  if (existingEntries.length > 0) {
    console.log("Overwrote matching Blueprint files where paths already existed.");
  }

  console.log("");
  console.log("Your app README was left alone.");
  console.log("Blueprint docs are at blueprint/README.md.");
  console.log("");
  console.log("Next:");
  console.log(getNextCommand(adapter));
  printClaudeRestartNote(adapter);
  console.log(
    "If a different skill loads, tell the agent to follow the local Blueprint skill file directly."
  );
}

function getNextCommand(adapter) {
  if (adapter === "codex") {
    return "$onboard";
  }

  if (adapter === "claude") {
    return "/onboard";
  }

  return "$onboard or /onboard";
}

function printClaudeRestartNote(adapter) {
  if (adapter === "codex") {
    return;
  }

  console.log(
    "Claude Code: if this project was already open, restart Claude Code in this folder so /onboard appears."
  );
}

function printHelp() {
  console.log(`create-ai-blueprint

Install AI Blueprint into an already scaffolded app.

Usage:
  npx create-ai-blueprint@latest
  npx create-ai-blueprint@latest -- --codex
  npx create-ai-blueprint@latest -- --claude
  npx create-ai-blueprint@latest -- --both

Options:
  --codex          Install AGENTS.md, .agents/, and blueprint/
  --claude         Install AGENTS.md, CLAUDE.md, .claude/, and blueprint/
  --both           Install both Codex and Claude Code adapters
  --target, -t     Target directory, defaults to the current directory
  --force, -f      Overwrite matching Blueprint files without prompting
  --yes, -y        Use defaults in non-interactive installs
  --dry-run        Print what would be copied without writing files
  --help, -h       Show help
  --version, -v    Show package version`);
}

function readPackageVersion() {
  const packageJson = fsSync.readFileSync(
    path.join(packageRoot, "package.json"),
    "utf8"
  );
  return JSON.parse(packageJson).version;
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});

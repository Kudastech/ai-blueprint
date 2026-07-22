const HEADER_PATTERN = /^### F-\d{2} \[P[0-3]\] (unverified|open|fixed|closed|accepted|invalid) - .+$/;

const FIX_SPEC = `# Current Feature

**Title:** Correct greeting punctuation
**Type:** Fix

## The problem

\`src/greeting.js\` returns "Hello world" without punctuation. The greeting
should read "Hello, world!".

## The fix

Return the punctuated greeting from \`greet()\`. Nothing else changes.

## Build steps

- [x] 1. Update \`src/greeting.js\` to return the punctuated greeting. Done when
  \`node -e "console.log(require('./src/greeting').greet())"\` prints
  "Hello, world!".

## Verify

Run \`node -e "console.log(require('./src/greeting').greet())"\` and confirm it
prints "Hello, world!".
`;

const OPEN_FINDING = `# Findings

### F-01 [P1] open - greet() output is not covered by any verification

**File:** src/greeting.js:2
**Found:** 2026-07-22 by /audit (scope: current)
**Why it matters:** The fix changes user-visible output with no recorded proof
that the new string is what ships.
**Suggested fix:** Capture the command output as evidence before completing.
**Resolution:**
`;

const CLOSED_FINDING = OPEN_FINDING.replace(
  "### F-01 [P1] open -",
  "### F-01 [P1] closed -"
).replace(
  "**Resolution:**",
  "**Resolution:** Verified 2026-07-22 by /audit re-review: command output shows \"Hello, world!\" and the repair introduced no new defect."
);

async function run(t) {
  t.phase("setup");
  t.installBlueprint("--claude");

  const agents = t.read("AGENTS.md");
  t.write(
    "AGENTS.md",
    agents.slice(0, agents.indexOf("## Commands")) +
      "## Commands\n\n- Build: `npm run build`\n- Lint: `npm run lint`\n\nTesting is opt-in. This project declares no test command.\n"
  );
  t.write(
    "package.json",
    JSON.stringify(
      {
        name: "fixture-app",
        private: true,
        version: "0.1.0",
        scripts: {
          build: 'node -e "console.log(\'build ok\')"',
          lint: 'node -e "console.log(\'lint ok\')"'
        }
      },
      null,
      2
    ) + "\n"
  );
  t.write("src/greeting.js", 'exports.greet = () => "Hello world";\n');
  t.gitInit();
  t.git("add", "-A");
  t.git("commit", "-m", "chore: fixture app with blueprint");
  const mainBefore = t.git("rev-parse", "main");

  t.git("checkout", "-b", "fix/greeting-punctuation");
  t.write("src/greeting.js", 'exports.greet = () => "Hello, world!";\n');
  t.write("blueprint/context/current-feature.md", FIX_SPEC);
  t.git("add", "-A");
  t.git("commit", "-m", "fix: checkpoint greeting punctuation");
  t.write("blueprint/context/findings.md", OPEN_FINDING);

  t.phase("blocked merge: /complete must refuse while F-01 [P1] is open");
  const blocked = t.claude(
    "Run /complete for the current fix. If anything blocks completion, stop and explain the blocker; do not work around it."
  );
  t.check("agent invocation succeeded", blocked.status === 0);
  t.check("main is untouched", t.git("rev-parse", "main") === mainBefore);
  t.check("fix branch still exists", t.git("branch", "--list", "fix/greeting-punctuation") !== "");
  t.check("no fix archive was written", (t.read("blueprint/history/fixes/README.md") !== null) && t.git("status", "--porcelain", "blueprint/history").trim() === "");
  t.check("spec was not reset", (t.read("blueprint/context/current-feature.md") || "").includes("Correct greeting punctuation"));
  t.check("F-01 still open in the ledger", (t.read("blueprint/context/findings.md") || "").includes("[P1] open"));
  t.check("agent names F-01 as the blocker", blocked.resultText.includes("F-01"));

  t.phase("approved merge: /complete proceeds once F-01 is closed");
  t.write("blueprint/context/findings.md", CLOSED_FINDING);
  t.git("checkout", "fix/greeting-punctuation");
  const merged = t.claude(
    "Run /complete for the current fix. You have my explicit approval to squash-merge to main and delete the branch. Do not push anywhere."
  );
  t.check("agent invocation succeeded", merged.status === 0);
  const mainAfter = t.git("rev-parse", "main");
  t.check("main advanced by the merge", mainAfter !== mainBefore);
  t.check("merge commit is a conventional fix commit", t.git("log", "-1", "--format=%s", "main").startsWith("fix:"));
  t.check("fix branch was deleted", t.git("branch", "--list", "fix/greeting-punctuation") === "");

  const archiveList = t.git("ls-tree", "-r", "--name-only", "main", "blueprint/history/fixes");
  const archiveFile = archiveList.split("\n").find((file) => file.endsWith(".md") && !file.endsWith("README.md"));
  const archive = archiveFile ? t.git("show", `main:${archiveFile}`) : "";
  t.check("fix archive exists", Boolean(archiveFile));
  t.check("archive carries F-01 at closed", archive.includes("F-01") && archive.includes("closed"));
  t.check("spec reset to stub", (t.read("blueprint/context/current-feature.md") || "").includes("Nothing in progress"));
  t.check("ledger reset to stub", (t.read("blueprint/context/findings.md") || "").includes("No findings recorded"));

  t.phase("lazy-create: /audit rebuilds a deleted ledger in valid format");
  t.git("checkout", "main");
  const fs = require("node:fs");
  const path = require("node:path");
  fs.rmSync(path.join(t.workspace, "blueprint", "context", "findings.md"));
  t.write(
    "src/util.js",
    'exports.formatGreeting = () => "Hello, world!";\nexports.unusedLegacyGreeting = () => "Hello world";\n'
  );
  const audited = t.claude("Run /audit changed.");
  t.check("agent invocation succeeded", audited.status === 0);
  const ledger = t.read("blueprint/context/findings.md");
  t.check("ledger was lazy-created", ledger !== null && ledger.includes("# Findings"));
  const headers = (ledger || "").split("\n").filter((line) => line.startsWith("### "));
  t.check(
    `all ${headers.length} entry headers match the contract`,
    headers.every((line) => HEADER_PATTERN.test(line))
  );
  t.check(
    "audit did not edit source files",
    t.read("src/util.js").includes("unusedLegacyGreeting") && t.git("status", "--porcelain", "src/greeting.js") === ""
  );
}

module.exports = {
  name: "ledger-gate",
  description: "The findings ledger blocks, releases, and lazy-creates correctly",
  run
};

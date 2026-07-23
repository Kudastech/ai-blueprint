const fs = require("node:fs");
const path = require("node:path");
const { Runner, ensureClaudeAvailable } = require("./harness");

const scenariosDir = path.join(__dirname, "scenarios");

async function main() {
  if (process.env.E2E_ACCEPT_RISK !== "1") {
    console.error(
      "This harness drives a live agent with --dangerously-skip-permissions in a\n" +
        "scratch workspace on this machine, and it spends real tokens.\n" +
        "Run it as: E2E_ACCEPT_RISK=1 npm run test:e2e"
    );
    process.exit(1);
  }

  ensureClaudeAvailable();

  const available = fs
    .readdirSync(scenariosDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => file.replace(/\.js$/, ""))
    .sort();
  const requested = process.argv.slice(2);

  for (const name of requested) {
    if (!available.includes(name)) {
      throw new Error(`Unknown scenario: ${name}. Available: ${available.join(", ")}`);
    }
  }

  const selected = requested.length > 0 ? requested : available;
  let failures = 0;

  for (const name of selected) {
    const scenario = require(path.join(scenariosDir, `${name}.js`));
    console.log(`\n=== Scenario: ${scenario.name} - ${scenario.description} ===`);
    const runner = new Runner(scenario.name);

    try {
      await scenario.run(runner);
    } catch (error) {
      runner.check(`scenario ran without harness errors (${error.message})`, false);
    }

    failures += runner.report();
  }

  if (failures > 0) {
    console.error(`\nE2E failed: ${failures} check(s) did not pass.`);
    process.exit(1);
  }

  console.log("\nE2E passed.");
}

main().catch((error) => {
  console.error(`E2E harness error: ${error.message}`);
  process.exit(1);
});

import { upsertSourceRegistrySeed } from "../../src/lib/data/bootstrap";

async function main() {
  await upsertSourceRegistrySeed();
  console.log("Seeded source_registry from the typed source registry model.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

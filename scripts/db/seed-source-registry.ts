import { upsertSourceRegistrySeed } from "../../src/lib/data/bootstrap";
import { sql } from "@/db/client";

async function main() {
  try {
    await upsertSourceRegistrySeed();
    console.log("Seeded source_registry from the typed source registry model.");
  } finally {
    await sql?.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

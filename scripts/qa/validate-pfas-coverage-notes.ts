export {};

type ExplorerCoverageNote = {
  id: string;
  title: string;
  body: string;
};

type ExplorerNearbyResponse = {
  total: number;
  coverageNotes: ExplorerCoverageNote[];
};

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

async function waitForApiHealth(baseUrl: string) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health probe returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }

  const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`API health probe failed: ${lastMessage}`);
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

  await waitForApiHealth(baseUrl);

  const nearby = await fetchJson<ExplorerNearbyResponse>(
    baseUrl,
    "/api/nearby?lat=34.98&lng=-78.88&radius=50&groups=official,emerging,legal",
  );

  const chemoursNote = nearby.coverageNotes.find((note) => /chemours/i.test(note.title));
  if (!chemoursNote) {
    throw new Error("Expected Cape Fear nearby response to include a Chemours PFAS coverage note.");
  }

  if (!/nearest loaded official PFAS record/i.test(chemoursNote.body)) {
    throw new Error("Expected Chemours coverage note to explain the nearest loaded official PFAS record.");
  }

  if (!/GenX-bearing/i.test(chemoursNote.body)) {
    throw new Error("Expected Chemours coverage note to mention the nearest loaded GenX-bearing sample.");
  }

  if (!/closer geocoded Chemours-edge sample\/site/i.test(chemoursNote.body)) {
    throw new Error("Expected Chemours coverage note to explain the official source coverage limit.");
  }

  console.log("PASS PFAS coverage note validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        total: nearby.total,
        chemoursNote,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL PFAS coverage note validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

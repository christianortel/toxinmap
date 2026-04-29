export {};

const requiredChecks = [
  { path: "/", contains: ["toxinmap.com"] },
  { path: "/explore", contains: ["toxinmap.com"] },
  { path: "/sources", contains: ["A source registry built for auditability, caveats, and real ingest replacement."] },
  { path: "/case-studies", contains: ["Case studies"] },
  { path: "/case-studies/cape-fear-pfas-plume", contains: ["Cape Fear PFAS plume"] },
  {
    path: "/explore?entity=cape-fear-warning-story&year=2024&groups=official,emerging,legal",
    contains: ["toxinmap.com"],
  },
  {
    path: "/explore?q=PFAS&year=2024&groups=official,emerging,legal",
    contains: ["toxinmap.com"],
  },
];

const apiChecks = [
  { path: "/api/entities?layerId=pfas-sites&limit=5", expectArray: true },
  { path: "/api/sources", expectArray: true },
  { path: "/api/case-studies", expectArray: true },
  { path: "/api/nearby?lat=34.22&lng=-78.75&radius=100&groups=official,emerging,legal", expectObjectKeys: ["total", "results"] },
  {
    path: "/api/geocode?q=1600%20Pennsylvania%20Ave%20NW,%20Washington,%20DC",
    expectObjectKeys: ["label", "coordinates"],
  },
];

async function assertPage(baseUrl: string, path: string, expectedSnippets: string[]) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  const html = await response.text();
  for (const snippet of expectedSnippets) {
    if (!html.includes(snippet)) {
      throw new Error(`Expected ${path} to include "${snippet}"`);
    }
  }
}

async function assertApi(
  baseUrl: string,
  path: string,
  options: { expectArray?: boolean; expectObjectKeys?: string[] },
) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  const payload = await response.json();
  if (options.expectArray && !Array.isArray(payload)) {
    throw new Error(`Expected ${path} to return an array payload.`);
  }
  if (options.expectObjectKeys) {
    for (const key of options.expectObjectKeys) {
      if (!(key in payload)) {
        throw new Error(`Expected ${path} payload to include key "${key}".`);
      }
    }
  }
}

async function main() {
  const baseUrl = process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  for (const check of requiredChecks) {
    await assertPage(baseUrl, check.path, check.contains);
    console.log(`PASS ${check.path}`);
  }

  for (const check of apiChecks) {
    await assertApi(baseUrl, check.path, check);
    console.log(`PASS ${check.path}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

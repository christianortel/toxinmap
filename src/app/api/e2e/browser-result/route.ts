import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

const browserResultSchema = z.object({
  runId: z.string().min(1),
  status: z.enum(["running", "pass", "fail"]),
  step: z.string().min(1),
  message: z.string().min(1),
  payload: z.string(),
});

function getBrowserResultDirectory() {
  return join(process.cwd(), ".local", "browser-e2e");
}

function getBrowserResultPath(runId: string) {
  return join(getBrowserResultDirectory(), `${runId}.json`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "Missing runId." }, { status: 400 });
  }

  try {
    const raw = await readFile(getBrowserResultPath(runId), "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Result not found." }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const parsed = browserResultSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid browser e2e payload.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const resultDirectory = getBrowserResultDirectory();
  await mkdir(resultDirectory, { recursive: true });
  await writeFile(
    getBrowserResultPath(parsed.data.runId),
    JSON.stringify(
      {
        ...parsed.data,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  return NextResponse.json({ ok: true });
}

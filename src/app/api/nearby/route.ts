import { NextResponse } from "next/server";
import { parseNearbyQuery } from "@/lib/data/query-params";
import { getNearbyEntities } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseNearbyQuery(searchParams);

  if (!query) {
    return NextResponse.json({ error: "Invalid nearby query" }, { status: 400 });
  }

  return NextResponse.json(
    await getNearbyEntities({
      ...query,
      label: searchParams.get("label")?.trim() || undefined,
    }),
  );
}

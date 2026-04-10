import { NextResponse } from "next/server";
import { parseEntityQuery } from "@/lib/data/query-params";
import { getEntities } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseEntityQuery(searchParams);

  return NextResponse.json(await getEntities(query));
}

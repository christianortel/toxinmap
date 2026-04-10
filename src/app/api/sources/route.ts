import { NextResponse } from "next/server";
import { parseSourceQuery } from "@/lib/data/query-params";
import { getSources } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseSourceQuery(searchParams);

  return NextResponse.json(await getSources(query));
}

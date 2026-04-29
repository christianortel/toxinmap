import { NextResponse } from "next/server";
import { getCaseStudies, getEntities } from "@/lib/data/repository";
import { getExplorerSearchResults } from "@/lib/map/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json([]);
  }

  const [entities, caseStudies] = await Promise.all([getEntities(), getCaseStudies()]);
  return NextResponse.json(getExplorerSearchResults(query, entities, caseStudies));
}

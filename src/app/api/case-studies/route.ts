import { NextResponse } from "next/server";
import { parseCaseStudyQuery } from "@/lib/data/query-params";
import { getCaseStudies } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseCaseStudyQuery(searchParams);

  return NextResponse.json(await getCaseStudies(query));
}

import { NextResponse } from "next/server";
import { getCaseStudyBySlug, getSourcesByIds } from "@/lib/data/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const study = await getCaseStudyBySlug(slug);

  if (!study) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...study,
    sources: await getSourcesByIds(study.sourceIds),
  });
}

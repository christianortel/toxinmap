import { NextResponse } from "next/server";
import { getEntityDetail } from "@/lib/data/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entity = await getEntityDetail(id);

  if (!entity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(entity);
}

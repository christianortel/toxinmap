import { NextResponse } from "next/server";
import { getLayerSummaries } from "@/lib/data/repository";

export async function GET() {
  return NextResponse.json(await getLayerSummaries());
}

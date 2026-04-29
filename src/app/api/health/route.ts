import { NextResponse } from "next/server";
import { getLayerSummaries, getRepositoryHealth } from "@/lib/data/repository";

export async function GET() {
  const [repositoryHealth, layerSummaries] = await Promise.all([
    getRepositoryHealth(),
    getLayerSummaries(),
  ]);

  const totalEntityCount = layerSummaries.reduce(
    (sum, layerSummary) => sum + layerSummary.entityCount,
    0,
  );

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    repository: repositoryHealth,
    layers: {
      totalLayers: layerSummaries.length,
      totalEntities: totalEntityCount,
      counts: layerSummaries.map((layerSummary) => ({
        id: layerSummary.id,
        entityCount: layerSummary.entityCount,
      })),
    },
  });
}

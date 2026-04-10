import { NextResponse } from "next/server";

const CENSUS_GEOCODER_URL =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const geocoderParams = new URLSearchParams({
    address: query,
    benchmark: "Public_AR_Current",
    format: "json",
  });

  const response = await fetch(`${CENSUS_GEOCODER_URL}?${geocoderParams.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Geocoder unavailable" }, { status: 502 });
  }

  const payload = (await response.json()) as {
    result?: {
      addressMatches?: Array<{
        matchedAddress: string;
        coordinates: {
          x: number;
          y: number;
        };
        tigerLine?: {
          side?: string;
        };
      }>;
    };
  };

  const match = payload.result?.addressMatches?.[0];

  if (!match) {
    return NextResponse.json({ error: "No U.S. location match found" }, { status: 404 });
  }

  return NextResponse.json({
    label: match.matchedAddress,
    coordinates: [match.coordinates.x, match.coordinates.y],
    confidence: match.tigerLine?.side ? "high" : "moderate",
    source: "U.S. Census Geocoder",
  });
}

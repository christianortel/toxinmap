import { NextResponse } from "next/server";
import { parseEntityQuery } from "@/lib/data/query-params";
import { getEntities } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseEntityQuery(searchParams);
  const entities = await getEntities(query);

  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index === 0) {
        controller.enqueue(encoder.encode("["));
      }

      if (index >= entities.length) {
        controller.enqueue(encoder.encode("]"));
        controller.close();
        return;
      }

      const prefix = index === 0 ? "" : ",";
      controller.enqueue(encoder.encode(`${prefix}${JSON.stringify(entities[index])}`));
      index += 1;
    },
  });

  return new NextResponse(stream, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

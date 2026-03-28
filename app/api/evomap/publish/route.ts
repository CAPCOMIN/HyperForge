import { NextResponse } from "next/server";
import type { CapsulePayload, GenePayload } from "@/lib/types/domain";
import { publishBundleSchema } from "@/lib/types/api";
import { publishAssets } from "@/lib/evomap/publish";

export async function POST(request: Request) {
  const body = await request.json();
  const input = publishBundleSchema.parse(body);
  const result = await publishAssets(
    input.assets as Array<GenePayload | CapsulePayload>
  );
  return NextResponse.json(result);
}

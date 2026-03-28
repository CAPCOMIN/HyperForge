import { NextResponse } from "next/server";
import { fetchRequestSchema } from "@/lib/types/api";
import { fetchAssets } from "@/lib/evomap/fetch";

export async function POST(request: Request) {
  const body = await request.json();
  const input = fetchRequestSchema.parse(body);
  const result = await fetchAssets(input);
  return NextResponse.json(result);
}

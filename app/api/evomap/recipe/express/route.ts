import { NextResponse } from "next/server";
import { recipeExpressSchema } from "@/lib/types/api";
import { expressRecipe } from "@/lib/evomap/recipe";

export async function POST(request: Request) {
  const body = await request.json();
  const input = recipeExpressSchema.parse(body);
  const result = await expressRecipe(input.recipeId, input.ttl);
  return NextResponse.json(result);
}

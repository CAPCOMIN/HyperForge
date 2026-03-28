import { NextResponse } from "next/server";
import { recipeCreateSchema } from "@/lib/types/api";
import { createRecipeAndPublish } from "@/lib/evomap/recipe";

export async function POST(request: Request) {
  const body = await request.json();
  const input = recipeCreateSchema.parse(body);
  const result = await createRecipeAndPublish(input);
  return NextResponse.json(result);
}

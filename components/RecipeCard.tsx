import type { OrganismRun, RecipeDraft } from "@/lib/types/domain";

export function RecipeCard({
  recipe,
  organism
}: {
  recipe: RecipeDraft;
  organism: OrganismRun | null;
}) {
  return (
    <article className="rounded-2xl border border-line bg-mist p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            Recipe
          </p>
          <h3 className="mt-1 text-base font-semibold">{recipe.title}</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-steel">
          {recipe.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-steel">{recipe.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {recipe.genes.map((gene) => (
          <span key={gene.geneAssetId} className="rounded-full bg-white px-3 py-1 text-xs text-steel">
            #{gene.position} {gene.geneAssetId.slice(0, 18)}...
          </span>
        ))}
      </div>
      {organism ? (
        <div className="mt-4 rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            Organism
          </p>
          <div className="mt-2 grid gap-2 text-sm text-steel">
            <p>ID: {organism.evomapOrganismId ?? organism.id}</p>
            <p>Status: {organism.status}</p>
            <p>
              Progress: {organism.genesExpressed}/{organism.genesTotalCount}
            </p>
            <p>TTL: {organism.ttl}s</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

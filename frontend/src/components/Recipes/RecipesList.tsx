import type { Recipe } from "@/client"
import RecipeCard from "./RecipeCard"

interface RecipesListProps {
  recipes: Array<Recipe>
}

export function RecipesList({ recipes }: RecipesListProps) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <div
        key={recipes.map((r) => r.id).join("-")}
        className="stagger-children gap-4 grid grid-cols-2 sm:flex sm:flex-wrap p-1"
      >
        {recipes?.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  )
}

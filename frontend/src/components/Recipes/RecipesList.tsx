import type { Recipe } from "@/client"
import RecipeCard from "./RecipeCard"

interface RecipesListProps {
  recipes: Array<Recipe>
}

export function RecipesList({ recipes }: RecipesListProps) {
  return (
    <div
      key={recipes.map((r) => r.id).join("-")}
      className="stagger-children grid justify-center gap-4 p-1 [grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(12rem,1fr))]"
    >
      {recipes?.map((recipe) => (
        <div key={recipe.id} className="flex justify-center">
          <RecipeCard recipe={recipe} />
        </div>
      ))}
    </div>
  )
}

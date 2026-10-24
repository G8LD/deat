import type { Recipe } from "@/client"
import RecipeCard from "./RecipeCard"

interface RecipesListProps {
  recipes: Array<Recipe>
  fixedColumns?: boolean
}

export function RecipesList({ recipes }: RecipesListProps) {
  return (
    <div
      key={recipes.map((r) => r.id).join("-")}
      className="stagger-children grid gap-4 p-1 w-full [grid-template-columns:repeat(auto-fill,minmax(11rem,13.5rem))] justify-center"
    >
      {recipes?.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} className="w-full h-full" />
      ))}
    </div>
  )
}

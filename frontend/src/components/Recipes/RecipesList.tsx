import type { Recipe } from "@/client"
import RecipeCard from "./RecipeCard"

interface RecipesListProps {
  recipes: Array<Recipe>
  fixedColumns?: boolean
  className?: string
}

export function RecipesList({ recipes, className = "" }: RecipesListProps) {
  return (
    <div
      key={recipes.map((r) => r.id).join("-")}
      className={`stagger-children grid justify-center gap-4 p-1 w-full [grid-template-columns:repeat(auto-fill,10rem)] lg:[grid-template-columns:repeat(auto-fill,13.75rem)] ${className}`}
    >
      {recipes?.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  )
}

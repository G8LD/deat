import type { Recipe } from "@/client"
import RecipeCard from "./RecipeCard"

interface RecipesListProps {
  recipes: Array<Recipe>
  fixedColumns?: boolean
}

const FIXED_COLS_CLASSES = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
const AUTO_COLS_CLASSES =
  "[grid-template-columns:repeat(auto-fill,minmax(11rem,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]"

export function RecipesList({ recipes, fixedColumns = false }: RecipesListProps) {
  return (
    <div
      key={recipes.map((r) => r.id).join("-")}
      className={`stagger-children grid gap-4 p-1 w-full ${fixedColumns ? FIXED_COLS_CLASSES : AUTO_COLS_CLASSES}`}
    >
      {recipes?.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} className="w-full h-full" />
      ))}
    </div>
  )
}

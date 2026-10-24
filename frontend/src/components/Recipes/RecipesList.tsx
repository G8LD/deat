import type { Recipe } from "@/client"
import RecipeCard from "./RecipeCard"

interface RecipesListProps {
  recipes: Array<Recipe>
  /**
   * When true, use a fixed responsive column count so every row holds the same
   * number of cards (no half-empty auto-fill rows). Otherwise the grid auto-fills
   * as many columns as fit the viewport.
   */
  fixedColumns?: boolean
}

// Fixed column counts per breakpoint (used when fixedColumns is set).
const FIXED_COLS_CLASSES = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
// Auto-fill as many columns as fit (default).
const AUTO_COLS_CLASSES =
  "[grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(12rem,1fr))]"

export function RecipesList({ recipes, fixedColumns = false }: RecipesListProps) {
  return (
    <div
      key={recipes.map((r) => r.id).join("-")}
      className={`stagger-children grid justify-center gap-4 p-1 ${fixedColumns ? FIXED_COLS_CLASSES : AUTO_COLS_CLASSES}`}
    >
      {recipes?.map((recipe) => (
        <div key={recipe.id} className="flex justify-center">
          <RecipeCard recipe={recipe} />
        </div>
      ))}
    </div>
  )
}

import type { Recipe } from "@/client"
import RecipeCard from "./RecipeCard"

interface RecipesListProps {
  recipes: Array<Recipe>
  fixedColumns?: boolean
  className?: string
  selectable?: boolean
  selectedIds?: Set<number>
  selectionMode?: boolean
  onToggleSelect?: (recipeId: number) => void
}

const FIXED_COLS_CLASSES =
  "[grid-template-columns:repeat(2,10rem)] @min-[34.5rem]:[grid-template-columns:repeat(3,10rem)] @min-[45.75rem]:[grid-template-columns:repeat(3,13.75rem)] @min-[60.5rem]:[grid-template-columns:repeat(4,13.75rem)] @min-[90rem]:[grid-template-columns:repeat(6,13.75rem)]"

const AUTO_COLS_CLASSES =
  "[grid-template-columns:repeat(auto-fill,10rem)] lg:[grid-template-columns:repeat(auto-fill,13.75rem)]"

export function RecipesList({
  recipes,
  fixedColumns = false,
  className = "",
  selectable = false,
  selectedIds,
  selectionMode = false,
  onToggleSelect,
}: RecipesListProps) {
  return (
    <div
      className={`stagger-children grid justify-center gap-4 p-1 w-full ${fixedColumns ? FIXED_COLS_CLASSES : AUTO_COLS_CLASSES} ${className}`}
    >
      {recipes?.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          selectable={selectable}
          selected={selectedIds?.has(recipe.id)}
          selectionMode={selectionMode}
          onToggleSelect={() => onToggleSelect?.(recipe.id)}
        />
      ))}
    </div>
  )
}

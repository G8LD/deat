import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCheck, RotateCcw } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import { GroceriesService, type GroceryItem, type GroceryItemSource, MenusService } from "@/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildIngredientImageUrl } from "@/utils"

type GroupMode = "ingredient" | "recipe"

// Sum source amounts grouped by unit (e.g. "2 cup" + "1 cup" -> "3 cup").
// Different units are kept as separate parts ("3 cup + 100 g"). Sources
// without an amount are ignored; a nicely rounded number is shown.
function sumAmountsByUnit(sources: GroceryItemSource[]): string {
  const totals = new Map<string, number>()
  for (const s of sources) {
    if (s.amount == null) continue
    const unit = s.unit ?? ""
    totals.set(unit, (totals.get(unit) ?? 0) + s.amount)
  }
  return [...totals.entries()]
    .map(([unit, amount]) => {
      const rounded = Math.round(amount * 100) / 100
      return `${rounded} ${unit}`.trim()
    })
    .join(" + ")
}

interface MenuGroceriesProps {
  menuId: string
  /** Optional element rendered on the progress row (e.g. a menu picker). */
  headerSlot?: ReactNode
}

export function MenuGroceries({ menuId, headerSlot }: MenuGroceriesProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>("ingredient")
  const queryClient = useQueryClient()
  const groceriesQueryKey = ["groceries", menuId]

  const { data: groceries } = useQuery({
    queryKey: groceriesQueryKey,
    queryFn: async () => (await GroceriesService.readGroceries({ path: { menu_id: menuId } })).data,
    enabled: Boolean(menuId),
  })

  const { data: menuDetail } = useQuery({
    queryKey: ["menu", menuId, "recipes"],
    queryFn: async () => (await MenusService.readMenu({ path: { id: menuId }, query: { depth: 3 } })).data,
    enabled: Boolean(menuId) && groupMode === "recipe",
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: groceriesQueryKey })

  const checkMutation = useMutation({
    mutationFn: async ({ ingredientId, checked }: { ingredientId: number; checked: boolean }) =>
      GroceriesService.checkIngredient({
        path: { menu_id: menuId, ingredient_id: ingredientId },
        body: { checked },
      }),
    onSuccess: invalidate,
  })

  const bulkMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      await Promise.all(
        (groceries?.items ?? []).map((item) =>
          GroceriesService.checkIngredient({
            path: { menu_id: menuId, ingredient_id: item.ingredient_id },
            body: { checked },
          }),
        ),
      )
    },
    onSuccess: invalidate,
  })

  const total = groceries?.total ?? 0
  const checkedCount = groceries?.checked_count ?? 0
  const progress = groceries?.progress ?? 0
  const items = groceries?.items ?? []

  const recipeTitles = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of menuDetail?.recipes ?? []) {
      map.set(r.id, r.title ?? `Recipe ${r.id}`)
    }
    return map
  }, [menuDetail])

  const toggle = (ingredientId: number, checked: boolean) => checkMutation.mutate({ ingredientId, checked })

  if (total === 0) {
    return (
      <div className="flex flex-col gap-4">
        {headerSlot && <div className="flex justify-start">{headerSlot}</div>}
        <p className="py-8 text-center text-sm text-muted-foreground">
          No groceries yet. Add recipes to this menu to build its grocery list.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress (with optional header slot, e.g. menu picker, on the left) */}
      <div className="flex items-center gap-3">
        {headerSlot && <div className="shrink-0">{headerSlot}</div>}
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>
              {checkedCount}/{total} ({Math.round(progress * 100)}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>

      {/* View toggle */}
      <Tabs value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)} className="self-center sm:self-start">
        <TabsList>
          <TabsTrigger value="ingredient">By ingredient</TabsTrigger>
          <TabsTrigger value="recipe">By recipe</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {groupMode === "ingredient" ? (
        <ul className="flex flex-col divide-y">
          {items.map((item) => (
            <GroceryRow
              key={item.ingredient_id}
              item={item}
              onToggle={(checked) => toggle(item.ingredient_id, checked)}
            />
          ))}
        </ul>
      ) : (
        <GroupedByRecipe items={items} recipeTitles={recipeTitles} onToggle={toggle} />
      )}

      {/* Actions */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          disabled={bulkMutation.isPending || checkedCount === 0}
          onClick={() => bulkMutation.mutate(false)}
        >
          <RotateCcw /> Clear
        </Button>
        <Button
          variant="outline"
          disabled={bulkMutation.isPending || checkedCount === total}
          onClick={() => bulkMutation.mutate(true)}
        >
          <CheckCheck /> Complete
        </Button>
      </div>
    </div>
  )
}

function GroupedByRecipe({
  items,
  recipeTitles,
  onToggle,
}: {
  items: GroceryItem[]
  recipeTitles: Map<number, string>
  onToggle: (ingredientId: number, checked: boolean) => void
}) {
  const byRecipe = new Map<number, GroceryItem[]>()
  for (const item of items) {
    for (const source of item.sources ?? []) {
      const list = byRecipe.get(source.recipe_id) ?? []
      if (!list.some((i) => i.ingredient_id === item.ingredient_id)) {
        list.push(item)
      }
      byRecipe.set(source.recipe_id, list)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byRecipe.entries()].map(([recipeId, recipeItems]) => (
        <div key={recipeId}>
          <h3 className="mb-1 text-sm font-semibold">{recipeTitles.get(recipeId) ?? `Recipe ${recipeId}`}</h3>
          <ul className="flex flex-col divide-y">
            {recipeItems.map((item) => {
              const source = (item.sources ?? []).find((s) => s.recipe_id === recipeId)
              return (
                <GroceryRow
                  key={`${recipeId}-${item.ingredient_id}`}
                  item={item}
                  sourceAmount={source?.amount != null ? `${source.amount} ${source.unit ?? ""}`.trim() : undefined}
                  checkedOverride={source?.checked}
                  onToggle={(checked) => onToggle(item.ingredient_id, checked)}
                />
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function GroceryRow({
  item,
  onToggle,
  sourceAmount,
  checkedOverride,
}: {
  item: GroceryItem
  onToggle: (checked: boolean) => void
  sourceAmount?: string
  checkedOverride?: boolean
}) {
  const sources = item.sources ?? []
  const allChecked = checkedOverride ?? (sources.length > 0 && sources.every((s) => s.checked))
  const amounts = sourceAmount ?? sumAmountsByUnit(sources)

  return (
    <li className="flex items-center gap-3 py-2">
      <Checkbox id={`ing-${item.ingredient_id}`} checked={allChecked} onCheckedChange={(v) => onToggle(Boolean(v))} />
      {item.image && (
        <img
          src={buildIngredientImageUrl(item.image, "100x100")}
          alt={item.name}
          className="h-8 w-8 rounded object-contain"
        />
      )}
      <label
        htmlFor={`ing-${item.ingredient_id}`}
        className={`flex-1 cursor-pointer text-sm ${allChecked ? "text-muted-foreground line-through" : ""}`}
      >
        <span className="capitalize">{item.name}</span>
        {amounts && <span className="ml-2 text-xs text-muted-foreground">{amounts}</span>}
      </label>
      {item.aisle && <span className="text-xs text-muted-foreground">{item.aisle}</span>}
    </li>
  )
}

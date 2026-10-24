import type { IngredientItem } from "@/client"
import { Title } from "@/components/Title"
import { Item, ItemContent, ItemHeader, ItemTitle } from "@/components/ui/item"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { buildIngredientImageUrl } from "@/utils"

interface IngredientsListProps {
  ingredients: Array<IngredientItem>
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  if (!ingredients || ingredients.length === 0) return null

  return (
    <div>
      <Title variant="section" className="mb-3">
        Ingredients
      </Title>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full">
        {ingredients.map((ingredient, idx) => {
          const metricAmount =
            ingredient.measures?.metric?.amount != null ? Math.round(ingredient.measures.metric.amount * 10) / 10 : ""
          const metricUnit = ingredient.measures?.metric?.unitShort ?? ""
          const name = ingredient.nameClean || ingredient.name || ""
          const label = [metricAmount, metricUnit, name].filter(Boolean).join(" ")

          return (
            <Item
              key={`${ingredient.id ?? idx}-${idx}`}
              variant="outline"
              className="flex flex-col items-center justify-start p-2.5 rounded-xl border border-border/70 bg-card text-center gap-2"
            >
              <ItemHeader className="p-0">
                <div className="size-16 flex items-center justify-center overflow-hidden rounded-md bg-muted/30 p-1">
                  <img
                    src={buildIngredientImageUrl(ingredient.image, "250x250")}
                    alt={name}
                    className="size-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              </ItemHeader>
              <ItemContent className="p-0 w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ItemTitle className="text-xs font-medium line-clamp-2 text-balance cursor-default">
                      {label}
                    </ItemTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              </ItemContent>
            </Item>
          )
        })}
      </div>
    </div>
  )
}

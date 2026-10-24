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
      <div className="flex w-full flex-wrap gap-4">
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
              className="w-28 sm:w-32 flex flex-col p-2.5 rounded-xl border border-border/70 bg-card shrink-0"
            >
              <ItemHeader className="p-0 w-full flex justify-center items-center">
                <img
                  src={buildIngredientImageUrl(ingredient.image, "250x250")}
                  alt={name}
                  className="aspect-square w-full rounded-md object-contain"
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden"
                  }}
                />
              </ItemHeader>
              <ItemContent className="p-0 mt-2 w-full text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ItemTitle className="text-xs font-medium line-clamp-3 text-center leading-snug break-words">
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

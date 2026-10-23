import { TooltipTrigger } from "@radix-ui/react-tooltip"
import type { IngredientItem } from "@/client"
import { Title } from "@/components/Title"
import { Item, ItemContent, ItemHeader, ItemTitle } from "@/components/ui/item"
import { Tooltip, TooltipContent } from "@/components/ui/tooltip"
import { buildIngredientImageUrl } from "@/utils"

interface IngredientsListProps {
  ingredients: Array<IngredientItem>
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  return (
    <div>
      <Title variant="section" className="mb-2">
        Ingredients
      </Title>
      <div className="flex w-full flex-wrap gap-4">
        {ingredients.map((ingredient) => (
          <Item key={ingredient.id} variant="outline" className="w-27 lg:w-32">
            <ItemHeader>
              <img
                src={buildIngredientImageUrl(ingredient.image, "250x250")}
                alt={ingredient.name}
                className="aspect-square w-full rounded-sm object-contain"
              />
            </ItemHeader>
            <ItemContent>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ItemTitle className="sm:line-clamp-3">
                    {Math.round(ingredient.measures.metric.amount)} {ingredient.measures.metric.unitShort}{" "}
                    {ingredient.nameClean}
                  </ItemTitle>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {Math.round(ingredient.measures.metric.amount)} {ingredient.measures.metric.unitShort}{" "}
                    {ingredient.nameClean}
                  </p>
                </TooltipContent>
              </Tooltip>
            </ItemContent>
          </Item>
        ))}
      </div>
    </div>
  )
}

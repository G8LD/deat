import { TooltipTrigger } from "@radix-ui/react-tooltip"
import { createFileRoute } from "@tanstack/react-router"
import { Clock, HeartPulse, Utensils } from "lucide-react"
import { RecipesService } from "@/client"
import { BackButton } from "@/components/Common/BackButton"
import AddRecipe from "@/components/Recipes/AddRecipe"
import { Title } from "@/components/Title"
import { Badge } from "@/components/ui/badge"
import { Item, ItemContent, ItemDescription, ItemHeader, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Tooltip, TooltipContent } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

export const Route = createFileRoute("/_layout/recipes/$recipeId")({
  component: RecipeDetails,
  loader: async ({ params }) => {
    return (await RecipesService.getRecipe({ path: { id: parseInt(params.recipeId, 10) } })).data
  },
})

function RecipeDetails() {
  const recipe = Route.useLoaderData()
  const isMobile = useIsMobile()
  return (
    <div className="flex flex-col gap-2">
      {isMobile ? (
        <>
          <BackButton variant="ghost" />
          <div className="flex-1 flex flex-col items-center justify-center">
            <Title variant="subPage" className="text-center text-balance">
              {recipe.title}
            </Title>
            <div className="flex gap-1">
              {(recipe.cuisines || []).map((cuisine) => (
                <Badge key={cuisine} variant="secondary">
                  {cuisine}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 w-fit">
            <img src={recipe.image ?? undefined} alt={recipe.title ?? undefined} className="w-lg rounded-xl" />
            <div className="flex justify-end">
              <AddRecipe recipe_id={recipe.id} variant="lg" />
            </div>
            <div className="flex gap-2">
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <Clock />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{recipe.readyInMinutes} minutes</ItemTitle>
                  <ItemDescription>Cooking time</ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <Utensils />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{recipe.servings} Servings</ItemTitle>
                  <ItemDescription>Original quantity</ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <HeartPulse />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{recipe.healthScore}/100</ItemTitle>
                  <ItemDescription>Health Score</ItemDescription>
                </ItemContent>
              </Item>
            </div>
          </div>
        </>
      ) : (
        <>
          <BackButton variant="outline" />
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex-1 flex flex-col items-center justify-center">
                <Title variant="subPage" className="text-6xl text-center text-balance">
                  {recipe.title}
                </Title>
                <div className="flex gap-1">
                  {(recipe.cuisines || []).map((cuisine) => (
                    <Badge key={cuisine} variant="secondary">
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <AddRecipe recipe_id={recipe.id} variant="lg" />
              </div>
              <div>
                <div className="flex gap-2">
                  <Item variant="outline">
                    <ItemMedia variant="icon">
                      <Clock />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{recipe.readyInMinutes} minutes</ItemTitle>
                      <ItemDescription>Cooking time</ItemDescription>
                    </ItemContent>
                  </Item>
                  <Item variant="outline">
                    <ItemMedia variant="icon">
                      <Utensils />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{recipe.servings} Servings</ItemTitle>
                      <ItemDescription>Original quantity</ItemDescription>
                    </ItemContent>
                  </Item>
                  <Item variant="outline">
                    <ItemMedia variant="icon">
                      <HeartPulse />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{recipe.healthScore}/100</ItemTitle>
                      <ItemDescription>Health Score</ItemDescription>
                    </ItemContent>
                  </Item>
                </div>
              </div>
            </div>
            <div className="flex">
              <img
                src={`https://img.spoonacular.com/recipes/${recipe.id}-636x393.${recipe.imageType}`}
                alt={recipe.title ?? undefined}
                className="w-xl rounded-xl"
              />
            </div>
          </div>
        </>
      )}
      <Title variant="section">Ingredients</Title>
      <div className="flex w-full flex-wrap gap-4">
        {(recipe.extendedIngredients || []).map((ingredient) => (
          <Item key={ingredient.id} variant="outline" className="w-27 lg:w-32">
            <ItemHeader>
              <img
                src={`https://img.spoonacular.com/ingredients_250x250/${ingredient.image}`}
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

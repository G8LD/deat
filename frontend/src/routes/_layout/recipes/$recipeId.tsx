import { createFileRoute } from "@tanstack/react-router"
import { Clock, HeartPulse, Utensils } from "lucide-react"
import { RecipesService } from "@/client"
import { BackButton } from "@/components/Common/BackButton"
import AddRecipe from "@/components/Recipes/AddRecipe"
import { IngredientsList } from "@/components/Recipes/IngredientsList"
import { Instructions } from "@/components/Recipes/Instructions"
import { Title } from "@/components/Title"
import { Badge } from "@/components/ui/badge"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import { useIsMobile } from "@/hooks/use-mobile"
import { buildRecipeImageUrl } from "@/utils"

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
    <div className="flex flex-col gap-4">
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
            <img
              src={buildRecipeImageUrl(recipe.id, recipe.imageType, "556x370")}
              alt={recipe.title ?? undefined}
              className="w-lg rounded-xl"
            />
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
                  <ItemTitle>{recipe.healthScore}%</ItemTitle>
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
                      <ItemTitle>{recipe.healthScore}%</ItemTitle>
                      <ItemDescription>Health Score</ItemDescription>
                    </ItemContent>
                  </Item>
                </div>
              </div>
            </div>
            <div className="flex">
              <img
                src={buildRecipeImageUrl(recipe.id, recipe.imageType, "636x393")}
                alt={recipe.title ?? undefined}
                className="w-xl rounded-xl"
              />
            </div>
          </div>
        </>
      )}
      <IngredientsList ingredients={recipe.extendedIngredients || []} />
      <Instructions instructions={recipe.analyzedInstructions?.[0]?.steps || []} />
    </div>
  )
}

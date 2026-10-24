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
import { buildRecipeImageUrl } from "@/utils"

export const Route = createFileRoute("/_layout/recipes/$recipeId")({
  component: RecipeDetails,
  loader: async ({ params }) => {
    return (await RecipesService.getRecipe({ path: { id: parseInt(params.recipeId, 10) } })).data
  },
})

function RecipeDetails() {
  const recipe = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-8">
      <div>
        <BackButton variant="outline" />
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-6 items-start justify-between">
        <div className="flex flex-col gap-4 flex-1 w-full">
          <div>
            <Title variant="subPage" className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
              {recipe.title}
            </Title>
            {recipe.cuisines && recipe.cuisines.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recipe.cuisines.map((cuisine) => (
                  <Badge key={cuisine} variant="secondary">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AddRecipe recipe_id={recipe.id} variant="lg" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full mt-2">
            {recipe.readyInMinutes ? (
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <Clock className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{recipe.readyInMinutes} minutes</ItemTitle>
                  <ItemDescription>Cooking time</ItemDescription>
                </ItemContent>
              </Item>
            ) : null}
            {recipe.servings ? (
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <Utensils className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{recipe.servings} Servings</ItemTitle>
                  <ItemDescription>Portions</ItemDescription>
                </ItemContent>
              </Item>
            ) : null}
            {recipe.healthScore != null ? (
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <HeartPulse className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{recipe.healthScore}/100</ItemTitle>
                  <ItemDescription>Health score</ItemDescription>
                </ItemContent>
              </Item>
            ) : null}
          </div>
        </div>

        <div className="w-full lg:w-[26rem] xl:w-[30rem] shrink-0">
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border/70 shadow-sm bg-muted">
            <img
              src={buildRecipeImageUrl(recipe.id, recipe.imageType, "636x393")}
              alt={recipe.title ?? undefined}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      <IngredientsList ingredients={recipe.extendedIngredients || []} />
      <Instructions instructions={recipe.analyzedInstructions?.[0]?.steps ?? []} />
    </div>
  )
}

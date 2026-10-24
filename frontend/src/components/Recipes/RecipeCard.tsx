import { useMutation } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Clock, HeartPulse, Trash, Utensils } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { type MenuRecipePublic, MenusService, type Recipe } from "@/client"
import BaseCard from "@/components/Common/BaseCard"
import { Badge } from "@/components/ui/badge"
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import useCustomToast from "@/hooks/useCustomToast"
import { buildRecipeImageUrl, handleError } from "@/utils"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { Field } from "../ui/field"
import { Label } from "../ui/label"
import AddRecipe from "./AddRecipe"
import FavoriteToggle from "./FavoriteToggle"

interface RecipeCardProps {
  menuId?: string
  recipe: MenuRecipePublic | Recipe
  onMenuUpdate?: () => void
}

export default function RecipeCard({ menuId = "", recipe, onMenuUpdate }: RecipeCardProps) {
  const { showErrorToast } = useCustomToast()

  const removeRecipeMutation = useMutation({
    mutationFn: async () =>
      await MenusService.updateRecipes({
        body: { remove: { menu_ids: [menuId], recipe_ids: [recipe.id] } },
      }),
    onSuccess: () => onMenuUpdate?.(),
    onError: handleError.bind(showErrorToast),
  })

  const completeRecipeMutation = useMutation({
    mutationFn: async () => {
      await MenusService.completeRecipe({
        path: { id: menuId, recipe_id: recipe.id },
      })
    },
    onSuccess: () => onMenuUpdate?.(),
    onError: handleError.bind(showErrorToast),
  })

  return (
    <BaseCard>
      <CardHeader className="p-0 flex flex-1">
        <Link to="/recipes/$recipeId" params={{ recipeId: String(recipe.id) }} className="flex flex-col h-full">
          <div className="w-full shrink-0 overflow-hidden bg-muted">
            <img
              src={buildRecipeImageUrl(recipe.id, recipe.imageType, "480x360")}
              alt={recipe.title ?? undefined}
              loading="lazy"
              className="w-full transition-transform duration-500 ease-out group-hover/card:scale-105"
              onError={(e) => {
                const img = e.currentTarget
                if (recipe.image && img.src !== recipe.image) {
                  img.src = recipe.image // fall back to Spoonacular's full URL
                } else {
                  img.style.visibility = "hidden"
                }
              }}
            />
          </div>
          <TruncatedTitle title={recipe.title ?? ""} />
        </Link>
      </CardHeader>
      <CardContent>
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: String(recipe.id) }}
          className="flex flex-wrap gap-1 justify-center items-center"
        >
          {recipe.readyInMinutes ? (
            <Badge>
              <Clock data-icon="inline-start" />
              {recipe.readyInMinutes} min
            </Badge>
          ) : null}
          {recipe.servings ? (
            <Badge>
              <Utensils data-icon="inline-start" />
              {recipe.servings}
            </Badge>
          ) : null}
          {recipe.healthScore ? (
            <Badge>
              <HeartPulse data-icon="inline-start" />
              {recipe.healthScore}%
            </Badge>
          ) : null}
        </Link>
      </CardContent>
      <CardFooter className="p-0 pb-2 px-2 mt-auto bg-card border-0 flex items-center justify-start gap-1">
        {menuId && (
          <>
            <Field
              orientation="horizontal"
              className="w-auto"
              data-disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
            >
              <Label htmlFor={`done-${menuId}-${recipe.id}`}>Done</Label>
              <Checkbox
                id={`done-${menuId}-${recipe.id}`}
                className="border-foreground mr-2"
                checked={Boolean((recipe as MenuRecipePublic).done)}
                onClick={() => completeRecipeMutation.mutate()}
                disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
              />
            </Field>
            <Button
              className="hover:text-destructive hover:bg-destructive/10"
              variant="ghost"
              size="icon"
              onClick={() => removeRecipeMutation.mutate()}
              disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
            >
              {removeRecipeMutation.isPending ? <Spinner /> : <Trash />}
            </Button>
          </>
        )}
        <FavoriteToggle recipeId={recipe.id} />
        <AddRecipe recipe_id={recipe.id} />
      </CardFooter>
    </BaseCard>
  )
}

// Recipe title clamped to 2 lines; shows a tooltip with the full title only
// when the text is actually truncated.
function TruncatedTitle({ title }: { title: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    const checkTruncation = () => {
      const el = ref.current
      if (el) setTruncated(el.scrollHeight > el.clientHeight + 1)
    }
    checkTruncation()
    window.addEventListener("resize", checkTruncation)
    return () => window.removeEventListener("resize", checkTruncation)
  }, [title])

  const titleEl = (
    <CardTitle ref={ref} className="text-xs lg:text-sm text-center text-balance m-2 wrap-break-word line-clamp-2">
      {title}
    </CardTitle>
  )

  if (!truncated) return titleEl

  return (
    <Tooltip>
      <TooltipTrigger asChild>{titleEl}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

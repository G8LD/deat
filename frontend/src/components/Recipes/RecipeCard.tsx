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
  className?: string
}

export default function RecipeCard({ menuId = "", recipe, onMenuUpdate, className = "" }: RecipeCardProps) {
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
    <BaseCard className={className}>
      <CardHeader className="p-0 flex flex-col flex-1">
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: String(recipe.id) }}
          className="flex flex-col h-full group/link"
        >
          <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden bg-muted">
            <img
              src={buildRecipeImageUrl(recipe.id, recipe.imageType, "480x360")}
              alt={recipe.title ?? undefined}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover/card:scale-105"
              onError={(e) => {
                const img = e.currentTarget
                if (recipe.image && img.src !== recipe.image) {
                  img.src = recipe.image
                } else {
                  img.style.visibility = "hidden"
                }
              }}
            />
          </div>
          <TruncatedTitle title={recipe.title ?? ""} />
        </Link>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0 h-7 flex items-center justify-center">
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: String(recipe.id) }}
          className="flex flex-wrap gap-1.5 justify-center items-center"
        >
          {recipe.readyInMinutes ? (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0.5 gap-1 font-medium">
              <Clock className="size-3 shrink-0" />
              {recipe.readyInMinutes}m
            </Badge>
          ) : null}
          {recipe.servings ? (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0.5 gap-1 font-medium">
              <Utensils className="size-3 shrink-0" />
              {recipe.servings}
            </Badge>
          ) : null}
          {recipe.healthScore ? (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0.5 gap-1 font-medium">
              <HeartPulse className="size-3 shrink-0" />
              {recipe.healthScore}%
            </Badge>
          ) : null}
        </Link>
      </CardContent>
      <CardFooter className="px-2 py-1.5 mt-auto h-11 bg-card border-t border-border/50 flex items-center justify-center gap-1.5">
        {menuId ? (
          <>
            <Field
              orientation="horizontal"
              className="w-auto flex items-center gap-1.5"
              data-disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
            >
              <Checkbox
                id={`done-${menuId}-${recipe.id}`}
                className="size-4"
                checked={Boolean((recipe as MenuRecipePublic).done)}
                onCheckedChange={() => completeRecipeMutation.mutate()}
                disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
                aria-label="Mark recipe as done"
              />
              <Label htmlFor={`done-${menuId}-${recipe.id}`} className="text-xs cursor-pointer">
                Done
              </Label>
            </Field>
            <Button
              className="hover:text-destructive hover:bg-destructive/10 size-8"
              variant="ghost"
              size="icon"
              aria-label="Remove recipe from menu"
              onClick={() => removeRecipeMutation.mutate()}
              disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
            >
              {removeRecipeMutation.isPending ? <Spinner className="size-3.5" /> : <Trash className="size-3.5" />}
            </Button>
          </>
        ) : null}
        <FavoriteToggle recipeId={recipe.id} />
        <AddRecipe recipe_id={recipe.id} />
      </CardFooter>
    </BaseCard>
  )
}

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
  }, [])

  const titleEl = (
    <CardTitle
      ref={ref}
      className="text-xs sm:text-sm font-medium text-center text-balance px-2 h-11 flex items-center justify-center line-clamp-2 leading-tight transition-colors group-hover/link:text-primary"
    >
      {title}
    </CardTitle>
  )

  if (!truncated) return titleEl

  return (
    <Tooltip>
      <TooltipTrigger asChild>{titleEl}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{title}</TooltipContent>
    </Tooltip>
  )
}

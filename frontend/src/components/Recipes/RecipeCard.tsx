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
import { useIsMobile } from "@/hooks/use-mobile"
import useCustomToast from "@/hooks/useCustomToast"
import { FAVORITES_MENU_NAME } from "@/lib/constants"
import { buildRecipeImageUrl, handleError } from "@/utils"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { Field } from "../ui/field"
import { Label } from "../ui/label"
import AddRecipe from "./AddRecipe"
import FavoriteToggle from "./FavoriteToggle"

interface RecipeCardProps {
  recipe: MenuRecipePublic | Recipe
  menuId?: string
  menuName?: string
  onMenuUpdate?: () => void
  selectable?: boolean
  selected?: boolean
  selectionMode?: boolean
  onToggleSelect?: () => void
}

export default function RecipeCard({
  recipe,
  menuId = "",
  menuName = "",
  onMenuUpdate,
  selectable = false,
  selected = false,
  selectionMode = false,
  onToggleSelect,
}: RecipeCardProps) {
  const isMobile = useIsMobile()
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

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.preventDefault()
      e.stopPropagation()
      onToggleSelect?.()
    }
  }

  return (
    <BaseCard
      className={`group/card relative transition-all duration-150 ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md" : ""
      }`}
    >
      {selectable && (
        <div
          className={`absolute top-2 left-2 z-30 transition-opacity ${
            selectionMode || selected
              ? "opacity-100"
              : "opacity-100 md:opacity-0 group-hover/card:opacity-100 focus-within:opacity-100"
          }`}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.()}
            className="size-5 bg-background/90 shadow-md backdrop-blur-xs border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground cursor-pointer"
            aria-label={`Select ${recipe.title}`}
          />
        </div>
      )}
      <CardHeader className="p-0 flex">
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: String(recipe.id) }}
          disabled={selectionMode}
          className="flex flex-col h-full"
          onClick={handleCardClick}
        >
          <div className="relative w-full shrink-0 overflow-hidden bg-muted">
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
      <CardContent className="flex-1 flex align-middle justify-center">
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: String(recipe.id) }}
          disabled={selectionMode}
          className="flex flex-wrap gap-1 justify-center items-center"
          onClick={handleCardClick}
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
      <CardFooter
        className="p-0 pb-2 px-2 mt-auto bg-card border-0 flex items-center justify-end gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {menuId && (
          <>
            <Field
              orientation="horizontal"
              className="w-auto"
              data-disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
            >
              {!isMobile && <Label htmlFor={`done-${menuId}-${recipe.id}`}>Done</Label>}
              <Checkbox
                id={`done-${menuId}-${recipe.id}`}
                className="border-foreground mr-1"
                checked={Boolean((recipe as MenuRecipePublic).done)}
                onClick={() => completeRecipeMutation.mutate()}
                disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
              />
            </Field>
            {menuName !== FAVORITES_MENU_NAME && (
              <Button
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                variant="ghost"
                size="icon"
                onClick={() => removeRecipeMutation.mutate()}
                disabled={completeRecipeMutation.isPending || removeRecipeMutation.isPending}
              >
                {removeRecipeMutation.isPending ? <Spinner /> : <Trash />}
              </Button>
            )}
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
  }, [])

  const titleEl = (
    <div className="h-[2lh] lg:h-[3lh] flex items-center justify-center lg:m-2 px-1">
      <CardTitle
        ref={ref}
        className="text-xs lg:text-sm text-center text-balance wrap-break-word line-clamp-2 lg:line-clamp-3"
      >
        {title}
      </CardTitle>
    </div>
  )

  if (!truncated) return titleEl

  return (
    <Tooltip>
      <TooltipTrigger asChild>{titleEl}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

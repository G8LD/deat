import { useMutation } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Clock, Trash, Utensils } from "lucide-react"
import { type MenuRecipePublic, MenusService, type Recipe } from "@/client"
import { Badge } from "@/components/ui/badge"
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { Field } from "../ui/field"
import { Label } from "../ui/label"
import AddRecipe from "./AddRecipe"
import BaseCard from "./BaseCard"

interface RecipeCardProps {
  menuId?: string
  recipe: MenuRecipePublic | Recipe
  onMenuUpdate?: () => void
}

export default function RecipeCard({
  menuId = "",
  recipe,
  onMenuUpdate,
}: RecipeCardProps) {
  const { showErrorToast } = useCustomToast()

  const removeRecipeMutation = useMutation({
    mutationFn: async () =>
      await MenusService.removeRecipes({
        path: { id: menuId },
        query: { recipe_id: [recipe.id] },
      }),
    onSuccess: () => onMenuUpdate?.(),
    onError: handleError.bind(showErrorToast),
  })

  const completeRecipeMutation = useMutation({
    mutationFn: async () => {
      console.log(menuId)
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
        <Link to={`/recipes/${recipe.id}`} className="flex flex-col h-full">
          <img src={recipe.image} alt={recipe.title} />
          <CardTitle className="h-full text-xs lg:text-sm text-center text-wrap m-2 wrap-break-word line-clamp-3 items-center justify-center flex">
            {recipe.title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent>
        <Link
          to={`/recipes/${recipe.id}`}
          className="flex gap-1 justify-center items-center mb-5"
        >
          {recipe.readyInMinutes && (
            <Badge>
              <Clock data-icon="inline-start" />
              {recipe.readyInMinutes} min
            </Badge>
          )}
          {recipe.readyInMinutes && (
            <Badge>
              <Utensils data-icon="inline-start" />
              {recipe.servings}
            </Badge>
          )}
        </Link>
      </CardContent>
      <CardFooter className="p-0 pb-2 mt-auto bg-card border-0 flex justify-center gap-0.5">
        {menuId && (
          <>
            <Field
              orientation="horizontal"
              className="w-auto"
              data-disabled={
                completeRecipeMutation.isPending ||
                removeRecipeMutation.isPending
              }
            >
              <Label htmlFor={`done-${menuId}-${recipe.id}`}>Done</Label>
              <Checkbox
                id={`done-${menuId}-${recipe.id}`}
                className="border-foreground mr-2"
                checked={recipe.done}
                onClick={() => completeRecipeMutation.mutate()}
                disabled={
                  completeRecipeMutation.isPending ||
                  removeRecipeMutation.isPending
                }
              />
            </Field>
            <Button
              className="hover:text-destructive hover:bg-destructive/10"
              variant="ghost"
              size="icon"
              onClick={() => removeRecipeMutation.mutate()}
              disabled={
                completeRecipeMutation.isPending ||
                removeRecipeMutation.isPending
              }
            >
              {removeRecipeMutation.isPending ? <Spinner /> : <Trash />}
            </Button>
          </>
        )}
        <AddRecipe recipe_id={recipe.id} />
      </CardFooter>
    </BaseCard>
  )
}

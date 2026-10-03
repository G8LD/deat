import { useMutation } from "@tanstack/react-query"
import { Clock, Trash, Utensils } from "lucide-react"
import { type MenuRecipePublic, MenusService } from "@/client"
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
import BaseCard from "./BaseCard"

interface RecipeCardProps {
  menuId?: string
  recipe: MenuRecipePublic
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
    mutationFn: async () =>
      await MenusService.completeRecipe({
        path: { id: menuId, recipe_id: recipe.id },
      }),
    onSuccess: () => onMenuUpdate?.(),
    onError: handleError.bind(showErrorToast),
  })

  return (
    <BaseCard>
      <CardHeader className="p-0">
        <img src={recipe.image} alt={recipe.title} />
        <CardTitle className="text-xs lg:text-sm text-center text-wrap p-2 line-clamp-3">
          {recipe.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-1 justify-center flex-1 items-center">
        <Badge>
          <Clock data-icon="inline-start" />
          {recipe.readyInMinutes} min
        </Badge>
        <Badge>
          <Utensils data-icon="inline-start" />
          {recipe.servings}
        </Badge>
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
              <Label htmlFor="done">Done !</Label>
              <Checkbox
                id="done"
                className="border-foreground mr-2"
                defaultChecked={recipe.done}
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
      </CardFooter>
    </BaseCard>
  )
}

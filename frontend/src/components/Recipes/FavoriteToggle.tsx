import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Heart } from "lucide-react"
import { MenusService } from "@/client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import useCustomToast from "@/hooks/useCustomToast"
import { useMenus } from "@/hooks/useMenus"
import { useRecipeMenus } from "@/hooks/useRecipeMenus"
import { handleError } from "@/utils"

const FAVORITES_MENU_NAME = "Favorites"

type FavoriteToggleProps = {
  recipeId: number
}

/** Heart toggle that adds/removes a recipe from the special "Favorites" menu. */
export default function FavoriteToggle({ recipeId }: FavoriteToggleProps) {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const { data: menus } = useMenus()
  const { data: recipeMenus } = useRecipeMenus(recipeId)

  const favoritesMenu = (menus?.data || []).find((m) => m.name === FAVORITES_MENU_NAME)
  const favoriteMenuIds = (recipeMenus?.data || []).map((m) => m.id)
  const isFavorite = favoritesMenu ? favoriteMenuIds.includes(favoritesMenu.id) : false

  const mutation = useMutation({
    mutationFn: async () => {
      if (!favoritesMenu) return
      const payload = isFavorite
        ? { remove: { menu_ids: [favoritesMenu.id], recipe_ids: [recipeId] } }
        : { add: { menu_ids: [favoritesMenu.id], recipe_ids: [recipeId] } }
      await MenusService.updateRecipes({ body: payload })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", recipeId, "menus"] })
      queryClient.invalidateQueries({ queryKey: ["menus", "depth", 2] })
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      disabled={!favoritesMenu || mutation.isPending}
      onClick={() => mutation.mutate()}
      className="hover:text-red-500"
    >
      {mutation.isPending ? <Spinner /> : <Heart className={isFavorite ? "fill-red-500 text-red-500" : ""} />}
    </Button>
  )
}

import { useQuery } from "@tanstack/react-query"
import { MenusService } from "@/client"

export const useRecipeMenus = (recipeId?: number, enabled = true) =>
  useQuery({
    queryKey: ["recipe", recipeId, "menus"],
    queryFn: async () => (await MenusService.readMenus({ query: { recipe_id: recipeId } })).data,
    enabled: !!recipeId && enabled,
    staleTime: 5 * 60 * 1000,
  })

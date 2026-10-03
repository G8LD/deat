import { useQuery } from "@tanstack/react-query"

import { MenusService } from "@/client"

const useRecipes = () => {
  const { data: menus } = useQuery({
    queryKey: ["menus", "public", "depth", 1],
    queryFn: async () =>
      (await MenusService.readMenus({ query: { depth: 1 } })).data,
  })

  return {
    menus,
  }
}

export default useRecipes

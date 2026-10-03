import { useQuery } from "@tanstack/react-query"

import { MenusService } from "@/client"

const useRecipes = () => {
  const { data: menusList } = useQuery({
    queryKey: ["menus", "public"],
    queryFn: async () =>
      (await MenusService.readMenus({ query: { depth: 1 } })).data,
  })

  return {
    menus: menusList,
  }
}

export default useRecipes

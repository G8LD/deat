import { useQuery } from "@tanstack/react-query"
import { MenusService } from "@/client"

export const useMenus = () =>
  useQuery({
    queryKey: ["menus", "depth", 2],
    queryFn: async () => (await MenusService.readMenus({ query: { display: true } })).data,
    staleTime: 5 * 60 * 1000,
  })

import { useQuery } from "@tanstack/react-query"
import { MenusService } from "@/client"

export const useMenus = () =>
  useQuery({
    queryKey: ["menus", "depth", 1],
    queryFn: async () => (await MenusService.readMenus()).data,
    staleTime: 5 * 60 * 1000,
  })

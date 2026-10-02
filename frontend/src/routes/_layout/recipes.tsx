import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"
import { MenusService } from "@/client"
import CreateMenu from "@/components/Recipes/CreateMenu"
import MenuCard from "@/components/Recipes/MenuCard"
import MenuCarousel from "@/components/Recipes/MenuCarousel"
import { Title } from "@/components/Title"

export const Route = createFileRoute("/_layout/recipes")({
  component: Recipes,
  head: () => ({
    meta: [
      {
        title: "Recipes",
      },
    ],
  }),
})

function Recipes() {
  const queryClient = useQueryClient()

  const { data: menus } = useSuspenseQuery({
    queryKey: ["menus", "public"],
    queryFn: async () => {
      const response = await MenusService.readMenus({
        query: { display: true },
      })
      return response.data
    },
  })

  const { favorites, current, otherMenus } = useMemo(() => {
    const menuList = menus?.data || []

    const other: typeof menuList = []
    let fav: (typeof menuList)[0] | null = null
    let curr: (typeof menuList)[0] | null = null

    for (const menu of menuList) {
      if (menu.name === "Favorites") {
        fav = menu
      } else if (menu.current) {
        curr = menu
      } else {
        other.push(menu)
      }
    }

    return { favorites: fav, current: curr, otherMenus: other }
  }, [menus])

  return (
    <div>
      <Title>Recipes</Title>
      <div className="flex flex-col gap-6">
        {favorites && <MenuCarousel menu={favorites} />}
        {current && <MenuCarousel menu={current} />}

        <Title
          variant="section"
          className="mb-3 flex gap-3 items-center justify-between lg:justify-start"
        >
          Menus
          <CreateMenu
            onSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ["menus", "public"] })
            }
          />
        </Title>

        <div className="w-fit flex flex-wrap gap-4 p-1">
          {otherMenus.map((menu) => (
            <MenuCard key={menu.id} menu={menu} />
          ))}
        </div>
      </div>
    </div>
  )
}

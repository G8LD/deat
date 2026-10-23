import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"
import { MenusService } from "@/client"
import MenuCarousel from "@/components/Menus/MenuCarousel"
import { MenusList } from "@/components/Menus/MenusList"
import { Title } from "@/components/Title"

export const Route = createFileRoute("/_layout/recipes/")({
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
  const { data: menus } = useSuspenseQuery({
    queryKey: ["menus", "depth", 2],
    queryFn: async () =>
      (
        await MenusService.readMenus({
          query: { display: true },
        })
      ).data,
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
        <MenusList menus={otherMenus} />
      </div>
    </div>
  )
}

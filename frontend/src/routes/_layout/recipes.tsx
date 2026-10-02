import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { MenusService } from "@/client"
import { Title } from "@/components/Title"
import CreateMenu from "@/components/Recipes/CreateMenu";
import MenuCarousel from "@/components/Recipes/MenuCarousel";

function getMenusQueryOptions() {
  return {
    queryFn: async () =>
      (await MenusService.readMenus({ query: { skip: 0, limit: 100 } })).data,
    queryKey: ["items"],
  }
}

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
  const { data: menus } = useSuspenseQuery(getMenusQueryOptions())
  let favorites = null
  const allMenus = menus.data.filter((menu) => {
    if (menu.name === "Favorites") favorites = menu
    return menu.name !== "Favorites"
  })
  return (
    <div>
      <Title>Recipes</Title>
      {favorites && <MenuCarousel menu={favorites} />}
      <Title
        variant="section"
        className="mb-3 flex gap-3 items-center justify-between lg:justify-start"
      >
        Menus
        <CreateMenu />
      </Title>
      {allMenus.map((menu) => (
        <MenuCarousel key={menu.id} menu={menu} />
      ))}
    </div>
  )
}

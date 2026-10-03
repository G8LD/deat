import { useQueryClient } from "@tanstack/react-query"
import type { MenuPublic } from "@/client"
import CreateMenu from "@/components/Recipes/CreateMenu"
import MenuCard from "@/components/Recipes/MenuCard"
import { Title } from "@/components/Title"

interface MenusListProps {
  menus: Array<MenuPublic>
}

export function MenusList({ menus }: MenusListProps) {
  const queryClient = useQueryClient()

  return (
    <div>
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
        {menus.map((menu) => (
          <MenuCard
            key={menu.id}
            menu={menu}
            onMenuUpdate={() =>
              queryClient.invalidateQueries({ queryKey: ["menus", "public"] })
            }
          />
        ))}
      </div>
    </div>
  )
}

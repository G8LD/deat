import { useQueryClient } from "@tanstack/react-query"
import type { MenuPublic } from "@/client"
import CreateMenu from "@/components/Menus/CreateMenu"
import MenuCard from "@/components/Menus/MenuCard"
import { Title } from "@/components/Title"

interface MenusListProps {
  menus: Array<MenuPublic>
}

export function MenusList({ menus }: MenusListProps) {
  const queryClient = useQueryClient()

  return (
    <div>
      <Title variant="section" className="mb-3 flex gap-3 items-center justify-between sm:justify-start">
        Menus
        <CreateMenu onSuccess={() => queryClient.invalidateQueries({ queryKey: ["menus"] })} />
      </Title>

      <div className="w-full">
        <div
          key={menus.map((m) => m.id).join("-")}
          className="stagger-children gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-1 w-full"
        >
          {menus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              onMenuUpdate={() => queryClient.invalidateQueries({ queryKey: ["menus"] })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

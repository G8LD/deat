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
          className="stagger-children gap-4 grid [grid-template-columns:repeat(auto-fill,minmax(11rem,14rem))] p-1 w-full"
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

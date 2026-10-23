import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { MenuGroceries } from "@/components/Menus/MenuGroceries"
import { Title } from "@/components/Title"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMenus } from "@/hooks/useMenus"

export const Route = createFileRoute("/_layout/groceries")({
  component: Groceries,
  head: () => ({
    meta: [{ title: "Groceries" }],
  }),
})

const GROCERIES_MENU_KEY = "deat:groceries:menuId"

function Groceries() {
  const { data: menusResponse } = useMenus()
  const menus = menusResponse?.data ?? []
  const [menuId, setMenuId] = useState<string>("")

  // Default selection: last-used (localStorage) if still valid, else the
  // pinned/current menu, else the first menu.
  useEffect(() => {
    if (menuId || menus.length === 0) return
    const stored = localStorage.getItem(GROCERIES_MENU_KEY)
    const storedValid = stored && menus.some((m) => m.id === stored)
    const pinned = menus.find((m) => m.current)
    setMenuId(storedValid ? stored : (pinned?.id ?? menus[0].id))
  }, [menus, menuId])

  // Persist the selection.
  const selectMenu = (id: string) => {
    setMenuId(id)
    localStorage.setItem(GROCERIES_MENU_KEY, id)
  }

  return (
    <div className="flex flex-col gap-4">
      <Title className="animate-fade-in-up">Groceries</Title>

      {menuId && (
        <MenuGroceries
          menuId={menuId}
          headerSlot={
            <Select value={menuId} onValueChange={selectMenu}>
              <SelectTrigger className="min-w-44">
                <SelectValue placeholder="Select a menu" />
              </SelectTrigger>
              <SelectContent>
                {menus.map((menu) => (
                  <SelectItem key={menu.id} value={menu.id}>
                    {menu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      )}
    </div>
  )
}

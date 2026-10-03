import { Link } from "@tanstack/react-router"
import type { MenuPublic } from "@/client"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import BaseCard from "./BaseCard"
import MenuCompletionBadge from "./MenuCompletionBadge"

interface MenuCardProps {
  menu: MenuPublic
}

export default function MenuCard({ menu }: MenuCardProps) {
  return (
    <Link to={`/menus/${menu.id}`} className="flex-1 lg:flex-none">
      <BaseCard className={`py-2 aspect-square`}>
        <CardHeader className="flex-1 flex justify-center items-center">
          <CardTitle className="text-xm lg:text-base text-center text-wrap mb-2">
            {menu.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 justify-center items-center my-2">
          <div className="text-xs lg:text-sm text-gray-700">
            {new Date(menu.created_at).toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </div>
          <MenuCompletionBadge recipes={menu.recipes || []} />
        </CardContent>
      </BaseCard>
    </Link>
  )
}

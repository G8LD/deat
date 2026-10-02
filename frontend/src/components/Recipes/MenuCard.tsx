import { ChefHat } from "lucide-react"
import type { MenuPublic } from "@/client"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import BaseCard from "./BaseCard"
import MenuCompletionBadge from "./MenuCompletionBadge"

interface MenuCardProps {
  menu: MenuPublic
}

export default function MenuCard({ menu }: MenuCardProps) {
  return (
    <BaseCard
      link={`/menus/${menu.id}`}
      className={`py-2`}
      classNameLink="flex-1 lg:flex-none"
    >
      <div className="flex justify-center items-center">
        <ChefHat size={64} />
      </div>
      <CardHeader>
        <CardTitle className="text-base lg:text-xl text-center text-wrap">
          {menu.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 justify-center items-center">
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
  )
}

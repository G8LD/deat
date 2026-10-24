import { useMutation } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Pin } from "lucide-react"
import { type MenuPublic, MenusService } from "@/client"
import BaseCard from "@/components/Common/BaseCard"
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import useCustomToast from "@/hooks/useCustomToast"
import { FAVORITES_MENU_NAME } from "@/lib/constants"
import { handleError } from "@/utils"
import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"
import DeleteMenu from "./DeleteMenu"
import MenuCompletionBadge from "./MenuCompletionBadge"

interface MenuCardProps {
  menu: MenuPublic
  onMenuUpdate?: () => void
}

export default function MenuCard({ menu, onMenuUpdate }: MenuCardProps) {
  const { showErrorToast } = useCustomToast()

  const pinMenuMutation = useMutation({
    mutationFn: async () =>
      await MenusService.updateMenu({
        body: { current: true },
        path: { id: menu.id },
      }),
    onSuccess: () => onMenuUpdate?.(),
    onError: handleError.bind(showErrorToast),
  })

  const isFavorites = menu.name === FAVORITES_MENU_NAME

  return (
    <BaseCard className={`py-2 aspect-square`}>
      <CardHeader className="flex flex-1">
        <Link to="/menus/$menuId" params={{ menuId: menu.id }} className="h-full w-full flex justify-center items-center">
          <CardTitle className="text-xm lg:text-base text-center text-wrap wrap-break-word line-clamp-3">
            {menu.name}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col my-2">
        <Link to="/menus/$menuId" params={{ menuId: menu.id }} className="flex flex-col gap-1 justify-center items-center">
          <div className="text-xs lg:text-sm text-gray-700">
            {new Date(menu.created_at || "").toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </div>
          <MenuCompletionBadge recipes={menu.recipes || []} />
        </Link>
      </CardContent>
      <CardFooter className="p-0 pb-2 px-2 mt-auto bg-card border-0 flex gap-0.5 justify-end">
        {!isFavorites && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Pin menu as current"
            onClick={() => pinMenuMutation.mutate()}
            disabled={pinMenuMutation.isPending}
          >
            {pinMenuMutation.isPending ? <Spinner /> : <Pin />}
          </Button>
        )}
        <DeleteMenu menu={menu} onSuccess={onMenuUpdate} />
      </CardFooter>
    </BaseCard>
  )
}

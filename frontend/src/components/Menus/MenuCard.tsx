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
    <BaseCard className="h-44 flex flex-col justify-between">
      <CardHeader className="p-3 pb-1 flex flex-col items-center">
        <Link
          to="/menus/$menuId"
          params={{ menuId: menu.id }}
          className="w-full text-center hover:text-primary transition-colors"
        >
          <CardTitle className="text-sm sm:text-base font-semibold text-center line-clamp-2">{menu.name}</CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="p-3 py-1 flex flex-col items-center gap-1">
        <Link to="/menus/$menuId" params={{ menuId: menu.id }} className="flex flex-col gap-1 items-center">
          <div className="text-xs text-muted-foreground">
            {new Date(menu.created_at || "").toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </div>
          <MenuCompletionBadge recipes={menu.recipes || []} />
        </Link>
      </CardContent>
      <CardFooter className="py-1.5 px-3 mt-auto bg-card border-t border-border/40 flex gap-2 justify-center">
        {!isFavorites && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Pin menu as current"
            onClick={() => pinMenuMutation.mutate()}
            disabled={pinMenuMutation.isPending}
            className="size-8"
          >
            {pinMenuMutation.isPending ? <Spinner className="size-3.5" /> : <Pin className="size-3.5" />}
          </Button>
        )}
        <DeleteMenu menu={menu} onSuccess={onMenuUpdate} />
      </CardFooter>
    </BaseCard>
  )
}

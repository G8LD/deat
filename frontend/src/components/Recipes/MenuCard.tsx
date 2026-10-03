import { useMutation } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Trash } from "lucide-react"
import { type MenuPublic, MenusService } from "@/client"
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"
import BaseCard from "./BaseCard"
import MenuCompletionBadge from "./MenuCompletionBadge"

interface MenuCardProps {
  menu: MenuPublic
  onMenuUpdate?: () => void
}

export default function MenuCard({ menu, onMenuUpdate }: MenuCardProps) {
  const { showErrorToast } = useCustomToast()

  const removeRecipeMutation = useMutation({
    mutationFn: async () =>
      await MenusService.deleteMenu({
        path: { id: menu.id },
      }),
    onSuccess: () => onMenuUpdate?.(),
    onError: handleError.bind(showErrorToast),
  })

  return (
    <BaseCard className={`py-2 aspect-square`}>
      <CardHeader className="flex flex-1">
        <Link
          to={`/menus/${menu.id}`}
          className="h-full w-full flex justify-center items-center"
        >
          <CardTitle className="text-xm lg:text-base text-center text-wrap">
            {menu.name}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col my-2">
        <Link
          to={`/menus/${menu.id}`}
          className="flex flex-col gap-1 justify-center items-center"
        >
          <div className="text-xs lg:text-sm text-gray-700">
            {new Date(menu.created_at).toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </div>
          <MenuCompletionBadge recipes={menu.recipes || []} />
        </Link>
      </CardContent>
      <CardFooter className="p-0 pb-2 mt-auto bg-card border-0 flex gap-0.5 justify-end mr-2">
        <Button
          className="hover:text-destructive hover:bg-destructive/10"
          variant="ghost"
          size="icon"
          onClick={() => removeRecipeMutation.mutate()}
          disabled={removeRecipeMutation.isPending}
        >
          {removeRecipeMutation.isPending ? <Spinner /> : <Trash />}
        </Button>
      </CardFooter>
    </BaseCard>
  )
}

"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MoreVertical } from "lucide-react"
import * as React from "react"
import { type MenuRecipeUpdate, MenusService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import useCustomToast from "@/hooks/useCustomToast"
import { useMenus } from "@/hooks/useMenus"
import { useRecipeMenus } from "@/hooks/useRecipeMenus"
import { FAVORITES_MENU_NAME } from "@/lib/constants"
import { handleError } from "@/utils"

type AddRecipeProps = {
  recipe_id: number
  disabled?: boolean
  onSuccess?: () => void
  variant?: "default" | "lg"
}

export default function AddRecipe({ recipe_id, disabled, onSuccess, variant = "default" }: AddRecipeProps) {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const { data: menus, isLoading: menusLoading } = useMenus()
  const { data: recipeMenus, isLoading: recipeMenusLoading } = useRecipeMenus(recipe_id)

  const isLoading = menusLoading || recipeMenusLoading

  const sortedMenus = React.useMemo(() => {
    return [...(menus?.data || [])].sort(
      (a, b) => Number(b.name === FAVORITES_MENU_NAME) - Number(a.name === FAVORITES_MENU_NAME),
    )
  }, [menus])

  const [localMenuIds, setLocalMenuIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (recipeMenus?.data) {
      setLocalMenuIds(recipeMenus.data.map((m) => m.id))
    }
  }, [recipeMenus?.data])

  const mutation = useMutation({
    mutationFn: async (body: MenuRecipeUpdate) => (await MenusService.updateRecipes({ body })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] })
      queryClient.invalidateQueries({ queryKey: ["recipe", recipe_id, "menus"] })
      onSuccess?.()
    },
    onError: (err) => {
      setLocalMenuIds((recipeMenus?.data || []).map((m) => m.id))
      handleError.bind(showErrorToast)(err)
    },
  })

  const handleToggleMenu = (menuId: string, checked: boolean) => {
    if (checked) {
      setLocalMenuIds((prev) => [...prev, menuId])
      mutation.mutate({
        add: { recipe_ids: [recipe_id], menu_ids: [menuId] },
      })
    } else {
      setLocalMenuIds((prev) => prev.filter((id) => id !== menuId))
      mutation.mutate({
        remove: { recipe_ids: [recipe_id], menu_ids: [menuId] },
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "default" ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Add to menus"
            disabled={disabled}
            className="size-8"
          >
            <MoreVertical className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" disabled={disabled} className="gap-1.5" aria-label="Add to menus">
            <MoreVertical className="size-4" />
            <span>Add to menus</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Add to menu</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="flex items-center justify-center py-3">
            <Spinner className="size-4" />
          </div>
        ) : sortedMenus.length === 0 ? (
          <div className="py-2 px-3 text-xs text-muted-foreground text-center">No menus found</div>
        ) : (
          sortedMenus.map((menu) => (
            <DropdownMenuCheckboxItem
              key={menu.id}
              checked={localMenuIds.includes(menu.id)}
              onCheckedChange={(checked) => handleToggleMenu(menu.id, checked)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="truncate">{menu.name}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

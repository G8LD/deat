"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Heart, Pin, Plus } from "lucide-react"
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
  recipe_id?: number
  recipe_ids?: number[]
  disabled?: boolean
  onSuccess?: () => void
  variant?: "default" | "lg"
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  children?: React.ReactNode
}

export default function AddRecipe({
  recipe_id,
  recipe_ids,
  disabled,
  onSuccess,
  variant = "default",
  buttonVariant = "ghost",
  children,
}: AddRecipeProps) {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const [open, setOpen] = React.useState(false)
  const { data: menus, isLoading: menusLoading } = useMenus()

  const isBulk = Boolean(recipe_ids && recipe_ids.length > 0)
  const targetRecipeIds = React.useMemo(() => {
    if (recipe_ids && recipe_ids.length > 0) return recipe_ids
    if (recipe_id !== undefined) return [recipe_id]
    return []
  }, [recipe_id, recipe_ids])

  const { data: recipeMenus, isLoading: recipeMenusLoading } = useRecipeMenus(
    recipe_id ?? 0,
    open && !isBulk && recipe_id !== undefined,
  )

  const isLoading = menusLoading || (!isBulk && recipeMenusLoading)

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

  // Reset local checked menus in bulk mode when dropdown closes
  React.useEffect(() => {
    if (!open && isBulk) {
      setLocalMenuIds([])
    }
  }, [open, isBulk])

  const mutation = useMutation({
    mutationFn: async (body: MenuRecipeUpdate) => (await MenusService.updateRecipes({ body })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] })
      if (recipe_id !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["recipe", recipe_id, "menus"] })
      }
      onSuccess?.()
    },
    onError: (err) => {
      if (!isBulk) {
        setLocalMenuIds((recipeMenus?.data || []).map((m) => m.id))
      }
      handleError.bind(showErrorToast)(err)
    },
  })

  const handleToggleMenu = (menuId: string, checked: boolean) => {
    if (checked) {
      setLocalMenuIds((prev) => [...prev, menuId])
      mutation.mutate({
        add: { recipe_ids: targetRecipeIds, menu_ids: [menuId] },
      })
    } else {
      setLocalMenuIds((prev) => prev.filter((id) => id !== menuId))
      mutation.mutate({
        remove: { recipe_ids: targetRecipeIds, menu_ids: [menuId] },
      })
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {children ? (
          children
        ) : variant === "default" ? (
          <Button variant={buttonVariant} size="icon" aria-label="Add to menu" disabled={disabled} className="size-8">
            <Plus className="size-4" />
          </Button>
        ) : (
          <Button variant={buttonVariant} disabled={disabled} className="gap-1.5" aria-label="Add to menu">
            <Plus className="size-4" />
            Add to menu
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Add to menu</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="flex items-center justify-center py-3">
            <Spinner className="size-4" />
          </div>
        ) : sortedMenus.length === 0 ? (
          <div className="py-2 px-3 text-xs text-muted-foreground text-center">No menus found</div>
        ) : (
          sortedMenus.map((menu) => {
            const isFav = menu.name === FAVORITES_MENU_NAME
            const isCurr = menu.current

            return (
              <DropdownMenuCheckboxItem
                key={menu.id}
                checked={localMenuIds.includes(menu.id)}
                onCheckedChange={(checked) => handleToggleMenu(menu.id, checked)}
                onSelect={(e) => e.preventDefault()}
                className="flex items-center gap-2 cursor-pointer"
              >
                {isFav && <Heart className="size-3.5 text-red-500 fill-red-500 shrink-0" />}
                {isCurr && !isFav && <Pin className="size-3.5 text-primary shrink-0" />}
                <span className="truncate flex-1">{menu.name}</span>
              </DropdownMenuCheckboxItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

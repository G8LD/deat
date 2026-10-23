"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import * as React from "react"
import { type MenuRecipeUpdate, MenusService } from "@/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
} from "@/components/ui/questionnaire"
import { useIsMobile } from "@/hooks/use-mobile"
import useCustomToast from "@/hooks/useCustomToast"
import { useMenus } from "@/hooks/useMenus"
import { useRecipeMenus } from "@/hooks/useRecipeMenus"
import { FAVORITES_MENU_NAME } from "@/lib/constants"
import { handleError } from "@/utils"
import { Spinner } from "../ui/spinner"

type AddRecipeProps = {
  recipe_id: number
  disabled?: boolean
  onSuccess?: () => void
  variant?: "default" | "lg"
}

export default function AddRecipe({ recipe_id, disabled, onSuccess, variant = "default" }: AddRecipeProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {variant === "default" ? (
            <Button variant="ghost" size="icon" disabled={disabled}>
              <Plus />
            </Button>
          ) : (
            <Button variant="outline" disabled={disabled}>
              <Plus /> Add to menus
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Add to menus</DrawerTitle>
          </DrawerHeader>
          <AddRecipeForm
            className="p-4"
            recipeId={recipe_id}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "default" ? (
          <Button variant="ghost" size="icon" disabled={disabled}>
            <Plus />
          </Button>
        ) : (
          <Button variant="outline" disabled={disabled}>
            <Plus /> Add to menus
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Add to menus</DialogTitle>
        </DialogHeader>
        <AddRecipeForm
          recipeId={recipe_id}
          onSuccess={() => {
            setOpen(false)
            onSuccess?.()
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

type MenuFormProps = {
  recipeId: number
  className?: string
  onSuccess?: () => void
  onCancel?: () => void
}

function AddRecipeForm({ recipeId, className, onSuccess, onCancel }: MenuFormProps) {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const { data: menus, isFetching: menusLoading } = useMenus()
  const { data: recipeMenus, isFetching: recipeMenusLoading } = useRecipeMenus(recipeId)

  const isLoading = menusLoading || recipeMenusLoading

  const { items, sortedMenus } = React.useMemo(() => {
    return {
      items: [
        {
          choices: (menus?.data || []).map((menu) => {
            return { value: menu.id }
          }),
          name: "menus",
        },
      ],
      sortedMenus: [...(menus?.data || [])].sort(
        (a, b) => Number(b.name === FAVORITES_MENU_NAME) - Number(a.name === FAVORITES_MENU_NAME),
      ),
    }
  }, [menus])

  const { recipeMenuIds } = React.useMemo(
    () => ({
      recipeMenuIds: [...(recipeMenus?.data || [])].map((menu) => menu.id),
    }),
    [recipeMenus],
  )

  const mutation = useMutation({
    mutationFn: async (body: MenuRecipeUpdate) => (await MenusService.updateRecipes({ body })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["menus", "depth", 2],
      })
      queryClient.invalidateQueries({
        queryKey: ["recipe", recipeId, "menus"],
        refetchType: "none",
      })
      onSuccess?.()
    },
    onError: handleError.bind(showErrorToast),
  })

  function handleSubmit(form: HTMLFormElement) {
    const formData = new FormData(form)
    const addedMenuIds = formData.getAll("menus") as string[]
    const newMenuIds = addedMenuIds.filter((id) => !recipeMenuIds.includes(id))
    const removedMenuIds = recipeMenuIds.filter((menu_id) => !addedMenuIds.includes(menu_id))

    if (newMenuIds.length === 0 && removedMenuIds.length === 0) {
      onSuccess?.()
      return
    }

    mutation.mutate({
      add: {
        recipe_ids: [recipeId],
        menu_ids: newMenuIds,
      },
      remove: {
        recipe_ids: [recipeId],
        menu_ids: removedMenuIds,
      },
    })
  }

  return (
    <Questionnaire
      className={className}
      defaultItem="menus"
      items={items}
      onSubmit={(event) => handleSubmit(event.currentTarget)}
    >
      {isLoading ? (
        <Spinner className="w-full h-7" />
      ) : (
        <QuestionnaireItem id="menus" name="menus" multiple className="px-2 max-h-80 overflow-auto">
          <QuestionnaireChoices>
            {sortedMenus.map((menu) => (
              <QuestionnaireChoice
                key={menu.id}
                value={menu.id}
                className="wrap-break-word overflow-hidden"
                defaultChecked={recipeMenuIds.includes(menu.id)}
              >
                {menu.name}
              </QuestionnaireChoice>
            ))}
          </QuestionnaireChoices>
        </QuestionnaireItem>
      )}
      <QuestionnaireActions className="flex">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={isLoading || mutation.isPending}
          onClick={(e) => handleSubmit(e.currentTarget.form!)}
        >
          {mutation.isPending ? <Spinner /> : <>Save</>}
        </Button>
      </QuestionnaireActions>
    </Questionnaire>
  )
}

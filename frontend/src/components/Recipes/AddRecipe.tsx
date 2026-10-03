"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import * as React from "react"
import { MenusService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireSubmit,
} from "@/components/ui/questionnaire"
import { useIsMobile } from "@/hooks/use-mobile"
import useCustomToast from "@/hooks/useCustomToast"
import useRecipes from "@/hooks/useRecipes"
import { handleError } from "@/utils"

type AddRecipeProps = {
  recipe_id: number
  disabled?: boolean
  onSuccess?: () => void
}

export default function AddRecipe({
  recipe_id,
  disabled,
  onSuccess,
}: AddRecipeProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" disabled={disabled}>
            <Plus />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Add to menu</DrawerTitle>
          </DrawerHeader>
          <AddRecipeForm
            className="p-4"
            recipe_id={recipe_id}
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
        <Button variant="ghost" size="icon" disabled={disabled}>
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Add to menu</DialogTitle>
        </DialogHeader>
        <AddRecipeForm
          recipe_id={recipe_id}
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
  recipe_id: number
  className?: string
  onSuccess?: () => void
  onCancel?: () => void
}

function AddRecipeForm({
  recipe_id,
  className,
  onSuccess,
  onCancel,
}: MenuFormProps) {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const { menus } = useRecipes()
  const { items, sortedMenus } = React.useMemo(() => {
    return {
      items: [
        {
          choices: (menus?.data || []).map((menu) => {
            return { value: menu.id }
          }),
          name: "menus",
          required: true,
        },
      ],
      sortedMenus: [...(menus?.data || [])].sort(
        (a, b) =>
          Number(b.name === "Favorites") - Number(a.name === "Favorites"),
      ),
    }
  }, [menus])

  const mutation = useMutation({
    mutationFn: async (query: {
      recipe_id: Array<number>
      menu_id: Array<string>
    }) => (await MenusService.addRecipes({ query: query })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus", "public"] })
      onSuccess?.()
    },
    onError: handleError.bind(showErrorToast),
  })
  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    mutation.mutate({
      recipe_id: [recipe_id],
      menu_id: formData.getAll("menus") as string[],
    })
  }

  return (
    <Questionnaire
      className={className}
      defaultItem="direction"
      items={items}
      onSubmit={handleSubmit}
    >
      <QuestionnaireItem
        name="menus"
        multiple
        className="px-2 max-h-80 overflow-auto"
      >
        <QuestionnaireChoices>
          {sortedMenus.map((menu) => (
            <QuestionnaireChoice key={menu.id} value={menu.id}>
              {menu.name}
            </QuestionnaireChoice>
          ))}
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireActions className="flex">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <QuestionnaireSubmit className="flex-1">Add</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  )
}

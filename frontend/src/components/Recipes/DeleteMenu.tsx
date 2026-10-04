"use client"

import { useMutation } from "@tanstack/react-query"
import { Trash } from "lucide-react"
import * as React from "react"
import { type MenuPublic, MenusService } from "@/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

type DeleteMenuProps = {
  menu: MenuPublic
  onSuccess?: () => void
}

export default function DeleteMenu({ menu, onSuccess }: DeleteMenuProps) {
  const [open, setOpen] = React.useState(false)

  const { showErrorToast } = useCustomToast()

  const deleteMenuMutation = useMutation({
    mutationFn: async () =>
      await MenusService.deleteMenu({
        path: { id: menu.id },
      }),
    onSuccess: () => onSuccess?.(),
    onError: handleError.bind(showErrorToast),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="hover:text-destructive hover:bg-destructive/10" variant="ghost" size="icon">
          <Trash />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Are you sure you want to delete {menu.name} ?</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            onClick={() => deleteMenuMutation.mutate()}
            disabled={deleteMenuMutation.isPending}
          >
            {deleteMenuMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

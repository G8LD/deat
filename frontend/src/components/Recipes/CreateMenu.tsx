"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import * as React from "react"
import { type MenuCreate, MenusService } from "@/client"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Checkbox } from "../ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "../ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

type CreateMenuProps = {
  onSuccess?: () => void
}

export default function CreateMenu({ onSuccess }: CreateMenuProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button size="sm">
            <Plus />
            New
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>New menu</DrawerTitle>
          </DrawerHeader>
          <MenuForm
            className="p-4"
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
        <Button size="sm">
          <Plus />
          New
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New menu</DialogTitle>
        </DialogHeader>
        <MenuForm
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
  className?: string
  onSuccess?: () => void
  onCancel?: () => void
}

function MenuForm({ className, onSuccess, onCancel }: MenuFormProps) {
  const queryClient = useQueryClient()

  const nbRecipes = Array.from({ length: 11 }, (_, i) => ({
    label: String(i),
    value: String(i),
  }))

  const mutation = useMutation({
    mutationFn: async (body: MenuCreate) =>
      (await MenusService.createMenu({ body })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] })
      onSuccess?.()
    },
  })

  function handleSubmit(e) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)

    mutation.mutate({
      name: formData.get("name") as string,
      current: formData.get("current") === "on",
    })
  }

  return (
    <form
      className={cn("grid items-start gap-6", className)}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Menu's name</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            required
            minLength={1}
            maxLength={50}
          />
        </Field>
        <Field orientation="horizontal">
          <Select items={nbRecipes} defaultValue="0" name="recipes">
            <SelectTrigger id="recipes" className="min-w-14">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {nbRecipes.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldLabel htmlFor="recipes">
            Number of recipes to suggest
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="current" name="current" />
          <Label htmlFor="current">
            Set as current menu to pin recipes page
          </Label>
        </Field>
        <Field orientation="horizontal">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create"}
          </Button>
        </Field>
        {mutation.isError && (
          <p className="text-sm text-destructive">Something went wrong.</p>
        )}
      </FieldGroup>
    </form>
  )
}

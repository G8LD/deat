import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import * as React from "react"
import { type MenuPublic, MenusService } from "@/client"
import { Title } from "@/components/Title"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface RenameMenuProps {
  menu: MenuPublic
  onSuccess?: () => void
}

/**
 * Inline, click-to-edit menu title. Click the title (or the pencil) to switch
 * to an input. Enter or blur saves via updateMenu; Escape cancels.
 */
export default function RenameMenu({ menu, onSuccess }: RenameMenuProps) {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(menu.name)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Keep local value in sync if the menu name changes upstream.
  React.useEffect(() => {
    setValue(menu.name)
  }, [menu.name])

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const renameMutation = useMutation({
    mutationFn: async (name: string) =>
      await MenusService.updateMenu({
        body: { name },
        path: { id: menu.id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", menu.id] })
      queryClient.invalidateQueries({ queryKey: ["menus"] })
      onSuccess?.()
    },
    onError: handleError.bind(showErrorToast),
  })

  function commit() {
    const next = value.trim()
    setEditing(false)
    if (!next || next === menu.name) {
      setValue(menu.name)
      return
    }
    renameMutation.mutate(next)
  }

  function cancel() {
    setValue(menu.name)
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") cancel()
        }}
        maxLength={50}
        aria-label="Menu name"
        className="h-auto max-w-full text-5xl font-bold"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/rename flex items-center gap-2 text-left"
      aria-label={`Rename menu ${menu.name}`}
    >
      <Title className="animate-fade-in-up">{menu.name}</Title>
      <Pencil className="size-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/rename:opacity-100" />
    </button>
  )
}

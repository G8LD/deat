"use client"

import { Trash, X } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import AddRecipe from "./AddRecipe"

interface BulkActionBarProps {
  selectedIds: Set<number>
  totalCount: number
  onSelectAll: () => void
  onClear: () => void
  onRemove?: () => void
  isRemoving?: boolean
}

export function BulkActionBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onClear,
  onRemove,
  isRemoving = false,
}: BulkActionBarProps) {
  const count = selectedIds.size

  // Listen for Escape key to cancel selection
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClear()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClear])

  if (count === 0) return null

  const isAllSelected = count === totalCount

  return (
    <section
      aria-label="Bulk actions toolbar"
      className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full border bg-card/95 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-4 transition-all duration-200"
    >
      <div className="flex items-center gap-2 border-r border-border pr-2 sm:pr-3">
        <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
          {count} <span className="hidden xs:inline">selected</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
          onClick={isAllSelected ? onClear : onSelectAll}
        >
          {isAllSelected ? "Deselect" : "Select all"}
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <AddRecipe recipe_ids={Array.from(selectedIds)} variant="lg" />
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isRemoving}
            onClick={onRemove}
          >
            {isRemoving ? <Spinner className="size-4" /> : <Trash className="size-4" />}
            <span>Remove</span>
          </Button>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="size-7 rounded-full text-muted-foreground hover:text-foreground shrink-0"
        onClick={onClear}
        aria-label="Cancel selection"
      >
        <X className="size-4" />
      </Button>
    </section>
  )
}

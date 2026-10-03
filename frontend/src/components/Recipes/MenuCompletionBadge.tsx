import { Check } from "lucide-react"
import type { MenuRecipePublic } from "@/client"
import { Badge } from "../ui/badge"

interface MenuCompletionBadgeProps {
  recipes: Array<MenuRecipePublic>
}

export default function MenuCompletionBadge({
  recipes,
}: MenuCompletionBadgeProps) {
  return (
    <Badge>
      <Check data-icon="inline-start" />
      Done {recipes?.filter((recipe) => recipe.done).length}/{recipes?.length}
    </Badge>
  )
}

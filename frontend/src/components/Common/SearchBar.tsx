import { Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SearchBar() {
  return (
    <Field orientation="horizontal" className="h-12 gap-1.5 items-stretch">
      <Input
        type="search"
        placeholder="Search for a recipe"
        className="h-full"
      />
      <Button className="h-full aspect-square">
        <Search />
      </Button>
      <Button className="h-full aspect-square">
        <SlidersHorizontal />
      </Button>
    </Field>
  )
}

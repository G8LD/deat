import { Search } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "../ui/spinner"

interface SearchBarProps {
  initialValue?: string
  onSearch: (query: string) => void
  loading: boolean
}

export function SearchBar({
  initialValue = "",
  onSearch,
  loading,
}: SearchBarProps) {
  const [search, setSearch] = useState(initialValue)
  const [previous, setPrevious] = useState(initialValue.trim().toLowerCase())

  const normalized = search.trim().toLowerCase()
  const canSearch = !loading && normalized !== "" && normalized !== previous

  function submit() {
    if (!canSearch) return
    setPrevious(normalized)
    onSearch(search.trim())
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Field orientation="horizontal" className="h-12 gap-1 items-stretch">
        <Input
          type="search"
          placeholder="Search for a recipe"
          className="h-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          type="submit"
          aria-label="Search"
          className="h-full aspect-square"
          disabled={!canSearch}
        >
          {loading ? <Spinner /> : <Search />}
        </Button>
        {/* <Button
          type="button"
          aria-label="Filters"
          className="h-full aspect-square"
          disabled={loading}
        >
          <SlidersHorizontal />
        </Button> */}
      </Field>
    </form>
  )
}

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { z } from "zod"
import { type Recipe, RecipesService } from "@/client"
import { SearchBar } from "@/components/Common/SearchBar"
import { BulkActionBar } from "@/components/Recipes/BulkActionBar"
import { RecipesList } from "@/components/Recipes/RecipesList"
import { Title } from "@/components/Title"
import { Spinner } from "@/components/ui/spinner"

const searchSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute("/_layout/")({
  component: Home,
  validateSearch: searchSchema,
})

function Home() {
  const { q = "" } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const observerRef = useRef<HTMLDivElement>(null)

  const hasQuery = q.trim().length > 0

  const {
    data: recipesData,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["search", q],
    queryFn: async ({ pageParam = 0 }) =>
      (await RecipesService.searchRecipes({ query: { q, offset: pageParam } })).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined
      const nextOffset = (lastPage.offset ?? 0) + (lastPage.number ?? 20)
      return nextOffset < (lastPage.totalResults ?? 0) ? nextOffset : undefined
    },
    enabled: hasQuery,
  })

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return
    const el = observerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      { rootMargin: "300px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const recipes = useMemo(() => {
    if (!recipesData) return []
    const seen = new Set<number>()
    const list: Recipe[] = []
    for (const page of recipesData.pages) {
      for (const recipe of page?.results || []) {
        if (!seen.has(recipe.id)) {
          seen.add(recipe.id)
          list.push(recipe)
        }
      }
    }
    return list
  }, [recipesData])

  const totalResults = recipesData?.pages[0]?.totalResults

  const { data: suggestions } = useQuery({
    queryKey: ["suggestions"],
    queryFn: async () => (await RecipesService.suggestions({ query: { number: 12 } })).data,
    enabled: !hasQuery,
    staleTime: 60 * 60 * 1000,
  })

  // Multi-select state for daily suggestions
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())

  // Multi-select state for search results
  const [selectedSearch, setSelectedSearch] = useState<Set<number>>(new Set())

  // Clear selections when switching between search and suggestions or changing query
  useEffect(() => {
    setSelectedSuggestions(new Set())
    setSelectedSearch(new Set())
  }, [])

  const toggleSuggestion = (recipeId: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev)
      next.has(recipeId) ? next.delete(recipeId) : next.add(recipeId)
      return next
    })
  }

  const selectAllSuggestions = () => {
    if (suggestions) {
      setSelectedSuggestions(new Set(suggestions.map((r) => r.id)))
    }
  }

  const clearSuggestionsSelection = () => {
    setSelectedSuggestions(new Set())
  }

  const toggleSearch = (recipeId: number) => {
    setSelectedSearch((prev) => {
      const next = new Set(prev)
      next.has(recipeId) ? next.delete(recipeId) : next.add(recipeId)
      return next
    })
  }

  const selectAllSearch = () => {
    setSelectedSearch(new Set(recipes.map((r) => r.id)))
  }

  const clearSearchSelection = () => {
    setSelectedSearch(new Set())
  }

  function handleSearch(query: string) {
    navigate({ search: { q: query || "" } })
  }

  return (
    <div>
      <Title className="animate-fade-in-up">Deat</Title>
      <div className="flex flex-col gap-4">
        <SearchBar onSearch={handleSearch} loading={isFetching && !isFetchingNextPage} initialValue={q} />
        {hasQuery ? (
          isError ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {(error as any)?.response?.data?.detail || "Daily recipe quota reached. Please try again later."}
            </div>
          ) : (
            <>
              {totalResults !== undefined && <div className="text-sm text-center">Total results {totalResults}</div>}
              <RecipesList
                key={q}
                recipes={recipes}
                selectable
                selectedIds={selectedSearch}
                selectionMode={selectedSearch.size > 0}
                onToggleSelect={toggleSearch}
              />
              {hasNextPage && (
                <div ref={observerRef} className="flex justify-center p-4">
                  {isFetchingNextPage && <Spinner />}
                </div>
              )}
              <BulkActionBar
                selectedIds={selectedSearch}
                totalCount={recipes.length}
                onSelectAll={selectAllSearch}
                onClear={clearSearchSelection}
              />
            </>
          )
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Title variant="subPage" className="text-center">
              Daily suggestions
            </Title>
            <RecipesList
              recipes={suggestions || []}
              fixedColumns
              selectable
              selectedIds={selectedSuggestions}
              selectionMode={selectedSuggestions.size > 0}
              onToggleSelect={toggleSuggestion}
            />
            <BulkActionBar
              selectedIds={selectedSuggestions}
              totalCount={suggestions?.length || 0}
              onSelectAll={selectAllSuggestions}
              onClear={clearSuggestionsSelection}
            />
          </div>
        )}
      </div>
    </div>
  )
}

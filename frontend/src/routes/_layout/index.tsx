import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { RecipesService } from "@/client"
import { SearchBar } from "@/components/Common/SearchBar"
import { RecipesList } from "@/components/Recipes/RecipesList"
import { Title } from "@/components/Title"

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

  const { data: recipes, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: async () =>
      (await RecipesService.searchRecipes({ query: { q } })).data,
    enabled: q.trim().length > 0,
    placeholderData: (previous) => previous, // garde les anciens résultats pendant le chargement
  })

  function handleSearch(query: string) {
    navigate({ search: { q: query || "" } })
  }
  return (
    <div>
      <Title>Deat</Title>
      <div className="flex flex-col gap-4">
        <SearchBar
          onSearch={handleSearch}
          loading={isFetching}
          initialValue={q}
        />
        {recipes && (
          <div className="text-gray-700 text-sm text-center">
            Total results {recipes?.totalResults}
          </div>
        )}
        <RecipesList recipes={recipes?.results || []} />
      </div>
    </div>
  )
}
